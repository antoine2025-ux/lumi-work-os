/**
 * POST /api/integrations/gmail/send
 * Sends an email via Gmail API.
 * Body: { to, subject, body, replyToMessageId?, replyToThreadId?, references? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { sendGmail } from '@/lib/integrations/gmail-send'
import { GmailSendSchema } from '@/lib/validations/gmail'
import { handleApiError } from '@/lib/api-errors'

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

    const result = await sendGmail({
      userId,
      workspaceId,
      to: data.to,
      subject: data.subject,
      body: data.body,
      replyToThreadId: data.replyToThreadId,
      replyToMessageId: data.replyToMessageId,
      references: data.references,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.userMessage ?? result.error ?? 'Failed to send' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      id: result.messageId,
      threadId: result.threadId,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
