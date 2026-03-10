/**
 * GET /api/integrations/drive/callback
 * OAuth callback from Google. Exchanges code for tokens and stores in Integration.
 */

import { NextRequest } from 'next/server'
import { getDriveOAuth2Client } from '@/lib/drive'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logger } from '@/lib/logger'
import { IntegrationType } from '@prisma/client'
import type { DriveIntegrationConfig } from '@/lib/drive'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const stateRaw = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return Response.redirect(
        new URL(`/home?drive=error&message=${encodeURIComponent(error)}`, request.url),
      )
    }

    if (!code || !stateRaw) {
      logger.warn('Drive callback: missing code or state', { hasCode: !!code })
      return Response.redirect(new URL('/home?drive=error&message=missing_params', request.url))
    }

    let state: { userId: string; workspaceId: string }
    try {
      state = JSON.parse(stateRaw) as { userId: string; workspaceId: string }
    } catch {
      logger.warn('Drive callback: invalid state JSON', { stateRaw: stateRaw?.slice(0, 50) })
      return Response.redirect(new URL('/home?drive=error&message=invalid_state', request.url))
    }

    const { userId, workspaceId } = state
    if (!userId || !workspaceId) {
      return Response.redirect(new URL('/home?drive=error&message=invalid_state', request.url))
    }

    const oauth2Client = getDriveOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    logger.info('Drive callback: tokens received', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      userId,
      workspaceId,
    })

    if (!tokens.access_token) {
      return Response.redirect(new URL('/home?drive=error&message=no_tokens', request.url))
    }

    setWorkspaceContext(workspaceId)

    const existing = await prisma.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GOOGLE_DRIVE },
    })

    const config: DriveIntegrationConfig = (existing?.config as DriveIntegrationConfig) ?? {}
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
      logger.info('Drive callback: integration updated', { integrationId: existing.id })
    } else {
      const created = await prisma.integration.create({
        data: {
          workspaceId,
          type: IntegrationType.GOOGLE_DRIVE,
          name: 'Google Drive',
          config: config as object,
          isActive: true,
        },
      })
      logger.info('Drive callback: integration created', { integrationId: created.id })
    }

    return Response.redirect(new URL('/home?drive=connected', request.url))
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
