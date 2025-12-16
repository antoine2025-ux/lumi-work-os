/**
 * Project Context Source
 * 
 * Builds UnifiedContextObject for projects to be stored in Loopbrain context store.
 * Used for project-level context integration with Loopbrain.
 */

import { prisma } from '@/lib/db'
import { ContextObject as UnifiedContextObject } from '@/lib/context/context-types'
import { projectToContext } from '@/lib/context/context-builders'
import { Prisma } from '@prisma/client'
import { groupConsecutiveCodeBlocks } from '@/lib/wiki/content-processor'

/**
 * Project with minimal relations needed for context building
 */
export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    owner: {
      select: {
        id: true
        name: true
        email: true
      }
    }
    documentationLinks: {
      include: {
        wikiPage: {
          select: {
            id: true
            title: true
            slug: true
            workspace_type: true
            updatedAt: true
            content: true // Include full content for Loopbrain
          }
        }
      }
    }
    _count: {
      select: {
        tasks: true
      }
    }
  }
}> & {
  workspaceId: string
  name: string
  description: string | null
  status: string
  priority: string
  startDate: Date | null
  endDate: Date | null
}

/**
 * Build UnifiedContextObject for a project
 * 
 * @param project - Project with relations
 * @returns UnifiedContextObject representing the project
 */
export function buildProjectContext(project: ProjectWithRelations): UnifiedContextObject {
  // Use the existing projectToContext builder
  const contextObject = projectToContext(project, {
    owner: project.owner || null,
    team: null // Team is stored as string, not a relation
  })

  // Add task counts to metadata if available
  if (project._count) {
    const tasksTotal = project._count.tasks || 0
    
    // Count tasks by status if we have tasks loaded
    let tasksDone = 0
    if ('tasks' in project && Array.isArray(project.tasks)) {
      tasksDone = project.tasks.filter((task: { status: string }) => task.status === 'DONE').length
    }

    // Build documentation array from attached docs
    // Process content to group consecutive code blocks for complete context
    const documentation = project.documentationLinks?.map(link => {
      // Process content to merge consecutive code blocks
      let processedContent = link.wikiPage.content || ''
      if (processedContent) {
        processedContent = groupConsecutiveCodeBlocks(processedContent)
      }
      
      return {
        id: link.id,
        wikiPageId: link.wikiPage.id,
        title: link.wikiPage.title,
        slug: link.wikiPage.slug,
        workspaceType: link.wikiPage.workspace_type,
        updatedAt: link.wikiPage.updatedAt.toISOString(),
        content: processedContent // Include full processed content for Loopbrain
      }
    }) || []

    // Add relations for each attached documentation page
    const docRelations = documentation.map(doc => ({
      type: 'doc' as const,
      id: doc.wikiPageId,
      label: doc.title,
      direction: 'out' as const
    }))

    // Enhance metadata with task counts, description, and documentation
    contextObject.metadata = {
      ...contextObject.metadata,
      description: project.description || undefined,
      tasksTotal,
      tasksDone,
      documentation: documentation.length > 0 ? documentation : undefined
    }

    // Add documentation relations to context object
    contextObject.relations = [
      ...(contextObject.relations || []),
      ...docRelations
    ]
  }

  return contextObject
}

