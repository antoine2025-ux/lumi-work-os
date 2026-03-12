/**
 * GET /api/integrations/gmail/messages
 * Fetches emails from Gmail API.
 * Query: folder (INBOX|SENT|DRAFT), limit (default 20)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { getGmailOAuth2Client, getGmailClient, parseGmailMessage } from '@/lib/gmail'
import { handleApiError } from '@/lib/api-errors'
import { logger } from '@/lib/logger'
import { IntegrationType } from '@prisma/client'
import type { GmailIntegrationConfig } from '@/lib/gmail'

const LABEL_MAP: Record<string, string> = {
  inbox: 'INBOX',
  sent: 'SENT',
  drafts: 'DRAFT',
}

export async function GET(request: NextRequest) {
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

    const integration = await prisma.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GMAIL },
    })

    if (!integration) {
      logger.debug('Gmail messages: no integration found', { userId, workspaceId })
      return NextResponse.json({ connected: false, messages: [] })
    }

    const config = integration.config as GmailIntegrationConfig
    const userTokens = config?.users?.[userId]
    if (!userTokens?.accessToken) {
      const storedUserIds = config?.users ? Object.keys(config.users) : []
      logger.debug('Gmail messages: no tokens for user', {
        userId,
        workspaceId,
        storedUserIds,
        integrationId: integration.id,
      })
      return NextResponse.json({ connected: false, messages: [] })
    }

    const { searchParams } = new URL(request.url)
    const folderParam = (searchParams.get('folder') || 'inbox').toLowerCase()
    const folder = LABEL_MAP[folderParam] || 'INBOX'
    const maxResults = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50)

    const oauth2Client = getGmailOAuth2Client()
    oauth2Client.setCredentials({
      access_token: userTokens.accessToken,
      refresh_token: userTokens.refreshToken ?? undefined,
    })

    const gmail = getGmailClient(oauth2Client)

    const response = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [folder],
      maxResults,
    })

    const messageList = response.data.messages ?? []
    const messages = await Promise.all(
      messageList.map(async (msg) => {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        })
        return parseGmailMessage(full.data)
      })
    )

    return NextResponse.json({ connected: true, messages })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
