import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { NotificationQuerySchema } from '@/lib/validations/notifications'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const parsed = NotificationQuerySchema.parse({
      unreadOnly: searchParams.get('unreadOnly') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
    })
    const { unreadOnly, limit, cursor } = parsed

    const where = {
      recipientId: auth.user.userId,
      ...(unreadOnly ? { read: false } : {}),
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: {
          recipientId: auth.user.userId,
          read: false,
        },
      }),
    ])

    const hasMore = notifications.length > limit
    const items = hasMore ? notifications.slice(0, limit) : notifications
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null

    return NextResponse.json({
      notifications: items,
      unreadCount,
      hasMore,
      nextCursor,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
