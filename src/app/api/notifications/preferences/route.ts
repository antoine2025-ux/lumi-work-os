import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { NotificationPreferenceUpdateSchema } from '@/lib/validations/notifications'
import { NOTIFICATION_TYPES } from '@/lib/notifications/types'
import { clearNotificationCache } from '@/lib/notifications/should-notify'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const preferences = await prisma.notificationPreference.findMany({
      where: {
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
      },
      select: {
        notificationType: true,
        enabled: true,
      },
    })

    const preferencesMap = new Map(
      preferences.map((p) => [p.notificationType, p.enabled])
    )

    const allPreferences = NOTIFICATION_TYPES.map((type) => ({
      notificationType: type.key,
      enabled: preferencesMap.get(type.key) ?? true,
    }))

    return NextResponse.json({ preferences: allPreferences })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { notificationType, enabled } =
      NotificationPreferenceUpdateSchema.parse(body)

    const validTypes = NOTIFICATION_TYPES.map((t) => t.key) as string[]
    if (!validTypes.includes(notificationType)) {
      return NextResponse.json(
        { error: 'Invalid notification type' },
        { status: 400 }
      )
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_workspaceId_notificationType: {
          userId: auth.user.userId,
          workspaceId: auth.workspaceId,
          notificationType,
        },
      },
      update: {
        enabled,
      },
      create: {
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        notificationType,
        enabled,
      },
      select: {
        notificationType: true,
        enabled: true,
      },
    })

    clearNotificationCache(auth.user.userId, auth.workspaceId, notificationType)

    return NextResponse.json({ preference })
  } catch (error) {
    return handleApiError(error)
  }
}
