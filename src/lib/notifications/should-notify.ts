import { prisma } from '@/lib/db'

const cache = new Map<string, { value: boolean; expires: number }>()

export async function shouldNotify(
  userId: string,
  workspaceId: string,
  notificationType: string
): Promise<boolean> {
  const cacheKey = `${userId}:${workspaceId}:${notificationType}`
  const cached = cache.get(cacheKey)

  if (cached && cached.expires > Date.now()) {
    return cached.value
  }

  const preference = await prisma.notificationPreference.findUnique({
    where: {
      userId_workspaceId_notificationType: {
        userId,
        workspaceId,
        notificationType,
      },
    },
    select: { enabled: true },
  })

  const enabled = preference?.enabled ?? true

  cache.set(cacheKey, {
    value: enabled,
    expires: Date.now() + 60_000,
  })

  return enabled
}

export function clearNotificationCache(
  userId: string,
  workspaceId: string,
  notificationType: string
): void {
  const cacheKey = `${userId}:${workspaceId}:${notificationType}`
  cache.delete(cacheKey)
}
