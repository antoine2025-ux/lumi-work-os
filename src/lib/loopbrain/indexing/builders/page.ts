/**
 * Page Index Builder
 * 
 * Fetches a wiki page and builds a ContextObject for indexing.
 */

import { PrismaClient } from '@prisma/client'
import { ContextObject } from '@/lib/context/context-types'
import { pageToContext } from '@/lib/context/context-builders'

export interface BuildContextObjectParams {
  workspaceId: string
  entityId: string
  userId?: string
  prisma: PrismaClient
}

/**
 * Build ContextObject for a page
 * 
 * @param params - Build parameters
 * @returns ContextObject or null if not found
 */
export async function buildContextObjectForPage(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params

  try {
    // Fetch page with relations
    const page = await prisma.wikiPage.findFirst({
      where: {
        id: entityId,
        workspaceId, // Enforce workspace scoping
      },
      include: {
        createdBy: true,
        projects: true,
      },
    })

    if (!page) {
      return null
    }

    // Build ContextObject using existing builder
    // Use first project if available
    const project = page.projects && page.projects.length > 0 ? page.projects[0] : null
    const contextObject = pageToContext(page, {
      project: project || undefined,
    })

    // Ensure workspaceId is set
    return {
      ...contextObject,
      workspaceId,
    }
  } catch (error) {
    console.error('Failed to build page context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

