import { prisma } from '@/lib/db'

/**
 * Ensures a "General" PUBLIC space exists for a workspace.
 * Called during workspace onboarding and on first access when no spaces exist.
 * Safe to call multiple times — returns the existing space if one is found.
 */
export async function ensureGeneralSpace(workspaceId: string, ownerId: string) {
  const existing = await prisma.space.findFirst({
    where: { workspaceId, isPersonal: false },
    orderBy: { createdAt: 'asc' },
  })
  if (existing) return existing

  return prisma.space.create({
    data: {
      workspaceId,
      ownerId,
      name: 'General',
      visibility: 'PUBLIC',
      isPersonal: false,
      type: 'TEAM',
      icon: 'home',
      color: '#6366f1',
    },
  })
}
