/**
 * GET /api/integrations/gmail/debug
 * Returns diagnostic info (no secrets) to debug connection issues.
 * Remove or restrict in production.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { IntegrationType } from '@prisma/client'
import type { GmailIntegrationConfig } from '@/lib/gmail'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({
        ok: false,
        error: 'Unauthorized',
        hasUserId: !!userId,
        hasWorkspaceId: !!workspaceId,
      })
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

    const config = integration?.config as GmailIntegrationConfig | undefined
    const userIdsInConfig = config?.users ? Object.keys(config.users) : []
    const hasTokensForCurrentUser = !!(config?.users?.[userId]?.accessToken)

    return NextResponse.json({
      ok: true,
      userId,
      workspaceId,
      integrationExists: !!integration,
      integrationId: integration?.id ?? null,
      userIdsInConfig,
      hasTokensForCurrentUser,
      connected: !!integration && hasTokensForCurrentUser,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
