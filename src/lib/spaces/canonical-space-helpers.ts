import { prisma } from '@/lib/db'
import { SpaceVisibility } from '@prisma/client'

/**
 * Get or create canonical team space for a workspace.
 * Phase 1: Used to assign default spaceId to new projects/wiki pages.
 * Requires an ownerId (workspace admin/owner user ID).
 */
export async function getOrCreateTeamSpace(workspaceId: string, ownerId: string): Promise<string | null> {
  try {
    // Try to find existing team (non-personal) space
    const teamSpace = await prisma.space.findFirst({
      where: {
        workspaceId,
        isPersonal: false,
      },
      select: { id: true }
    })

    if (teamSpace) {
      return teamSpace.id
    }

    // Create team space if it doesn't exist
    try {
      const created = await prisma.space.create({
        data: {
          workspaceId,
          name: 'Team Space',
          description: 'Default team space for all workspace members',
          isPersonal: false,
          visibility: SpaceVisibility.PUBLIC,
          ownerId,
        },
        select: { id: true }
      })
      return created.id
    } catch (error: unknown) {
      // Handle race condition: if another request created it, fetch it
      if ((error as { code?: string }).code === 'P2002') {
        const existing = await prisma.space.findFirst({
          where: { workspaceId, isPersonal: false },
          select: { id: true }
        })
        if (existing) {
          return existing.id
        }
      }
      throw error
    }
  } catch (error: unknown) {
    // If Space table doesn't exist (migration not run), return null
    const e = error as { code?: string; message?: string }
    if (e.code === 'P2021' || e.message?.includes('does not exist')) {
      console.warn('Space table does not exist. Migration may not have been run. Returning null (legacy mode).')
      return null
    }
    throw error
  }
}

/**
 * Get or create canonical PERSONAL space for a user in a workspace.
 * Phase 1: Used to assign spaceId to personal wiki pages.
 */
export async function getOrCreatePersonalSpace(
  workspaceId: string,
  userId: string
): Promise<string | null> {
  try {
    // Try to find existing PERSONAL space
    const personalSpace = await prisma.space.findFirst({
      where: {
        workspaceId,
        isPersonal: true,
        ownerId: userId,
      },
      select: { id: true }
    })

    if (personalSpace) {
      return personalSpace.id
    }

    // Create PERSONAL space if it doesn't exist
    try {
      const created = await prisma.space.create({
        data: {
          workspaceId,
          name: 'Personal Space',
          description: 'Personal space for user',
          isPersonal: true,
          visibility: SpaceVisibility.PERSONAL,
          ownerId: userId,
        },
        select: { id: true }
      })
      return created.id
    } catch (error: unknown) {
      // Handle race condition
      if ((error as { code?: string }).code === 'P2002') {
        const existing = await prisma.space.findFirst({
          where: { workspaceId, isPersonal: true, ownerId: userId },
          select: { id: true }
        })
        if (existing) {
          return existing.id
        }
      }
      throw error
    }
  } catch (error: unknown) {
    // If Space table doesn't exist (migration not run), return null
    const e = error as { code?: string; message?: string }
    if (e.code === 'P2021' || e.message?.includes('does not exist')) {
      console.warn('Space table does not exist. Migration may not have been run. Returning null (legacy mode).')
      return null
    }
    throw error
  }
}
