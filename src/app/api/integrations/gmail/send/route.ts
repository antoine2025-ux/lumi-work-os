/**
 * POST /api/integrations/gmail/send
 * Sends an email via Gmail API.
 * Body: { to, subject, body, replyToMessageId?, replyToThreadId? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { getGmailOAuth2Client, getGmailClient } from '@/lib/gmail'
import { GmailSendSchema } from '@/lib/validations/gmail'
import { handleApiError } from '@/lib/api-errors'
import { IntegrationType } from '@prisma/client'
import type { GmailIntegrationConfig } from '@/lib/gmail'

function buildMimeMessage(to: string, subject: string, body: string): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const utf8Body = Buffer.from(body, 'utf-8').toString('base64')
  return [
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' + boundary + '"',
    '',
    '--' + boundary,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    utf8Body,
    '',
    '--' + boundary + '--',
  ].join('\r\n')
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    setWorkspaceContext(workspaceId)

    const body = await request.json()
    const data = GmailSendSchema.parse(body)

    const integration = await prisma.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GMAIL },
    })

    if (!integration) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 403 })
    }

    const config = integration.config as GmailIntegrationConfig
    const userTokens = config?.users?.[userId]
    if (!userTokens?.accessToken) {
      return NextResponse.json({ error: 'Gmail not connected' }, { status: 403 })
    }

    const oauth2Client = getGmailOAuth2Client()
    oauth2Client.setCredentials({
      access_token: userTokens.accessToken,
      refresh_token: userTokens.refreshToken ?? undefined,
    })

    const gmail = getGmailClient(oauth2Client)

    const raw = Buffer.from(
      [
        'To: ' + data.to,
        'Subject: ' + data.subject,
        'Content-Type: text/plain; charset=UTF-8',
        '',
        data.body,
      ].join('\r\n')
    ).toString('base64url')

    const sendPayload: { userId: string; requestBody: { raw: string; threadId?: string } } = {
      userId: 'me',
      requestBody: { raw },
    }
    if (data.replyToThreadId) {
      sendPayload.requestBody.threadId = data.replyToThreadId
    }

    const response = await gmail.users.messages.send(sendPayload)

    return NextResponse.json({
      success: true,
      id: response.data.id,
      threadId: response.data.threadId,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
