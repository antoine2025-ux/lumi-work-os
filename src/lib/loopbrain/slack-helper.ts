/**
 * Loopbrain Slack Helper
 * 
 * Provides helper functions for Loopbrain to interact with Slack.
 * These functions can be called by the Loopbrain orchestrator when
 * the user requests Slack actions or when Loopbrain decides to send
 * notifications.
 */

import { sendSlackMessage, getSlackIntegration, getSlackChannelMessages } from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'

export interface SendSlackMessageParams {
  workspaceId: string
  channel: string
  text?: string
  blocks?: any[]
  threadTs?: string
}

/**
 * Send a message to Slack via Loopbrain
 * 
 * @param params - Message parameters
 * @returns Success status and message timestamp
 */
export async function loopbrainSendSlackMessage(
  params: SendSlackMessageParams
): Promise<{ success: boolean; ts?: string; error?: string }> {
  try {
    // Check if Slack integration is active
    const integration = await getSlackIntegration(params.workspaceId)
    
    if (!integration) {
      return {
        success: false,
        error: 'Slack integration not configured for this workspace'
      }
    }

    const result = await sendSlackMessage(params.workspaceId, {
      channel: params.channel,
      text: params.text,
      blocks: params.blocks,
      threadTs: params.threadTs
    })

    if (!result.ok) {
      return {
        success: false,
        error: result.error || 'Failed to send Slack message'
      }
    }

    logger.info('Loopbrain sent Slack message', {
      workspaceId: params.workspaceId,
      channel: params.channel,
      ts: result.ts
    })

    return {
      success: true,
      ts: result.ts
    }
  } catch (error) {
    logger.error('Loopbrain Slack message error', {
      workspaceId: params.workspaceId,
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Read messages from a Slack channel via Loopbrain
 * 
 * @param params - Channel and limit parameters
 * @returns Messages from the channel
 */
export async function loopbrainReadSlackChannel(
  params: {
    workspaceId: string
    channel: string
    limit?: number
    oldest?: number
    latest?: number
  }
): Promise<{ success: boolean; messages?: Array<{ user: string; text: string; ts: string; threadTs?: string; replies?: number }>; error?: string }> {
  try {
    // Check if Slack integration is active
    const integration = await getSlackIntegration(params.workspaceId)
    
    if (!integration) {
      return {
        success: false,
        error: 'Slack integration not configured for this workspace'
      }
    }

    const messages = await getSlackChannelMessages(
      params.workspaceId,
      params.channel,
      params.limit || 50,
      params.oldest,
      params.latest
    )

    logger.info('Loopbrain read Slack channel messages', {
      workspaceId: params.workspaceId,
      channel: params.channel,
      messageCount: messages.length
    })

    return {
      success: true,
      messages
    }
  } catch (error) {
    logger.error('Loopbrain Slack read error', {
      workspaceId: params.workspaceId,
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if Slack integration is available for a workspace
 */
export async function isSlackAvailable(workspaceId: string): Promise<boolean> {
  try {
    const integration = await getSlackIntegration(workspaceId)
    return integration !== null
  } catch (error) {
    logger.error('Error checking Slack availability', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

