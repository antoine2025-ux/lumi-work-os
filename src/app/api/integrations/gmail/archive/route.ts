/**
 * POST /api/integrations/gmail/archive
 * Archives an email (removes INBOX label).
 * Body: { messageId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { getGmailOAuth2Client, getGmailClient } from '@/lib/gmail'
import { GmailArchiveSchema } from '@/lib/validations/gmail'
import { handleApiError } from '@/lib/api-errors'
import { IntegrationType } from '@prisma/client'
import type { GmailIntegrationConfig } from '@/lib/gmail'

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
    const data = GmailArchiveSchema.parse(body)

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

    await gmail.users.messages.modify({
      userId: 'me',
      id: data.messageId,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}
