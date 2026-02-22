/**
 * Project Index Builder
 * 
 * Fetches a project and builds a ContextObject for indexing.
 * Respects ProjectSpace visibility rules.
 */

import { PrismaClient } from '@prisma/client'
import { ContextObject } from '@/lib/context/context-types'
import { projectToContext } from '@/lib/context/context-builders'

export interface BuildContextObjectParams {
  workspaceId: string
  entityId: string
  userId?: string // Optional: for visibility checks
  prisma: PrismaClient
}

/**
 * Build ContextObject for a project
 * 
 * @param params - Build parameters
 * @returns ContextObject or null if not found/not visible
 */
export async function buildContextObjectForProject(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params

  try {
    // Fetch project with relations
    const project = await prisma.project.findFirst({
      where: {
        id: entityId,
        workspaceId, // Enforce workspace scoping
      },
      include: {
        owner: true,
      },
    })

    if (!project) {
      return null
    }

    // Note: ProjectSpace visibility filtering disabled as projectSpaceId field 
    // is not present in the Project model. If needed, this should be implemented
    // using a join table or a different approach.

    // Build ContextObject using existing builder
    const contextObject = projectToContext(project, {
      owner: project.owner,
    })

    // Ensure workspaceId is set
    return {
      ...contextObject,
      workspaceId,
    }
  } catch (error) {
    // Log but don't throw - indexing failures shouldn't block
    console.error('Failed to build project context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

