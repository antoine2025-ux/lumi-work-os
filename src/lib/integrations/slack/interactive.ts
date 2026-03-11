/**
 * Slack Interactive Bridge
 *
 * Bridges Slack webhook events (app_mention, DM) to the Loopbrain orchestrator.
 * Handles:
 * 1. Workspace resolution from Slack team ID
 * 2. User resolution (Slack user → Loopwell user via email match)
 * 3. Message parsing (strip bot mention prefix)
 * 4. Orchestrator dispatch
 * 5. Response posting back to Slack thread
 * 6. ACTION intent handling (auto-execute single-step, confirm multi-step)
 */

import { prisma, prismaUnscoped } from '@/lib/db'
import { sendSlackMessage, getSlackUserEmail, getSlackIntegration } from '@/lib/integrations/slack-service'
import { executeAgentPlan } from '@/lib/loopbrain/agent/executor'
import { toolRegistry } from '@/lib/loopbrain/agent/tool-registry'
import type { AgentPlan } from '@/lib/loopbrain/agent/types'
import { enrichAgentContext } from '@/lib/loopbrain/permissions'
import { getMemberRole } from '@/lib/loopbrain/context/getMemberRole'
import { logger } from '@/lib/logger'
import { IntegrationType, Prisma } from '@prisma/client'

// =============================================================================
// Types
// =============================================================================

export interface SlackLoopbrainMessageParams {
  slackUserId: string
  slackTeamId: string
  channelId: string
  text: string
  threadTs?: string
  messageTs: string
  isDM: boolean
}

interface ResolvedUser {
  userId: string
  workspaceId: string
}

// =============================================================================
// User Resolution Cache (in-memory, per-process)
// =============================================================================

const USER_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const userCache = new Map<string, { resolved: ResolvedUser; expiresAt: number }>()

function getCachedUser(slackUserId: string, slackTeamId: string): ResolvedUser | null {
  const key = `${slackTeamId}:${slackUserId}`
  const entry = userCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    userCache.delete(key)
    return null
  }
  return entry.resolved
}

function cacheUser(slackUserId: string, slackTeamId: string, resolved: ResolvedUser): void {
  const key = `${slackTeamId}:${slackUserId}`
  userCache.set(key, { resolved, expiresAt: Date.now() + USER_CACHE_TTL_MS })
}

// =============================================================================
// Event Deduplication
// =============================================================================

const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const processedEvents = new Map<string, number>()

function isDuplicate(messageTs: string): boolean {
  const now = Date.now()
  // Clean old entries
  for (const [key, ts] of processedEvents) {
    if (now - ts > DEDUP_WINDOW_MS) processedEvents.delete(key)
  }
  if (processedEvents.has(messageTs)) return true
  processedEvents.set(messageTs, now)
  return false
}

// =============================================================================
// Main Handler
// =============================================================================

export async function handleSlackLoopbrainMessage(
  params: SlackLoopbrainMessageParams
): Promise<void> {
  const { slackUserId, slackTeamId, channelId, text, threadTs, messageTs, isDM } = params

  if (isDuplicate(messageTs)) {
    logger.debug('[SlackInteractive] Skipping duplicate event', { messageTs })
    return
  }

  if (!text || text.trim().length === 0) return

  try {
    // 1. Resolve workspace
    const workspaceId = await resolveWorkspace(slackTeamId)
    if (!workspaceId) {
      logger.warn('[SlackInteractive] No workspace found for team', { slackTeamId })
      return
    }

    // 2. Resolve user
    const resolved = await resolveUser(slackUserId, slackTeamId, workspaceId)
    if (!resolved) {
      await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: "I couldn't match your Slack account to a Loopwell member. Make sure your Slack email matches your Loopwell account.",
        threadTs: threadTs ?? messageTs,
      })
      return
    }

    // 3. Parse message text — strip bot mention prefix
    const cleanedText = stripBotMention(text, workspaceId)
    if (!cleanedText.trim()) {
      await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: "Hi! Ask me anything about your workspace, or tell me to do something like \"create a task for Sarah to review the design doc by Friday.\"",
        threadTs: threadTs ?? messageTs,
      })
      return
    }

    // 4. Slack → Loopbrain integration is temporarily disabled
    // TODO: Migrate to agent loop (runAgentLoop) when Slack integration is re-enabled
    // The orchestrator was deleted March 11, 2026 — this needs to be updated to use the agent loop
    await sendSlackMessage(workspaceId, {
      channel: channelId,
      text: "Slack integration is temporarily unavailable. Please use the Loopwell web app to ask Loopbrain questions.",
      threadTs: threadTs ?? messageTs,
    })
    logger.warn('[SlackInteractive] Slack integration disabled — orchestrator deleted', {
      workspaceId: resolved.workspaceId,
      userId: resolved.userId,
    })
  } catch (error: unknown) {
    logger.error('[SlackInteractive] Processing failed', {
      slackUserId,
      messageTs,
      error: error instanceof Error ? error.message : String(error),
    })

    // Try to send error message
    try {
      const workspaceId = await resolveWorkspace(slackTeamId)
      if (workspaceId) {
        await sendSlackMessage(workspaceId, {
          channel: channelId,
          text: "Something went wrong processing your request. Try again or use the Loopwell app.",
          threadTs: threadTs ?? messageTs,
        })
      }
    } catch {
      // Best effort
    }
  }
}

// =============================================================================
// Workspace Resolution
// =============================================================================

async function resolveWorkspace(slackTeamId: string): Promise<string | null> {
  try {
    const integration = await prismaUnscoped.integration.findFirst({
      where: {
        type: IntegrationType.SLACK,
        isActive: true,
      },
      select: { workspaceId: true, config: true },
    })

    if (!integration) return null

    // Verify team ID matches
    const config = integration.config as unknown as Record<string, unknown>
    if (config.teamId && config.teamId !== slackTeamId) {
      // Try to find the right workspace
      const integrations = await prismaUnscoped.integration.findMany({
        where: { type: IntegrationType.SLACK, isActive: true },
        select: { workspaceId: true, config: true },
      })
      for (const int of integrations) {
        const intConfig = int.config as unknown as Record<string, unknown>
        if (intConfig.teamId === slackTeamId) return int.workspaceId
      }
      return null
    }

    return integration.workspaceId
  } catch (error: unknown) {
    logger.error('[SlackInteractive] Workspace resolution failed', {
      slackTeamId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// =============================================================================
// User Resolution
// =============================================================================

async function resolveUser(
  slackUserId: string,
  slackTeamId: string,
  workspaceId: string
): Promise<ResolvedUser | null> {
  // Check cache first
  const cached = getCachedUser(slackUserId, slackTeamId)
  if (cached) return cached

  try {
    // Get Slack user's email
    const email = await getSlackUserEmail(workspaceId, slackUserId)
    if (!email) {
      logger.warn('[SlackInteractive] Could not get email for Slack user', {
        slackUserId,
        workspaceId,
      })
      return null
    }

    // Find Loopwell user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    })
    if (!user) {
      logger.warn('[SlackInteractive] No Loopwell user matches Slack email', {
        slackUserId,
        email,
      })
      return null
    }

    // Verify workspace membership
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
      select: { id: true },
    })
    if (!member) {
      logger.warn('[SlackInteractive] User not a member of workspace', {
        userId: user.id,
        workspaceId,
      })
      return null
    }

    const resolved: ResolvedUser = { userId: user.id, workspaceId }
    cacheUser(slackUserId, slackTeamId, resolved)
    return resolved
  } catch (error: unknown) {
    logger.error('[SlackInteractive] User resolution failed', {
      slackUserId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

// =============================================================================
// Message Parsing
// =============================================================================

const botUserIdCache: Map<string, string> = new Map()

function stripBotMention(text: string, workspaceId: string): string {
  // Slack mentions look like <@U12345> — strip them
  let cleaned = text.replace(/<@[A-Z0-9]+>/g, '').trim()

  // Also try to strip cached bot user ID mention specifically
  const cachedBotId = botUserIdCache.get(workspaceId)
  if (cachedBotId) {
    cleaned = cleaned.replace(new RegExp(`<@${cachedBotId}>`, 'g'), '').trim()
  }

  return cleaned
}

/**
 * Pre-cache the bot user ID for a workspace (called during webhook setup).
 */
export async function cacheBotUserId(workspaceId: string): Promise<void> {
  try {
    const integration = await getSlackIntegration(workspaceId)
    if (integration) {
      const config = integration.config as unknown as Record<string, unknown>
      const botUserId = config.botUserId as string | undefined
      if (botUserId) {
        botUserIdCache.set(workspaceId, botUserId)
      }
    }
  } catch {
    // Best effort
  }
}

// =============================================================================
// Pending Plan Handling (ACTION intents)
// =============================================================================

async function handlePendingPlan(
  workspaceId: string,
  userId: string,
  channelId: string,
  threadTs: string,
  plan: AgentPlan,
  answer: string
): Promise<void> {
  const isSingleStep = plan.steps.length === 1

  if (isSingleStep) {
    // Auto-execute single-step plans
    try {
      const slackRole = await getMemberRole(workspaceId, userId)
      const slackCtx = await enrichAgentContext(workspaceId, userId, slackRole)
      const result = await executeAgentPlan(
        plan,
        slackCtx,
        toolRegistry
      )

      const hasFailed = !!result.failed
      const resultMessages = result.results.map((r) => r.humanReadable).filter(Boolean).join('\n')
      const successText = !hasFailed
        ? `Done! ${answer}\n\n${resultMessages}`
        : `I tried but something went wrong: ${result.failed?.error ?? 'Unknown error'}`

      await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: successText.slice(0, 3000),
        threadTs,
      })
    } catch (err: unknown) {
      await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: `I understood what you wanted but ran into an error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        threadTs,
      })
    }
    return
  }

  // Multi-step plans: post summary with Approve/Cancel buttons
  const stepList = plan.steps
    .map((s, i) => `${i + 1}. ${s.description}`)
    .join('\n')

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Plan:* ${plan.reasoning}\n\n${stepList}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Approve', emoji: true },
          style: 'primary',
          action_id: 'loopbrain_plan_approve',
          value: 'approve',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Cancel', emoji: true },
          action_id: 'loopbrain_plan_cancel',
          value: 'cancel',
        },
      ],
    },
  ]

  const result = await sendSlackMessage(workspaceId, {
    channel: channelId,
    text: `Plan: ${plan.reasoning}`,
    blocks,
    threadTs,
  })

  // Store pending action for button callback
  if (result.ok && result.ts) {
    try {
      await prisma.loopbrainPendingAction.create({
        data: {
          workspaceId,
          type: 'loopbrain_plan_approval',
          contextType: 'AgentPlan',
          contextId: `plan-${result.ts}`,
          contextData: JSON.parse(JSON.stringify({ plan, answer })) as Prisma.InputJsonValue,
          slackChannelId: channelId,
          slackMessageTs: result.ts,
          slackUserId: userId,
          createdBy: userId,
          assignedTo: userId,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
          status: 'AWAITING_RESPONSE',
        },
      })
    } catch (err: unknown) {
      logger.warn('[SlackInteractive] Failed to store pending action', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}

// =============================================================================
// Formatting
// =============================================================================

function formatForSlack(markdown: string): string {
  let text = markdown

  // Convert markdown bold **text** to Slack bold *text*
  text = text.replace(/\*\*([^*]+)\*\*/g, '*$1*')

  // Convert markdown links [text](url) to Slack links <url|text>
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>')

  // Convert markdown code blocks ```lang\ncode\n``` to Slack code blocks
  text = text.replace(/```\w*\n([\s\S]*?)```/g, '```$1```')

  // Truncate to Slack's limit
  if (text.length > 3000) {
    text = text.slice(0, 2950) + '\n\n_...truncated. View full response in Loopwell._'
  }

  return text
}

function buildResponseBlocks(
  text: string,
  suggestions?: Array<{ label: string; action: string; payload?: Record<string, unknown> }>
): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text },
    },
  ]

  if (suggestions && suggestions.length > 0) {
    const buttons = suggestions.slice(0, 3).map((s) => ({
      type: 'button',
      text: { type: 'plain_text', text: s.label, emoji: true },
      action_id: `suggestion_${s.action}`,
      value: s.action,
    }))

    blocks.push({
      type: 'actions',
      elements: buttons,
    })
  }

  return blocks
}
