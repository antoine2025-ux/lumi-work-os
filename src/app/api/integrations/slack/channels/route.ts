/**
 * Get Slack Channels API
 * 
 * GET - Get list of channels in the Slack workspace
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
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

    const channels = await getSlackChannels(auth.workspaceId)

    return NextResponse.json({
      channels
    })
  } catch (error) {
    logger.error('Error fetching Slack channels:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { error: 'Failed to fetch Slack channels' },
      { status: 500 }
    )
  }
}


