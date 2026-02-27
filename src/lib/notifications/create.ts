import { prisma } from '@/lib/db'
import type { Notification } from '@prisma/client'

export async function createNotification(params: {
  workspaceId: string
  recipientId: string
  actorId?: string
  type: string
  title: string
  body?: string
  entityType?: string
  entityId?: string
  url?: string
}): Promise<Notification> {
  return prisma.notification.create({
    data: {
      workspaceId: params.workspaceId,
      recipientId: params.recipientId,
      actorId: params.actorId ?? null,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      url: params.url ?? null,
    },
  })
}
