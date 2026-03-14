/**
 * Slack Interactive Bridge
 *
 * Bridges Slack webhook events (app_mention, DM) to the Loopbrain agent loop.
 * Handles:
 * 1. Workspace resolution from Slack team ID
 * 2. User resolution (Slack user → Loopwell user via email match)
 * 3. Message parsing (strip bot mention prefix)
 * 4. Agent loop dispatch
 * 5. Response posting back to Slack thread
 * 6. Write-tool confirmation via Approve/Cancel buttons
 */

import { prisma, prismaUnscoped } from '@/lib/db'
import { sendSlackMessage, updateSlackMessage, getSlackUserEmail, getSlackIntegration } from '@/lib/integrations/slack-service'
import { runAgentLoop } from '@/lib/loopbrain/agent-loop'
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
// Quick Response (Fast-Path for Simple Conversational Messages)
// =============================================================================

/**
 * Pattern-match simple conversational messages and return instant responses.
 * Returns null for non-trivial messages that should go through the agent loop.
 */
function getQuickResponse(message: string): string | null {
  const lower = message.toLowerCase().trim()
  
  // Greetings
  if (/^(hi|hey|hello|good (morning|afternoon|evening|day)|howdy|yo|sup|what'?s up)(\s|!|,|\.|\?)*(\w+)?$/i.test(lower)) {
    return "Hey! 👋 What can I help you with?"
  }
  
  // Thanks
  if (/^(thanks|thank you|thx|cheers|appreciate it|ty)(\s|!|\.)*$/i.test(lower)) {
    return "You're welcome! Let me know if you need anything else."
  }
  
  // What can you do
  if (/^(what can you (do|help with)|help|what do you do|capabilities)\??$/i.test(lower)) {
    return "I can help with:\n• 📋 Projects & tasks — create, update, check status\n• 👥 People & capacity — who's available, workload\n• 📧 Email — check inbox, draft replies\n• 📅 Calendar — check schedule, find conflicts\n• 📄 Wiki — search, create, summarize docs\n• 📊 Health & insights — project health, org issues\n\nJust ask me anything!"
  }
  
  // Simple acknowledgments
  if (/^(ok|okay|got it|understood|sure|cool|nice|great|perfect|awesome)(\s|!|\.)*$/i.test(lower)) {
    return "👍 Let me know if you need anything!"
  }
  
  return null  // Not a simple message — proceed to agent loop
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

  // Hoisted so the catch block can update the thinking message without re-resolving workspace
  let thinkingMsg: { ok: boolean; ts?: string } | undefined
  let resolvedWorkspaceId: string | undefined

  try {
    // 1. Resolve workspace
    const workspaceId = await resolveWorkspace(slackTeamId)
    if (!workspaceId) {
      logger.warn('[SlackInteractive] No workspace found for team', { slackTeamId })
      return
    }
    resolvedWorkspaceId = workspaceId

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

    // Fast-path for simple conversational messages — skip agent loop entirely
    const quickResponse = getQuickResponse(cleanedText)
    if (quickResponse) {
      await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: quickResponse,
        threadTs: threadTs ?? messageTs,
      })
      return
    }

    // 4. Build agent loop context
    const userId = resolved.userId
    const replyThreadTs = threadTs ?? messageTs

    const [user, workspace] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, timezone: true },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      }),
    ])

    const memberRole = await getMemberRole(workspaceId, userId)
    const conversationId = `slack-${channelId}-${replyThreadTs}`

    // 5. Post instant "thinking" acknowledgment — user sees feedback immediately
    thinkingMsg = await sendSlackMessage(workspaceId, {
      channel: channelId,
      text: '🧠 Thinking...',
      threadTs: replyThreadTs,
    }).catch((err) => {
      logger.warn('[SlackInteractive] Failed to post thinking message', {
        error: err instanceof Error ? err.message : String(err),
      })
      return { ok: false as const }
    })

    // 6. Call agent loop
    logger.info('[SlackInteractive] Dispatching to agent loop', {
      workspaceId,
      userId,
      conversationId,
      messageLength: cleanedText.length,
    })

    const result = await runAgentLoop({
      workspaceId,
      userId,
      conversationId,
      userMessage: cleanedText,
      userRole: memberRole,
      userContext: {
        name: user?.name ?? 'Unknown',
        email: user?.email ?? '',
        timezone: user?.timezone ?? 'UTC',
        workspaceName: workspace?.name ?? 'Workspace',
      },
    })

    // 7. Handle result — update or replace the thinking message
    const userContext = {
      name: user?.name ?? 'Unknown',
      email: user?.email ?? '',
      timezone: user?.timezone ?? 'UTC',
      workspaceName: workspace?.name ?? 'Workspace',
    }

    if (result.pendingPlan) {
      // Write action needs user confirmation — update thinking msg with plan + Approve/Cancel buttons
      await postPlanConfirmation({
        workspaceId,
        userId,
        channelId,
        threadTs: replyThreadTs,
        responseText: result.response,
        conversationId,
        memberRole,
        userContext,
        thinkingMsgTs: thinkingMsg?.ts,
      })
    } else {
      // Read-only response — update thinking message in-place
      const formattedResponse = formatForSlack(result.response)
      if (thinkingMsg?.ts) {
        const updated = await updateSlackMessage(workspaceId, {
          channel: channelId,
          ts: thinkingMsg.ts,
          text: formattedResponse,
        })
        if (!updated.ok) {
          // Fallback: post as new message if update fails
          await sendSlackMessage(workspaceId, {
            channel: channelId,
            text: formattedResponse,
            threadTs: replyThreadTs,
          })
        }
      } else {
        await sendSlackMessage(workspaceId, {
          channel: channelId,
          text: formattedResponse,
          threadTs: replyThreadTs,
        })
      }
    }
  } catch (error: unknown) {
    logger.error('[SlackInteractive] Processing failed', {
      slackUserId,
      messageTs,
      error: error instanceof Error ? error.message : String(error),
    })

    // Try to update the thinking message with an error, or send a new one
    try {
      const errorWorkspaceId = resolvedWorkspaceId ?? await resolveWorkspace(slackTeamId)
      if (errorWorkspaceId) {
        const errorText = 'Something went wrong processing your request. Try again or use the Loopwell app.'
        if (thinkingMsg?.ts) {
          await updateSlackMessage(errorWorkspaceId, {
            channel: channelId,
            ts: thinkingMsg.ts,
            text: errorText,
          }).catch(() => {
            // If update fails, post as a new message
            return sendSlackMessage(errorWorkspaceId, {
              channel: channelId,
              text: errorText,
              threadTs: threadTs ?? messageTs,
            })
          })
        } else {
          await sendSlackMessage(errorWorkspaceId, {
            channel: channelId,
            text: errorText,
            threadTs: threadTs ?? messageTs,
          })
        }
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
// Plan Confirmation (write-tool approval flow)
// =============================================================================

interface PlanConfirmationParams {
  workspaceId: string
  userId: string
  channelId: string
  threadTs: string
  responseText: string
  conversationId: string
  memberRole: string
  userContext: {
    name: string
    email: string
    timezone: string
    workspaceName: string
  }
  /** If set, update this message in-place instead of posting a new one */
  thinkingMsgTs?: string
}

async function postPlanConfirmation(params: PlanConfirmationParams): Promise<void> {
  const { workspaceId, userId, channelId, threadTs, responseText, conversationId, memberRole, userContext, thinkingMsgTs } = params

  // Format the planner's confirmation text for Slack and add Approve/Cancel buttons
  const planText = formatForSlack(responseText)

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: planText },
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

  // Update thinking message in-place if we have its timestamp; otherwise post a new message
  let result: { ok: boolean; ts?: string }
  if (thinkingMsgTs) {
    const updated = await updateSlackMessage(workspaceId, {
      channel: channelId,
      ts: thinkingMsgTs,
      text: planText,
      blocks,
    })
    // If update succeeded, use the thinking message ts for pending action tracking
    result = updated.ok ? { ok: true, ts: thinkingMsgTs } : { ok: false }
    if (!updated.ok) {
      // Fallback: post new message
      result = await sendSlackMessage(workspaceId, {
        channel: channelId,
        text: planText,
        blocks,
        threadTs,
      })
    }
  } else {
    result = await sendSlackMessage(workspaceId, {
      channel: channelId,
      text: planText, // Fallback for notifications
      blocks,
      threadTs,
    })
  }

  // Store pending action so the webhook can re-enter the agent loop on button click
  if (result.ok && result.ts) {
    try {
      await prisma.loopbrainPendingAction.create({
        data: {
          workspaceId,
          type: 'loopbrain_plan_approval',
          contextType: 'LoopbrainSession',
          contextId: conversationId,
          contextData: {
            conversationId,
            userId,
            userRole: memberRole,
            userContext,
          } as unknown as Prisma.InputJsonValue,
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
