/**
 * Slack Notification Service
 *
 * Sends structured notifications to a workspace's configured Slack channel.
 * Uses Block Kit for rich formatting. Rate-limited to 10 messages per
 * workspace per hour.
 *
 * Notification types:
 * - Daily briefing summary
 * - Critical project health alerts
 * - Meeting prep reminders
 */

import { prisma } from '@/lib/db'
import { getSlackIntegration, sendSlackMessage } from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'
import { IntegrationType } from '@prisma/client'
import type { DailyBriefing } from '@/lib/loopbrain/scenarios/daily-briefing'
import type { MeetingPrepBrief } from '@/lib/loopbrain/scenarios/meeting-prep'

// =============================================================================
// Types
// =============================================================================

interface SlackNotificationConfig {
  notificationChannelId?: string
  notifications?: {
    dailyBriefing: boolean
    healthAlerts: boolean
    meetingPrepReminders: boolean
  }
}

interface HealthAlertPayload {
  projectName: string
  severity: string
  title: string
  details: string
}

// =============================================================================
// Rate Limiting (in-memory, per-process)
// =============================================================================

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 10

const sendTimestamps = new Map<string, number[]>()

function isRateLimited(workspaceId: string): boolean {
  const now = Date.now()
  const timestamps = sendTimestamps.get(workspaceId) ?? []
  const recent = timestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS)
  sendTimestamps.set(workspaceId, recent)
  return recent.length >= RATE_LIMIT_MAX
}

function recordSend(workspaceId: string): void {
  const timestamps = sendTimestamps.get(workspaceId) ?? []
  timestamps.push(Date.now())
  sendTimestamps.set(workspaceId, timestamps)
}

// =============================================================================
// Config Helpers
// =============================================================================

export async function getNotificationChannelId(
  workspaceId: string
): Promise<string | null> {
  const config = await getNotificationConfig(workspaceId)
  return config?.notificationChannelId ?? null
}

export async function getNotificationPreferences(
  workspaceId: string
): Promise<SlackNotificationConfig['notifications'] | null> {
  const config = await getNotificationConfig(workspaceId)
  return config?.notifications ?? null
}

async function getNotificationConfig(
  workspaceId: string
): Promise<SlackNotificationConfig | null> {
  try {
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, type: IntegrationType.SLACK, isActive: true },
      select: { config: true },
    })
    if (!integration) return null
    return integration.config as unknown as SlackNotificationConfig
  } catch {
    return null
  }
}

// =============================================================================
// Core Send
// =============================================================================

export async function sendSlackNotification(
  workspaceId: string,
  message: {
    text: string
    channel?: string
    blocks?: Record<string, unknown>[]
    unfurlLinks?: boolean
  }
): Promise<boolean> {
  if (isRateLimited(workspaceId)) {
    logger.warn('[SlackNotify] Rate limited', { workspaceId })
    return false
  }

  const integration = await getSlackIntegration(workspaceId)
  if (!integration) return false

  const channelId = message.channel ?? (await getNotificationChannelId(workspaceId))
  if (!channelId) {
    logger.debug('[SlackNotify] No notification channel configured', { workspaceId })
    return false
  }

  try {
    const result = await sendSlackMessage(workspaceId, {
      channel: channelId,
      text: message.text,
      blocks: message.blocks,
    })

    if (result.ok) {
      recordSend(workspaceId)
      return true
    }

    logger.warn('[SlackNotify] Send failed', { workspaceId, error: result.error })
    return false
  } catch (err) {
    logger.error('[SlackNotify] Send error', {
      workspaceId,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

// =============================================================================
// Daily Briefing
// =============================================================================

export async function sendDailyBriefingToSlack(
  workspaceId: string,
  briefing: DailyBriefing
): Promise<boolean> {
  const prefs = await getNotificationPreferences(workspaceId)
  if (!prefs?.dailyBriefing) return false

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Daily Briefing — ${briefing.date}`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: briefing.greeting },
    },
  ]

  for (const section of briefing.sections.slice(0, 5)) {
    blocks.push({ type: 'divider' })
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${section.title}*\n${section.content.slice(0, 500)}`,
      },
    })
  }

  if (briefing.keyActions.length > 0) {
    blocks.push({ type: 'divider' })
    const actionText = briefing.keyActions
      .slice(0, 3)
      .map((a) => `• [${a.priority.toUpperCase()}] ${a.title}`)
      .join('\n')
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Key Actions*\n${actionText}` },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.loopwell.com'
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'View in Loopwell', emoji: true },
        url: `${appUrl}/home`,
        action_id: 'view_briefing',
      },
    ],
  })

  return sendSlackNotification(workspaceId, {
    text: `Daily Briefing — ${briefing.date}`,
    blocks,
  })
}

// =============================================================================
// Health Alert
// =============================================================================

export async function sendHealthAlertToSlack(
  workspaceId: string,
  alert: HealthAlertPayload
): Promise<boolean> {
  const prefs = await getNotificationPreferences(workspaceId)
  if (!prefs?.healthAlerts) return false

  const severityEmoji = alert.severity === 'critical' ? ':rotating_light:' : ':warning:'
  const severityBadge = alert.severity.toUpperCase()

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${severityEmoji} *Project Health Alert* — \`${severityBadge}\`\n\n*${alert.projectName}*: ${alert.title}`,
      },
    },
  ]

  if (alert.details) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: alert.details.slice(0, 500) },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.loopwell.com'
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'View Project', emoji: true },
        url: `${appUrl}/projects`,
        action_id: 'view_project_health',
      },
    ],
  })

  return sendSlackNotification(workspaceId, {
    text: `[${severityBadge}] ${alert.projectName}: ${alert.title}`,
    blocks,
  })
}

// =============================================================================
// Meeting Prep Reminder
// =============================================================================

export async function sendMeetingPrepToSlack(
  workspaceId: string,
  prep: MeetingPrepBrief
): Promise<boolean> {
  const prefs = await getNotificationPreferences(workspaceId)
  if (!prefs?.meetingPrepReminders) return false

  const attendeeList = prep.attendees
    .slice(0, 5)
    .map((a) => a.name)
    .join(', ')
  const topicList = prep.suggestedTopics
    .slice(0, 3)
    .map((t) => `• ${t}`)
    .join('\n')

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:calendar: *Meeting Prep Ready* — ${prep.meetingTitle}\n:clock1: ${prep.meetingTime}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Attendees:* ${attendeeList}${prep.attendees.length > 5 ? ` +${prep.attendees.length - 5} more` : ''}`,
      },
    },
  ]

  if (topicList) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Suggested Topics:*\n${topicList}` },
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://app.loopwell.com'
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: 'View Full Prep', emoji: true },
        url: `${appUrl}/home`,
        action_id: 'view_meeting_prep',
      },
    ],
  })

  return sendSlackNotification(workspaceId, {
    text: `Meeting prep ready for ${prep.meetingTitle} at ${prep.meetingTime}`,
    blocks,
  })
}
