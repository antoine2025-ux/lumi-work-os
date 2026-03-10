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
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import {
  getSlackIntegration,
  storeSlackIntegration,
  deactivateSlackIntegration
} from '@/lib/integrations/slack-service'
import { deleteSlackContextForWorkspace } from '@/lib/loopbrain/context-sources/slack'
import { logger } from '@/lib/logger'
import { IntegrationType, Prisma } from '@prisma/client'
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

    const config = integration.config as unknown as Record<string, unknown>
    return NextResponse.json({
      connected: true,
      teamId: integration.config.teamId,
      teamName: integration.config.teamName,
      lastSyncAt: integration.lastSyncAt,
      hasAccessToken: !!integration.config.accessToken,
      hasRefreshToken: !!integration.config.refreshToken,
      scopes: integration.config.scopes,
      notificationChannelId: config.notificationChannelId ?? null,
      notifications: config.notifications ?? {
        dailyBriefing: false,
        healthAlerts: true,
        meetingPrepReminders: false,
      },
    })
  } catch (error: unknown) {
    return handleApiError(error, request);
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
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    await storeSlackIntegration(auth.workspaceId, parsed.data)

    return NextResponse.json({
      success: true,
      message: 'Slack integration configured successfully'
    })
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

const notificationConfigSchema = z.object({
  notificationChannelId: z.string().nullable().optional(),
  notifications: z.object({
    dailyBriefing: z.boolean(),
    healthAlerts: z.boolean(),
    meetingPrepReminders: z.boolean(),
  }).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER']
    })

    const body = await request.json()
    const parsed = notificationConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        type: IntegrationType.SLACK,
        isActive: true,
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'Slack integration not found' },
        { status: 404 }
      )
    }

    const existingConfig = integration.config as Record<string, unknown>
    const updatedConfig = {
      ...existingConfig,
      ...(parsed.data.notificationChannelId !== undefined && {
        notificationChannelId: parsed.data.notificationChannelId,
      }),
      ...(parsed.data.notifications && {
        notifications: parsed.data.notifications,
      }),
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { config: updatedConfig as Prisma.InputJsonValue },
    })

    return NextResponse.json({
      success: true,
      message: 'Notification settings updated',
    })
  } catch (error: unknown) {
    return handleApiError(error, request);
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

    // Clean up stored Slack context items
    try {
      await deleteSlackContextForWorkspace(auth.workspaceId)
    } catch (cleanupErr) {
      logger.warn('Failed to clean up Slack context items', {
        workspaceId: auth.workspaceId,
        error: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Slack integration deactivated'
    })
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}



