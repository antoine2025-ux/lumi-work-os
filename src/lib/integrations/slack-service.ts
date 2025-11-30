/**
 * Slack Integration Service
 * 
 * Handles Slack API interactions:
 * - Token storage and refresh
 * - Sending messages to channels/DMs
 * - Managing workspace connections
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { IntegrationType } from '@prisma/client'

interface SlackConfig {
  accessToken: string
  refreshToken: string
  expiresAt?: number
  teamId?: string
  teamName?: string
  botUserId?: string
  scopes?: string[]
}

interface SlackMessage {
  channel: string // Channel ID or name (e.g., "#general" or "C1234567890")
  text?: string
  blocks?: any[] // Slack Block Kit blocks
  threadTs?: string // Thread timestamp for replies
}

/**
 * Get Slack integration for a workspace
 */
export async function getSlackIntegration(workspaceId: string) {
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      type: IntegrationType.SLACK,
      isActive: true
    }
  })

  if (!integration) {
    return null
  }

  return {
    id: integration.id,
    config: integration.config as SlackConfig,
    lastSyncAt: integration.lastSyncAt
  }
}

/**
 * Store or update Slack integration credentials
 */
export async function storeSlackIntegration(
  workspaceId: string,
  config: SlackConfig
): Promise<void> {
  try {
    logger.info('Storing Slack integration', { workspaceId, teamId: config.teamId, hasAccessToken: !!config.accessToken })
    
    const existing = await prisma.integration.findFirst({
      where: {
        workspaceId,
        type: IntegrationType.SLACK
      }
    })

    if (existing) {
      logger.info('Updating existing Slack integration', { integrationId: existing.id })
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          config: config as any,
          isActive: true,
          updatedAt: new Date()
        }
      })
    } else {
      logger.info('Creating new Slack integration', { workspaceId })
      await prisma.integration.create({
        data: {
          workspaceId,
          type: IntegrationType.SLACK,
          name: config.teamName || 'Slack Workspace',
          config: config as any,
          isActive: true
        }
      })
    }

    logger.info('Slack integration stored successfully', { workspaceId, teamId: config.teamId })
  } catch (error) {
    logger.error('Failed to store Slack integration', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

/**
 * Refresh Slack access token
 */
export async function refreshSlackToken(workspaceId: string): Promise<string> {
  const integration = await getSlackIntegration(workspaceId)
  
  if (!integration) {
    throw new Error('Slack integration not found')
  }

  const config = integration.config

  if (!config.refreshToken) {
    throw new Error('No refresh token available')
  }

  try {
    // Slack OAuth v2 token refresh
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID || '',
        client_secret: process.env.SLACK_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: config.refreshToken
      })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`)
    }

    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.error || 'Token refresh failed')
    }

    // Update stored config with new tokens
    const updatedConfig: SlackConfig = {
      ...config,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || config.refreshToken, // Keep old if not provided
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : config.expiresAt,
      scopes: data.scope ? data.scope.split(',') : config.scopes
    }

    await storeSlackIntegration(workspaceId, updatedConfig)

    logger.info('Slack token refreshed', { workspaceId })
    return updatedConfig.accessToken
  } catch (error) {
    logger.error('Failed to refresh Slack token', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(workspaceId: string): Promise<string> {
  const integration = await getSlackIntegration(workspaceId)
  
  if (!integration) {
    throw new Error('Slack integration not found')
  }

  const config = integration.config

  // Check if token is expired (with 5 minute buffer)
  const isExpired = config.expiresAt && config.expiresAt < Date.now() + 5 * 60 * 1000

  if (isExpired && config.refreshToken) {
    return await refreshSlackToken(workspaceId)
  }

  return config.accessToken
}

/**
 * Send a message to Slack
 */
export async function sendSlackMessage(
  workspaceId: string,
  message: SlackMessage
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const accessToken = await getValidAccessToken(workspaceId)

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        channel: message.channel,
        text: message.text,
        blocks: message.blocks,
        thread_ts: message.threadTs
      })
    })

    const data = await response.json()

    if (!data.ok) {
      logger.error('Slack API error', {
        workspaceId,
        error: data.error,
        channel: message.channel
      })
      return { ok: false, error: data.error }
    }

    // Update last sync time
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        type: IntegrationType.SLACK
      }
    })

    if (integration) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      })
    }

    logger.info('Slack message sent', {
      workspaceId,
      channel: message.channel,
      ts: data.ts
    })

    return { ok: true, ts: data.ts }
  } catch (error) {
    logger.error('Failed to send Slack message', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Get list of channels in the Slack workspace
 */
export async function getSlackChannels(workspaceId: string): Promise<Array<{ id: string; name: string }>> {
  const accessToken = await getValidAccessToken(workspaceId)

  try {
    const response = await fetch('https://slack.com/api/conversations.list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(data.error || 'Failed to fetch channels')
    }

    return (data.channels || []).map((channel: any) => ({
      id: channel.id,
      name: channel.name
    }))
  } catch (error) {
    logger.error('Failed to fetch Slack channels', {
      workspaceId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Get Slack user information by user ID
 */
export async function getSlackUserInfo(
  workspaceId: string,
  userId: string
): Promise<{ name: string; realName?: string; displayName?: string } | null> {
  const accessToken = await getValidAccessToken(workspaceId)

  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const data = await response.json()

    if (!data.ok || !data.user) {
      return null
    }

    const user = data.user
    return {
      name: user.real_name || user.name || userId,
      realName: user.real_name,
      displayName: user.profile?.display_name || user.real_name || user.name
    }
  } catch (error) {
    logger.error('Failed to fetch Slack user info', {
      workspaceId,
      userId,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}

/**
 * Get messages from a Slack channel
 * 
 * @param workspaceId - Workspace ID
 * @param channel - Channel ID or name (e.g., "#general" or "C1234567890")
 * @param limit - Maximum number of messages to fetch (default: 50, max: 1000)
 * @param oldest - Oldest message timestamp to include (optional)
 * @param latest - Latest message timestamp to include (optional)
 * @returns Array of messages with user name (resolved from ID), text, timestamp, and thread info
 */
export async function getSlackChannelMessages(
  workspaceId: string,
  channel: string,
  limit: number = 50,
  oldest?: number,
  latest?: number
): Promise<Array<{
  user: string
  userId?: string
  text: string
  ts: string
  threadTs?: string
  replies?: number
}>> {
  const accessToken = await getValidAccessToken(workspaceId)

  try {
    // First, get the channel ID if a channel name was provided
    let channelId = channel
    if (channel.startsWith('#')) {
      const channelName = channel.slice(1)
      const channels = await getSlackChannels(workspaceId)
      const foundChannel = channels.find(c => c.name === channelName)
      if (!foundChannel) {
        throw new Error(`Channel ${channel} not found`)
      }
      channelId = foundChannel.id
    }

    // Build query parameters
    const params = new URLSearchParams({
      channel: channelId,
      limit: Math.min(Math.max(1, limit), 1000).toString()
    })
    
    if (oldest) {
      params.append('oldest', oldest.toString())
    }
    if (latest) {
      params.append('latest', latest.toString())
    }

    const response = await fetch(`https://slack.com/api/conversations.history?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const data = await response.json()

    if (!data.ok) {
      logger.error('Slack API error fetching messages', {
        workspaceId,
        error: data.error,
        channel
      })
      throw new Error(data.error || 'Failed to fetch messages')
    }

    // Collect unique user IDs
    const userIds = new Set<string>()
    const messages = (data.messages || []).map((msg: any) => {
      const userId = msg.user || msg.bot_id
      if (userId) {
        userIds.add(userId)
      }
      return {
        userId: userId || undefined,
        text: msg.text || '',
        ts: msg.ts,
        threadTs: msg.thread_ts,
        replies: msg.reply_count || 0
      }
    })

    // Resolve user IDs to names (batch fetch for efficiency)
    const userMap = new Map<string, string>()
    const userFetchPromises = Array.from(userIds).map(async (userId) => {
      const userInfo = await getSlackUserInfo(workspaceId, userId)
      if (userInfo) {
        userMap.set(userId, userInfo.displayName || userInfo.realName || userInfo.name)
      } else {
        userMap.set(userId, userId) // Fallback to ID if fetch fails
      }
    })
    await Promise.all(userFetchPromises)

    // Map messages with resolved user names
    const messagesWithNames = messages.map((msg) => ({
      user: msg.userId ? (userMap.get(msg.userId) || msg.userId) : 'Unknown',
      userId: msg.userId,
      text: msg.text,
      ts: msg.ts,
      threadTs: msg.threadTs,
      replies: msg.replies
    }))

    logger.info('Fetched Slack channel messages', {
      workspaceId,
      channel,
      messageCount: messagesWithNames.length
    })

    return messagesWithNames
  } catch (error) {
    logger.error('Failed to fetch Slack channel messages', {
      workspaceId,
      channel,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Deactivate Slack integration
 */
export async function deactivateSlackIntegration(workspaceId: string): Promise<void> {
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      type: IntegrationType.SLACK
    }
  })

  if (integration) {
    await prisma.integration.update({
      where: { id: integration.id },
      data: { isActive: false }
    })

    logger.info('Slack integration deactivated', { workspaceId })
  }
}

