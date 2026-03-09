/**
 * Google Drive Client Helper
 *
 * Combines OAuth client creation with token fetch from the Integration model.
 * Used by Loopbrain Drive tools and any server-side Drive operations.
 */

import { drive_v3 } from 'googleapis'
import { prisma } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { getDriveOAuth2Client, getDriveApiClient } from '@/lib/drive'
import type { DriveIntegrationConfig } from '@/lib/drive'
import { IntegrationType } from '@prisma/client'
import { logger } from '@/lib/logger'

export class DriveNotConnectedError extends Error {
  constructor(message = 'Google Drive not connected. Connect in Settings → Integrations.') {
    super(message)
    this.name = 'DriveNotConnectedError'
  }
}

/**
 * Get an authenticated Google Drive API client for a specific user.
 * Fetches tokens from the Integration model (workspace-scoped, per-user config).
 *
 * @throws {DriveNotConnectedError} if no tokens exist for this user
 */
export async function getDriveClientForUser(
  userId: string,
  workspaceId: string,
): Promise<drive_v3.Drive> {
  setWorkspaceContext(workspaceId)

  const integration = await prisma.integration.findFirst({
    where: { workspaceId, type: IntegrationType.GOOGLE_DRIVE },
  })

  if (!integration) {
    throw new DriveNotConnectedError()
  }

  const config = integration.config as DriveIntegrationConfig
  const userTokens = config?.users?.[userId]

  if (!userTokens?.accessToken) {
    throw new DriveNotConnectedError()
  }

  const oauth2Client = getDriveOAuth2Client()
  oauth2Client.setCredentials({
    access_token: userTokens.accessToken,
    refresh_token: userTokens.refreshToken ?? undefined,
  })

  logger.debug('Drive client created for user', { userId, workspaceId })

  return getDriveApiClient(oauth2Client)
}
