import { prisma } from '@/lib/db'

/**
 * Ensures a personal Space exists for `userId` in `workspaceId`.
 *
 * Uses findFirst + create rather than upsert because the DB enforces
 * uniqueness via a PARTIAL index (WHERE is_personal = true), which
 * Prisma does not model as a full unique constraint for upsert.
 */
export async function getOrCreatePersonalSpace(
  workspaceId: string,
  userId: string,
  userName?: string,
) {
  const existing = await prisma.space.findFirst({
    where: { workspaceId, ownerId: userId, isPersonal: true },
  })
  if (existing) return existing

  return prisma.space.create({
    data: {
      workspaceId,
      ownerId: userId,
      name: userName ? `${userName}'s Space` : 'Personal Space',
      visibility: 'PERSONAL',
      isPersonal: true,
    },
  })
}
