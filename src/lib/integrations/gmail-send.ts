/**
 * Gmail Send Helper
 *
 * Shared server-side logic for sending emails via Gmail API.
 * Used by: POST /api/integrations/gmail/send and Loopbrain sendEmail/replyToEmail tools.
 *
 * Requires Gmail integration with gmail.send scope.
 */

import { prisma } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { getGmailOAuth2Client, getGmailClient } from '@/lib/gmail'
import { IntegrationType } from '@prisma/client'
import type { GmailIntegrationConfig } from '@/lib/gmail'

export interface SendGmailParams {
  userId: string
  workspaceId: string
  to: string
  subject: string
  body: string
  /** For replies — keeps message in same Gmail thread */
  replyToThreadId?: string
  /** For replies — In-Reply-To header for non-Gmail client threading */
  replyToMessageId?: string
  /** For replies — References header chain */
  references?: string
}

export interface SendGmailResult {
  success: boolean
  messageId?: string
  threadId?: string
  error?: string
  /** User-safe message for UI (e.g. "Gmail not connected") */
  userMessage?: string
}

/**
 * Send an email via Gmail API.
 * Resolves tokens from Integration model, builds MIME, calls Gmail API.
 */
export async function sendGmail(params: SendGmailParams): Promise<SendGmailResult> {
  const { userId, workspaceId, to, subject, body, replyToThreadId, replyToMessageId, references } = params

  try {
    setWorkspaceContext(workspaceId)
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GMAIL },
    })

    if (!integration) {
      return {
        success: false,
        error: 'GMAIL_NOT_CONNECTED',
        userMessage: 'Gmail is not connected. Connect it in Settings → Integrations.',
      }
    }

    const config = integration.config as GmailIntegrationConfig
    const userTokens = config?.users?.[userId]
    if (!userTokens?.accessToken) {
      return {
        success: false,
        error: 'GMAIL_NOT_CONNECTED',
        userMessage: 'Gmail is not connected. Connect it in Settings → Integrations.',
      }
    }

    const oauth2Client = getGmailOAuth2Client()
    oauth2Client.setCredentials({
      access_token: userTokens.accessToken,
      refresh_token: userTokens.refreshToken ?? undefined,
    })

    const headers: string[] = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset=UTF-8',
    ]

    if (replyToMessageId) {
      // In-Reply-To for proper threading in non-Gmail clients
      const inReplyToValue = replyToMessageId.includes('<') ? replyToMessageId : `<${replyToMessageId}@mail.gmail.com>`
      headers.push(`In-Reply-To: ${inReplyToValue}`)
    }
    if (references) {
      headers.push(`References: ${references}`)
    }

    const raw = Buffer.from([...headers, '', body].join('\r\n')).toString('base64url')

    const sendPayload: { userId: string; requestBody: { raw: string; threadId?: string } } = {
      userId: 'me',
      requestBody: { raw },
    }
    if (replyToThreadId) {
      sendPayload.requestBody.threadId = replyToThreadId
    }

    const gmail = getGmailClient(oauth2Client)
    const response = await gmail.users.messages.send(sendPayload)

    return {
      success: true,
      messageId: response.data.id ?? undefined,
      threadId: response.data.threadId ?? undefined,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const isScopeError =
      message.includes('insufficient') ||
      message.includes('access_denied') ||
      message.includes('scope') ||
      (message.includes('403') && message.toLowerCase().includes('gmail'))

    if (isScopeError) {
      return {
        success: false,
        error: 'GMAIL_SCOPE_MISSING',
        userMessage:
          'Gmail needs to be reconnected to enable sending. Go to Settings → Integrations and reconnect Gmail.',
      }
    }

    return {
      success: false,
      error: 'SEND_FAILED',
      userMessage: message.length > 200 ? 'Failed to send email. Please try again.' : message,
    }
  }
}
