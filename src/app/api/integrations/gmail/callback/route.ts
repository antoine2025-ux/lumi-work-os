/**
 * GET /api/integrations/gmail/callback
 * OAuth callback from Google. Exchanges code for tokens and stores in Integration.
 */

import { NextRequest } from 'next/server'
import { getGmailOAuth2Client } from '@/lib/gmail'
import { prisma } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logger } from '@/lib/logger'
import { IntegrationType } from '@prisma/client'
import { setupGmailWatch } from '@/lib/integrations/gmail/watch'

interface GmailConfigUsers {
  users?: Record<string, { accessToken: string; refreshToken?: string | null }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const stateRaw = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return Response.redirect(
        new URL(`/home?gmail=error&message=${encodeURIComponent(error)}`, request.url)
      )
    }

    if (!code || !stateRaw) {
      logger.warn('Gmail callback: missing code or state', { hasCode: !!code })
      return Response.redirect(new URL('/home?gmail=error&message=missing_params', request.url))
    }

    let state: { userId: string; workspaceId: string }
    try {
      state = JSON.parse(stateRaw) as { userId: string; workspaceId: string }
    } catch {
      logger.warn('Gmail callback: invalid state JSON', { stateRaw: stateRaw?.slice(0, 50) })
      return Response.redirect(new URL('/home?gmail=error&message=invalid_state', request.url))
    }

    const { userId, workspaceId } = state
    if (!userId || !workspaceId) {
      return Response.redirect(new URL('/home?gmail=error&message=invalid_state', request.url))
    }

    const oauth2Client = getGmailOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    logger.info('Gmail callback: tokens received', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      userId,
      workspaceId,
    })

    if (!tokens.access_token) {
      return Response.redirect(new URL('/home?gmail=error&message=no_tokens', request.url))
    }

    // CRITICAL: Set workspace context BEFORE any Prisma calls (Integration is workspace-scoped)
    setWorkspaceContext(workspaceId)

    const existing = await prisma.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GMAIL },
    })

    const config: GmailConfigUsers = (existing?.config as GmailConfigUsers) ?? {}
    const users = config.users ?? {}
    users[userId] = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
    }
    config.users = users

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: { config: config as object, isActive: true, lastSyncAt: new Date() },
      })
      logger.info('Gmail callback: integration updated', { integrationId: existing.id })
    } else {
      const created = await prisma.integration.create({
        data: {
          workspaceId,
          type: IntegrationType.GMAIL,
          name: 'Gmail',
          config: config as object,
          isActive: true,
        },
      })
      logger.info('Gmail callback: integration created', { integrationId: created.id })
    }

    // Set up Gmail push notification watch (non-blocking)
    try {
      await setupGmailWatch(userId, workspaceId)
      logger.info('Gmail callback: watch setup successful', { userId, workspaceId })
    } catch (watchErr) {
      logger.warn('Gmail callback: watch setup failed (non-blocking)', {
        userId,
        error: watchErr instanceof Error ? watchErr.message : String(watchErr),
      })
    }

    return Response.redirect(new URL('/home?gmail=connected', request.url))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.redirect(
      new URL(`/home?gmail=error&message=${encodeURIComponent(message)}`, request.url)
    )
  }
}
