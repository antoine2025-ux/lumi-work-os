/**
 * Task Index Builder
 * 
 * Fetches a task and builds a ContextObject for indexing.
 */

import { PrismaClient } from '@prisma/client'
import { ContextObject } from '@/lib/context/context-types'
import { taskToContext } from '@/lib/context/context-builders'

export interface BuildContextObjectParams {
  workspaceId: string
  entityId: string
  userId?: string
  prisma: PrismaClient
}

/**
 * Build ContextObject for a task
 * 
 * @param params - Build parameters
 * @returns ContextObject or null if not found
 */
export async function buildContextObjectForTask(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params

  try {
    // Fetch task with relations
    const task = await prisma.task.findFirst({
      where: {
        id: entityId,
        workspaceId, // Enforce workspace scoping
      },
      include: {
        project: true,
        assignee: true,
      },
    })

    if (!task) {
      return null
    }

    // Build ContextObject using existing builder
    const contextObject = taskToContext(task, {
      project: task.project,
    })

    // Ensure workspaceId is set
    return {
      ...contextObject,
      workspaceId,
    }
  } catch (error) {
    console.error('Failed to build task context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

