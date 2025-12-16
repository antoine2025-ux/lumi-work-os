/**
 * Slack Integration API
 * 
 * GET - Get Slack integration status
 * POST - Store/update Slack integration credentials
 * DELETE - Deactivate Slack integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import {
  getSlackIntegration,
  storeSlackIntegration,
  deactivateSlackIntegration
} from '@/lib/integrations/slack-service'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const storeSlackConfigSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  refreshToken: z.string().min(1, 'Refresh token is required'),
  expiresAt: z.number().optional(),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  botUserId: z.string().optional(),
  scopes: z.array(z.string()).optional()
})

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })

    const integration = await getSlackIntegration(auth.workspaceId)

    if (!integration) {
      return NextResponse.json({
        connected: false,
        message: 'Slack integration not found'
      })
    }

    // Don't expose full tokens in response
    return NextResponse.json({
      connected: true,
      teamId: integration.config.teamId,
      teamName: integration.config.teamName,
      lastSyncAt: integration.lastSyncAt,
      hasAccessToken: !!integration.config.accessToken,
      hasRefreshToken: !!integration.config.refreshToken
    })
  } catch (error) {
    logger.error('Error fetching Slack integration:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { error: 'Failed to fetch Slack integration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER'] // Only admins can configure integrations
    })

    const body = await request.json()
    const parsed = storeSlackConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.errors },
        { status: 400 }
      )
    }

    await storeSlackIntegration(auth.workspaceId, parsed.data)

    return NextResponse.json({
      success: true,
      message: 'Slack integration configured successfully'
    })
  } catch (error) {
    logger.error('Error storing Slack integration:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { error: 'Failed to store Slack integration' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER']
    })

    await deactivateSlackIntegration(auth.workspaceId)

    return NextResponse.json({
      success: true,
      message: 'Slack integration deactivated'
    })
  } catch (error) {
    logger.error('Error deactivating Slack integration:', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { error: 'Failed to deactivate Slack integration' },
      { status: 500 }
    )
  }
}






