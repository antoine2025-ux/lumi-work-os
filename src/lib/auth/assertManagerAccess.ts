/**
 * Manager-scoped access helper
 *
 * Checks if the requesting user is the manager of the target person,
 * or has ADMIN+ workspace role. Uses OrgPosition.parentId as the
 * canonical manager relationship.
 *
 * Throws Error('Forbidden: ...') on failure → handleApiError maps to 403.
 */

import { prisma } from '@/lib/db'
import { getUserWorkspaceRole, type Role } from '@/lib/auth/assertAccess'

const ROLE_LEVELS: Record<Role, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
}

/**
 * Assert that the user is either ADMIN+ or the manager of the target person.
 *
 * @param userId       - The requesting user's User.id
 * @param targetPersonId - OrgPosition.id or User.id of the target person
 * @param workspaceId  - Workspace to check within
 */
export async function assertManagerOrAdmin(
  userId: string,
  targetPersonId: string,
  workspaceId: string,
): Promise<void> {
  // Check 1: If user is ADMIN+, always pass
  const role = await getUserWorkspaceRole(userId, workspaceId)
  if (role && (ROLE_LEVELS[role as Role] || 0) >= ROLE_LEVELS.ADMIN) {
    return
  }

  // Check 2: Is the user the manager of the target person?
  const managerPosition = await prisma.orgPosition.findFirst({
    where: {
      userId,
      workspaceId,
      isActive: true,
    },
    select: { id: true },
  })

  if (!managerPosition) {
    throw new Error('Forbidden: User has no position in this workspace')
  }

  // Target could be an OrgPosition.id or a User.id
  const targetPosition = await prisma.orgPosition.findFirst({
    where: {
      OR: [
        { id: targetPersonId, workspaceId },
        { userId: targetPersonId, workspaceId, isActive: true },
      ],
    },
    select: { parentId: true },
  })

  if (!targetPosition) {
    throw new Error('Forbidden: Target person not found in this workspace')
  }

  if (targetPosition.parentId === managerPosition.id) {
    return
  }

  throw new Error('Forbidden: Insufficient permissions — requires ADMIN role or manager relationship')
}
