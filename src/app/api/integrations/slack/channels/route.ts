/**
 * Get Slack Channels API
 * 
 * GET - Get list of channels in the Slack workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { getSlackChannels } from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })
    setWorkspaceContext(auth.workspaceId)

    const channels = await getSlackChannels(auth.workspaceId)

    return NextResponse.json({
      channels
    })
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}







