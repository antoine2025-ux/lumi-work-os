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

    // Enhance metadata with task counts, description, and slack channels
    contextObject.metadata = {
      ...contextObject.metadata,
      description: project.description || undefined,
      tasksTotal,
      tasksDone,
    }
  }

  return contextObject
}

