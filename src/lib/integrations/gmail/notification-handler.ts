/**
 * Gmail Push Notification Handler
 *
 * Processes notifications from Google Cloud Pub/Sub when Gmail changes occur.
 * Fetches new messages since the last known historyId and emits
 * policy.email.received events for the Loopbrain policy engine.
 */

import { prismaUnscoped } from '@/lib/db'
import { IntegrationType } from '@prisma/client'
import { getGmailOAuth2Client, getGmailClient, parseEmailAddress } from '@/lib/gmail'
import type { GmailIntegrationConfig } from '@/lib/gmail'
import { emitEvent } from '@/lib/events/emit'
import { POLICY_EVENTS } from '@/lib/loopbrain/policies/listeners'
import type { EmailReceivedEvent } from '@/lib/loopbrain/policies/event-matcher'
import { logger } from '@/lib/logger'

export interface GmailPushNotification {
  emailAddress: string
  historyId: string
}

/**
 * Process a Gmail push notification.
 * Resolves the user from the email address, fetches new messages via
 * Gmail history API, and emits events for the policy engine.
 */
export async function processGmailNotification(
  notification: GmailPushNotification,
): Promise<void> {
  const { emailAddress, historyId } = notification

  const integrations = await prismaUnscoped.integration.findMany({
    where: { type: IntegrationType.GMAIL },
    select: { id: true, workspaceId: true, config: true },
  })

  let matchedUserId: string | null = null
  let matchedWorkspaceId: string | null = null
  let matchedIntegrationId: string | null = null
  let matchedConfig: GmailIntegrationConfig | null = null

  for (const integration of integrations) {
    const config = integration.config as GmailIntegrationConfig
    if (!config?.users) continue

    for (const [userId, tokens] of Object.entries(config.users)) {
      const userEmail = (tokens as Record<string, unknown>)?.email as string | undefined
      if (userEmail?.toLowerCase() === emailAddress.toLowerCase()) {
        matchedUserId = userId
        matchedWorkspaceId = integration.workspaceId
        matchedIntegrationId = integration.id
        matchedConfig = config
        break
      }
    }
    if (matchedUserId) break
  }

  // Fallback: if email isn't stored in config, look up user by email in the User table
  if (!matchedUserId) {
    const user = await prismaUnscoped.user.findFirst({
      where: { email: emailAddress.toLowerCase() },
      select: { id: true },
    })

    if (user) {
      for (const integration of integrations) {
        const config = integration.config as GmailIntegrationConfig
        if (config?.users?.[user.id]?.accessToken) {
          matchedUserId = user.id
          matchedWorkspaceId = integration.workspaceId
          matchedIntegrationId = integration.id
          matchedConfig = config
          break
        }
      }
    }
  }

  if (!matchedUserId || !matchedWorkspaceId || !matchedIntegrationId || !matchedConfig) {
    logger.warn('[Gmail Push] No integration found for email', { emailAddress })
    return
  }

  const userTokens = matchedConfig.users?.[matchedUserId]
  if (!userTokens?.accessToken) {
    logger.warn('[Gmail Push] No tokens for user', { userId: matchedUserId })
    return
  }

  try {
    const oauth2Client = getGmailOAuth2Client()
    oauth2Client.setCredentials({
      access_token: userTokens.accessToken,
      refresh_token: userTokens.refreshToken ?? undefined,
    })
    const gmail = getGmailClient(oauth2Client)

    const storedHistoryId =
      (userTokens as Record<string, unknown>)?.historyId as string | undefined
    const startHistoryId = storedHistoryId ?? historyId

    const history = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      maxResults: 50,
    })

    const addedMessages =
      history.data.history?.flatMap((h) => h.messagesAdded ?? []) ?? []

    if (addedMessages.length === 0) {
      logger.info('[Gmail Push] No new messages', { userId: matchedUserId })
    }

    for (const item of addedMessages) {
      if (!item.message?.id) continue

      // Only process inbox messages
      if (!item.message.labelIds?.includes('INBOX')) continue

      const message = await gmail.users.messages.get({
        userId: 'me',
        id: item.message.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      })

      const headers = message.data.payload?.headers ?? []
      const subject = headers.find((h) => h.name === 'Subject')?.value ?? ''
      const from = headers.find((h) => h.name === 'From')?.value ?? ''
      const parsedFrom = parseEmailAddress(from)

      const event: EmailReceivedEvent = {
        workspaceId: matchedWorkspaceId,
        userId: matchedUserId,
        subject,
        from: parsedFrom.email || from,
        snippet: message.data.snippet ?? '',
        threadId: message.data.threadId ?? message.data.id ?? '',
      }

      if (event.threadId) {
        await emitEvent(POLICY_EVENTS.EMAIL_RECEIVED, event)
        logger.info('[Gmail Push] Event emitted', {
          userId: matchedUserId,
          workspaceId: matchedWorkspaceId,
          subject: subject.slice(0, 80),
          threadId: event.threadId,
        })
      }
    }

    // Update stored historyId to the latest
    const updatedUsers = { ...matchedConfig.users }
    updatedUsers[matchedUserId] = {
      ...userTokens,
      historyId: historyId,
    } as GmailIntegrationConfig['users'] extends Record<string, infer V> ? V : never

    await prismaUnscoped.integration.update({
      where: { id: matchedIntegrationId },
      data: {
        config: { ...matchedConfig, users: updatedUsers } as object,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    // historyId too old — Gmail purged the history. Store the new one and move on.
    if (message.includes('404') || message.includes('historyId')) {
      logger.warn('[Gmail Push] History expired, resetting historyId', {
        userId: matchedUserId,
        newHistoryId: historyId,
      })
      const updatedUsers = { ...matchedConfig.users }
      updatedUsers[matchedUserId] = {
        ...userTokens,
        historyId: historyId,
      } as GmailIntegrationConfig['users'] extends Record<string, infer V> ? V : never

      await prismaUnscoped.integration.update({
        where: { id: matchedIntegrationId },
        data: { config: { ...matchedConfig, users: updatedUsers } as object },
      })
      return
    }

    logger.error('[Gmail Push] Processing error', {
      userId: matchedUserId,
      error: message,
    })
    throw err
  }
}
