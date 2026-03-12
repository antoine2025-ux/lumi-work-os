/**
 * Gmail Watch Management
 *
 * Manages Gmail push notification watches via the Gmail API.
 * Each watch lasts 7 days and must be renewed before expiration.
 *
 * Uses the existing Integration model to store watch state
 * (historyId, watchExpiration) alongside OAuth tokens.
 */

import { prismaUnscoped } from '@/lib/db'
import { IntegrationType } from '@prisma/client'
import { getGmailOAuth2Client, getGmailClient } from '@/lib/gmail'
import type { GmailIntegrationConfig } from '@/lib/gmail'
import { logger } from '@/lib/logger'

const PUBSUB_TOPIC_NAME = process.env.GOOGLE_PUBSUB_TOPIC_NAME ?? 'gmail-notifications'
const GCP_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID

interface WatchResult {
  historyId: string
  expiration: Date
}

/**
 * Set up a Gmail push notification watch for a user.
 * The watch tells Google to send Pub/Sub messages when the user's
 * inbox changes. Watches expire after ~7 days.
 */
export async function setupGmailWatch(
  userId: string,
  workspaceId: string,
): Promise<WatchResult> {
  if (!GCP_PROJECT_ID) {
    throw new Error('GOOGLE_CLOUD_PROJECT_ID not configured')
  }

  const integration = await prismaUnscoped.integration.findFirst({
    where: { workspaceId, type: IntegrationType.GMAIL },
  })

  if (!integration) {
    throw new Error('Gmail integration not found')
  }

  const config = integration.config as GmailIntegrationConfig
  const userTokens = config?.users?.[userId]
  if (!userTokens?.accessToken) {
    throw new Error('No Gmail tokens for user')
  }

  const oauth2Client = getGmailOAuth2Client()
  oauth2Client.setCredentials({
    access_token: userTokens.accessToken,
    refresh_token: userTokens.refreshToken ?? undefined,
  })

  const gmail = getGmailClient(oauth2Client)
  const topicName = `projects/${GCP_PROJECT_ID}/topics/${PUBSUB_TOPIC_NAME}`

  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName,
      labelIds: ['INBOX'],
      labelFilterAction: 'include',
    },
  })

  const historyId = response.data.historyId!
  const expiration = new Date(parseInt(response.data.expiration!, 10))

  const updatedUsers = { ...config.users }
  updatedUsers[userId] = {
    ...userTokens,
    historyId,
    watchExpiration: expiration.toISOString(),
  } as GmailIntegrationConfig['users'] extends Record<string, infer V> ? V : never

  await prismaUnscoped.integration.update({
    where: { id: integration.id },
    data: { config: { ...config, users: updatedUsers } as object },
  })

  logger.info('[Gmail Watch] Watch established', {
    userId,
    workspaceId,
    historyId,
    expiration: expiration.toISOString(),
  })

  return { historyId, expiration }
}

/**
 * Renew a Gmail watch. The watch API is idempotent, so this is
 * the same as setup. Call before the current watch expires.
 */
export async function renewGmailWatch(
  userId: string,
  workspaceId: string,
): Promise<WatchResult> {
  return setupGmailWatch(userId, workspaceId)
}

/**
 * Stop watching a user's Gmail. Call on disconnect/cleanup.
 */
export async function stopGmailWatch(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const integration = await prismaUnscoped.integration.findFirst({
    where: { workspaceId, type: IntegrationType.GMAIL },
  })

  if (!integration) return

  const config = integration.config as GmailIntegrationConfig
  const userTokens = config?.users?.[userId]
  if (!userTokens?.accessToken) return

  try {
    const oauth2Client = getGmailOAuth2Client()
    oauth2Client.setCredentials({
      access_token: userTokens.accessToken,
      refresh_token: userTokens.refreshToken ?? undefined,
    })

    const gmail = getGmailClient(oauth2Client)
    await gmail.users.stop({ userId: 'me' })

    // Clear watch metadata from config
    const updatedUsers = { ...config.users }
    const { ...rest } = userTokens as Record<string, unknown>
    delete rest.historyId
    delete rest.watchExpiration
    updatedUsers[userId] = rest as GmailIntegrationConfig['users'] extends Record<string, infer V> ? V : never

    await prismaUnscoped.integration.update({
      where: { id: integration.id },
      data: { config: { ...config, users: updatedUsers } as object },
    })

    logger.info('[Gmail Watch] Watch stopped', { userId, workspaceId })
  } catch (err: unknown) {
    logger.error('[Gmail Watch] Failed to stop watch', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Find all user/workspace pairs with watches expiring within a given window.
 * Used by the renewal cron job.
 */
export async function findExpiringWatches(
  withinMs: number,
): Promise<Array<{ userId: string; workspaceId: string }>> {
  const integrations = await prismaUnscoped.integration.findMany({
    where: { type: IntegrationType.GMAIL },
    select: { workspaceId: true, config: true },
  })

  const cutoff = new Date(Date.now() + withinMs)
  const results: Array<{ userId: string; workspaceId: string }> = []

  for (const integration of integrations) {
    const config = integration.config as GmailIntegrationConfig
    if (!config?.users) continue

    for (const [userId, tokens] of Object.entries(config.users)) {
      const watchExpiration = (tokens as Record<string, unknown>)?.watchExpiration as
        | string
        | undefined
      if (!watchExpiration) {
        // No watch — needs setup
        if ((tokens as Record<string, unknown>)?.accessToken) {
          results.push({ userId, workspaceId: integration.workspaceId })
        }
        continue
      }

      const expiresAt = new Date(watchExpiration)
      if (expiresAt <= cutoff) {
        results.push({ userId, workspaceId: integration.workspaceId })
      }
    }
  }

  return results
}
