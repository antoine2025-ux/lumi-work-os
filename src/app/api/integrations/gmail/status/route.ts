/**
 * GET /api/integrations/gmail/status
 * Returns whether Gmail is connected for the current user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { IntegrationType } from '@prisma/client'
import type { GmailIntegrationConfig } from '@/lib/gmail'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    const userId = auth?.user?.userId
    const workspaceId = auth?.workspaceId

    if (!userId || !workspaceId) {
      return NextResponse.json({ connected: false }, { status: 200 })
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
      return NextResponse.json({ connected: false })
    }

    const config = integration.config as GmailIntegrationConfig
    const userTokens = config?.users?.[userId]
    const connected = !!(userTokens?.accessToken)

    return NextResponse.json({ connected })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
