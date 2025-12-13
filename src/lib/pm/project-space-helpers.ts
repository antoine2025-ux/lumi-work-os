import { prisma } from '@/lib/db'
import { ProjectSpaceVisibility } from '@prisma/client'

/**
 * Get or create the "General" PUBLIC ProjectSpace for a workspace
 * This is the default space where all public projects go
 */
export async function getOrCreateGeneralProjectSpace(workspaceId: string): Promise<string | null> {
  // Check if ProjectSpace table exists (migration may not have run)
  try {
    // Try to find existing General space
    let generalSpace = await prisma.projectSpace.findFirst({
      where: {
        workspaceId,
        name: 'General',
        visibility: ProjectSpaceVisibility.PUBLIC
      },
      select: { id: true }
    })

    if (generalSpace) {
      return generalSpace.id
    }

    // Create General space if it doesn't exist
    try {
      const created = await prisma.projectSpace.create({
        data: {
          workspaceId,
          name: 'General',
          description: 'Default project space for all public projects',
          visibility: ProjectSpaceVisibility.PUBLIC
        },
        select: { id: true }
      })
      return created.id
    } catch (error: any) {
      // Handle race condition: if another request created it, fetch it
      if (error.code === 'P2002') {
        const existing = await prisma.projectSpace.findFirst({
          where: {
            workspaceId,
            name: 'General',
            visibility: ProjectSpaceVisibility.PUBLIC
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
    // If table doesn't exist (migration not run), return null
    // This allows the code to work without ProjectSpace (legacy mode)
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('ProjectSpace table does not exist. Migration may not have been run. Returning null (legacy mode).')
      return null
    }
    throw error
  }
}

/**
 * Create a new TARGETED ProjectSpace for a private project
 */
export async function createPrivateProjectSpace(
  workspaceId: string,
  projectName: string,
  creatorUserId: string,
  memberUserIds: string[] = []
): Promise<string | null> {
  try {
    const spaceName = `Private: ${projectName}`
    
    // Create the targeted ProjectSpace
    const projectSpace = await prisma.projectSpace.create({
      data: {
        workspaceId,
        name: spaceName,
        description: `Private project space for "${projectName}"`,
        visibility: ProjectSpaceVisibility.TARGETED
      }
    })

    // Add creator as member (always included)
    const allMemberIds = [creatorUserId, ...memberUserIds.filter(id => id !== creatorUserId)]
    
    if (allMemberIds.length > 0) {
      await prisma.projectSpaceMember.createMany({
        data: allMemberIds.map(userId => ({
          projectSpaceId: projectSpace.id,
          userId
        })),
        skipDuplicates: true
      })
    }

    return projectSpace.id
  } catch (error: any) {
    // If table doesn't exist (migration not run), return null
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('ProjectSpace table does not exist. Migration may not have been run. Returning null (legacy mode).')
      return null
    }
    throw error
  }
}
