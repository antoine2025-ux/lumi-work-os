// @ts-nocheck
import { prisma } from '@/lib/db'
import { SpaceType, SpaceVisibility } from '@prisma/client'

/**
 * Get or create canonical TEAM space for a workspace
 * Phase 1: Used to assign default spaceId to new projects/wiki pages
 */
export async function getOrCreateTeamSpace(workspaceId: string): Promise<string | null> {
  try {
    // Try to find existing TEAM space
    const teamSpace = await prisma.space.findFirst({
      where: {
        workspaceId,
        type: SpaceType.TEAM
      },
      select: { id: true }
    })

    if (teamSpace) {
      return teamSpace.id
    }

    // Create TEAM space if it doesn't exist
    try {
      const created = await prisma.space.create({
        data: {
          workspaceId,
          name: 'Team Space',
          description: 'Default team space for all workspace members',
          type: SpaceType.TEAM,
          visibility: SpaceVisibility.PUBLIC,
          ownerId: null
        },
        select: { id: true }
      })
      return created.id
    } catch (error: any) {
      // Handle race condition: if another request created it, fetch it
      if (error.code === 'P2002') {
        const existing = await prisma.space.findFirst({
          where: {
            workspaceId,
            type: SpaceType.TEAM
          },
          select: { id: true }
        })
        if (existing) {
          return existing.id
        }
      }
      throw error
    }
  } catch (error: any) {
    // If Space table doesn't exist (migration not run), return null
    // This allows the code to work without canonical Spaces (legacy mode)
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('Space table does not exist. Migration may not have been run. Returning null (legacy mode).')
      return null
    }
    throw error
  }
}

/**
 * Get or create canonical PERSONAL space for a user in a workspace
 * Phase 1: Used to assign spaceId to personal wiki pages
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
        type: SpaceType.PERSONAL,
        ownerId: userId
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
          description: `Personal space for user`,
          type: SpaceType.PERSONAL,
          visibility: SpaceVisibility.PRIVATE,
          ownerId: userId
        },
        select: { id: true }
      })
      return created.id
    } catch (error: any) {
      // Handle race condition
      if (error.code === 'P2002') {
        const existing = await prisma.space.findFirst({
          where: {
            workspaceId,
            type: SpaceType.PERSONAL,
            ownerId: userId
          },
          select: { id: true }
        })
        if (existing) {
          return existing.id
        }
      }
      throw error
    }
  } catch (error: any) {
    // If Space table doesn't exist (migration not run), return null
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('Space table does not exist. Migration may not have been run. Returning null (legacy mode).')
      return null
    }
    throw error
  }
}
