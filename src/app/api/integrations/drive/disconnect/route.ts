/**
 * POST /api/integrations/drive/disconnect
 * Removes the current user's Google Drive tokens from the Integration config.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { IntegrationType } from '@prisma/client'
import { logger } from '@/lib/logger'
import type { DriveIntegrationConfig } from '@/lib/drive'

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

    const integration = await prisma.integration.findFirst({
      where: { workspaceId, type: IntegrationType.GOOGLE_DRIVE },
    })

    if (!integration) {
      return NextResponse.json({ disconnected: true })
    }

    const config = integration.config as DriveIntegrationConfig
    if (config?.users?.[userId]) {
      delete config.users[userId]

      const hasRemainingUsers = Object.keys(config.users).length > 0

      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          config: config as object,
          isActive: hasRemainingUsers,
        },
      })

      logger.info('Drive disconnect: user tokens removed', { userId, workspaceId })
    }

    return NextResponse.json({ disconnected: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}
