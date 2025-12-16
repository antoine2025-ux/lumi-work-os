/**
 * Task Context Source
 * 
 * Builds UnifiedContextObject for tasks to be stored in Loopbrain context store.
 * Used for task-level context integration with Loopbrain.
 */

import { ContextObject as UnifiedContextObject } from '@/lib/context/context-types'
import { Prisma } from '@prisma/client'
import { ProjectTaskStatus } from '@prisma/client'

/**
 * Task with minimal relations needed for context building
 */
export type TaskWithRelations = Prisma.TaskGetPayload<{
  include: {
    project: {
      select: {
        id: true
        name: true
      }
    }
    epic: {
      select: {
        id: true
        title: true
      }
    }
    assignee: {
      select: {
        id: true
        name: true
        email: true
      }
    }
    subtasks: {
      select: {
        id: true
        title: true
        status: true
      }
    }
  }
}> & {
  id: string
  workspaceId: string
  projectId: string
  title: string
  description: string | null
  status: ProjectTaskStatus
  priority: string
  epicId: string | null
  assigneeId: string | null
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Build UnifiedContextObject for a task
 * 
 * @param task - Task with relations
 * @returns UnifiedContextObject representing the task
 */
export function buildTaskContext(task: TaskWithRelations): UnifiedContextObject {
  // Build relations
  const relations: Array<{
    type: string
    id: string
    label: string
    direction: 'in' | 'out'
  }> = []

  // Relation to project
  if (task.projectId) {
    relations.push({
      type: 'project',
      id: task.projectId,
      label: 'project',
      direction: 'out'
    })
  }

  // Relation to epic
  if (task.epicId) {
    relations.push({
      type: 'epic',
      id: task.epicId,
      label: 'epic',
      direction: 'out'
    })
  }

  // Relation to assignee (use 'user' type as requested)
  if (task.assigneeId) {
    relations.push({
      type: 'user',
      id: task.assigneeId,
      label: 'assignee',
      direction: 'out'
    })
  }

  // Build tags
  const tags: string[] = ['task']
  if (task.status) {
    tags.push(`status:${task.status.toLowerCase()}`)
  }
  if (task.priority) {
    tags.push(`priority:${task.priority.toLowerCase()}`)
  }
  if (task.project?.name) {
    tags.push(`project:${task.project.name.toLowerCase().replace(/\s+/g, '-')}`)
  }
  if (task.epic?.title) {
    tags.push(`epic:${task.epic.title.toLowerCase().replace(/\s+/g, '-')}`)
  }

  // Calculate subtask counts
  const subtaskCount = task.subtasks?.length || 0
  const subtaskDoneCount = task.subtasks?.filter((st: { status: string }) => st.status === 'COMPLETED').length || 0

  // Build summary
  const summaryParts: string[] = []
  if (task.description) {
    summaryParts.push(task.description.substring(0, 200))
  }
  if (subtaskCount > 0) {
    summaryParts.push(`${subtaskCount} subtask${subtaskCount !== 1 ? 's' : ''} (${subtaskDoneCount} done)`)
  }
  const summary = summaryParts.join('. ') || `Task: ${task.title}`

  // Build UnifiedContextObject
  // Use task:${task.id} as the id to match the requested contextId format
  return {
    id: `task:${task.id}`,
    type: 'task',
    title: task.title,
    summary,
    tags,
    ownerId: task.assigneeId || undefined,
    status: task.status.toLowerCase(),
    updatedAt: task.updatedAt,
    relations,
    metadata: {
      id: task.id,
      projectId: task.projectId,
      epicId: task.epicId || null,
      epicTitle: task.epic?.title || null,
      assigneeId: task.assigneeId || null,
      workspaceId: task.workspaceId,
      title: task.title,
      description: task.description || undefined,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() || undefined,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      subtaskCount,
      subtaskDoneCount
    }
  }
}

