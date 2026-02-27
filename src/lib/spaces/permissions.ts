import { prisma } from '@/lib/db'
import { SpaceRole } from '@prisma/client'

/**
 * Returns true if userId can read the space.
 *  PUBLIC  → everyone in the workspace
 *  PERSONAL → owner only
 *  PRIVATE  → owner or explicit SpaceMember
 */
export async function canAccessSpace(
  userId: string,
  spaceId: string,
): Promise<boolean> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { members: { where: { userId } } },
  })
  if (!space) return false
  if (space.visibility === 'PUBLIC') return true
  if (space.ownerId === userId) return true
  if (space.visibility === 'PERSONAL') return false // only the owner
  // PRIVATE: must be an explicit member
  return space.members.length > 0
}

/**
 * Returns true if userId can update space metadata.
 * Owner or SpaceMember with OWNER/EDITOR role.
 */
export async function canEditSpace(
  userId: string,
  spaceId: string,
): Promise<boolean> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { members: { where: { userId } } },
  })
  if (!space) return false
  if (space.ownerId === userId) return true
  const membership = space.members[0]
  return (
    membership?.role === SpaceRole.OWNER ||
    membership?.role === SpaceRole.EDITOR
  )
}

/**
 * Returns true if userId can delete the space.
 * Only the space owner can delete.
 */
export async function canDeleteSpace(
  userId: string,
  spaceId: string,
): Promise<boolean> {
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
  })
  if (!space) return false
  return space.ownerId === userId
}

/**
 * Returns all spaces accessible to userId in the given workspace:
 * PUBLIC spaces, spaces owned by the user, and PRIVATE spaces where
 * the user is an explicit member.
 */
export async function getAccessibleSpaces(
  userId: string,
  workspaceId: string,
) {
  return prisma.space.findMany({
    where: {
      workspaceId,
      OR: [
        { visibility: 'PUBLIC' },
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      _count: { select: { projects: true, wikiPages: true, children: true } },
      owner: { select: { id: true, name: true, image: true } },
      children: {
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: [
      { isPersonal: 'desc' }, // personal space first
      { name: 'asc' },
    ],
  })
}
