/**
 * Slack Interactive Message Sender
 * 
 * Send messages with interactive buttons and track pending actions
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { getSlackIntegration, getValidAccessToken } from './slack-service'

export interface SlackButton {
  text: string
  value: string
  style?: 'primary' | 'danger'
}

export interface SlackBlock {
  type: string
  [key: string]: any
}

export interface PendingActionParams {
  type: string // e.g., "time_off_approval", "task_assignment"
  contextType: string // e.g., "LeaveRequest", "Task"
  contextId: string // ID of the related entity
  contextData?: any // Additional context as JSON
  createdBy: string // userId who triggered this
  assignedTo: string // userId who should respond
  expiresAt: Date // When this action expires
}

export interface SendInteractiveMessageParams {
  workspaceId: string
  slackUserId: string
  slackChannelId: string
  text: string // Fallback text for notifications
  blocks: SlackBlock[]
  buttons: SlackButton[]
  pendingAction: PendingActionParams
}

/**
 * Send an interactive Slack message with buttons and track pending action
 */
export async function sendInteractiveSlackMessage({
  workspaceId,
  slackUserId,
  slackChannelId,
  text,
  blocks,
  buttons,
  pendingAction,
}: SendInteractiveMessageParams) {
  logger.info('[Slack Interactive] Sending interactive message', {
    workspaceId,
    slackChannelId,
    slackUserId,
    actionType: pendingAction.type,
  })

  // Get workspace Slack integration
  const integration = await getSlackIntegration(workspaceId)
  if (!integration) {
    throw new Error('Slack not connected for workspace')
  }

  // Get valid access token (handles refresh if needed)
  const token = await getValidAccessToken(workspaceId)

  // Build button elements with action_id format: {type}_{value}
  const buttonElements = buttons.map(btn => ({
    type: 'button',
    text: {
      type: 'plain_text',
      text: btn.text,
      emoji: true,
    },
    value: btn.value,
    action_id: `${pendingAction.type}_${btn.value}`,
    ...(btn.style && { style: btn.style }),
  }))

  // Add buttons as an actions block
  const messageBlocks = [
    ...blocks,
    {
      type: 'actions',
      elements: buttonElements,
    },
  ]

  // Send message to Slack
  const response = await fetch('https://api.slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel: slackChannelId,
      text,
      blocks: messageBlocks,
    }),
  })

  const result = await response.json()

  if (!result.ok) {
    logger.error('[Slack Interactive] Failed to send message', {
      error: result.error,
      workspaceId,
      slackChannelId,
    })
    throw new Error(`Slack API error: ${result.error}`)
  }

  logger.info('[Slack Interactive] Message sent successfully', {
    messageTs: result.ts,
    channel: result.channel,
  })

  // Store pending action in database
  const pendingActionRecord = await prisma.loopbrainPendingAction.create({
    data: {
      workspaceId,
      type: pendingAction.type,
      status: 'AWAITING_RESPONSE',
      contextType: pendingAction.contextType,
      contextId: pendingAction.contextId,
      contextData: pendingAction.contextData,
      slackChannelId,
      slackMessageTs: result.ts,
      slackUserId,
      createdBy: pendingAction.createdBy,
      assignedTo: pendingAction.assignedTo,
      expiresAt: pendingAction.expiresAt,
    },
  })

  logger.info('[Slack Interactive] Pending action created', {
    pendingActionId: pendingActionRecord.id,
    messageTs: result.ts,
  })

  return {
    messageTs: result.ts,
    channel: result.channel,
    pendingActionId: pendingActionRecord.id,
  }
}

/**
 * Update a Slack message (e.g., after button click to show completion)
 */
export async function updateSlackMessage({
  workspaceId,
  channel,
  messageTs,
  text,
  blocks,
}: {
  workspaceId: string
  channel: string
  messageTs: string
  text: string
  blocks?: SlackBlock[]
}) {
  logger.info('[Slack Interactive] Updating message', {
    workspaceId,
    channel,
    messageTs,
  })

  const token = await getValidAccessToken(workspaceId)

  const response = await fetch('https://api.slack.com/api/chat.update', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      ts: messageTs,
      text,
      blocks,
    }),
  })

  const result = await response.json()

  if (!result.ok) {
    logger.error('[Slack Interactive] Failed to update message', {
      error: result.error,
      messageTs,
    })
    throw new Error(`Slack API error: ${result.error}`)
  }

  return result
}

/**
 * Helper to build common block patterns
 */
export const SlackBlockBuilder = {
  /**
   * Create a header block
   */
  header(text: string): SlackBlock {
    return {
      type: 'header',
      text: {
        type: 'plain_text',
        text,
        emoji: true,
      },
    }
  },

  /**
   * Create a section with markdown text
   */
  section(text: string): SlackBlock {
    return {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text,
      },
    }
  },

  /**
   * Create a section with fields (two-column layout)
   */
  fields(fields: Array<{ label: string; value: string }>): SlackBlock {
    return {
      type: 'section',
      fields: fields.map(f => ({
        type: 'mrkdwn',
        text: `*${f.label}:*\n${f.value}`,
      })),
    }
  },

  /**
   * Create a divider
   */
  divider(): SlackBlock {
    return {
      type: 'divider',
    }
  },

  /**
   * Create a context block (small gray text)
   */
  context(elements: string[]): SlackBlock {
    return {
      type: 'context',
      elements: elements.map(text => ({
        type: 'mrkdwn',
        text,
      })),
    }
  },
}
