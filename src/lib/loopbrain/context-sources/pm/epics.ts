/**
 * Epic Context Source
 * 
 * Builds UnifiedContextObject for epics to be stored in Loopbrain context store.
 * Used for epic-level context integration with Loopbrain.
 */

import { ContextObject as UnifiedContextObject } from '@/lib/context/context-types'
import { Prisma } from '@prisma/client'
import { ProjectTaskStatus } from '@prisma/client'

/**
 * Epic with minimal relations needed for context building
 */
export type EpicWithRelations = Prisma.EpicGetPayload<{
  include: {
    project: {
      select: {
        id: true
        name: true
      }
    }
    _count: {
      select: {
        tasks: true
      }
    }
    tasks?: {
      select: {
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
}

/**
 * Build UnifiedContextObject for an epic
 * 
 * @param epic - Epic with relations
 * @returns UnifiedContextObject representing the epic
 */
export function buildEpicContext(epic: EpicWithRelations): UnifiedContextObject {
  // Build relations
  const relations: Array<{
    type: string
    id: string
    label: string
    direction: 'in' | 'out'
  }> = []

  // Relation to project
  if (epic.projectId) {
    relations.push({
      type: 'project',
      id: epic.projectId,
      label: 'project',
      direction: 'out'
    })
  }

  // Build tags
  const tags: string[] = ['epic']
  if (epic.project?.name) {
    tags.push(`project:${epic.project.name.toLowerCase().replace(/\s+/g, '-')}`)
  }

  // Calculate task counts
  const tasksTotal = epic._count?.tasks || 0
  let tasksDone = 0
  if (epic.tasks && Array.isArray(epic.tasks) && epic.tasks.length > 0) {
    tasksDone = epic.tasks.filter((task: { status: string }) => task.status === ProjectTaskStatus.DONE).length
  }

  // Build summary
  const summaryParts: string[] = []
  if (epic.description) {
    summaryParts.push(epic.description.substring(0, 200))
  }
  if (tasksTotal > 0) {
    summaryParts.push(`${tasksTotal} task${tasksTotal !== 1 ? 's' : ''} (${tasksDone} done)`)
  }
  const summary = summaryParts.join('. ') || `Epic: ${epic.title}`

  // Build UnifiedContextObject
  // Use epic:${epic.id} as the id to match the requested contextId format
  return {
    id: `epic:${epic.id}`,
    type: 'epic',
    title: epic.title,
    summary,
    tags,
    ownerId: undefined, // Epics don't have owners
    status: 'active', // Epics don't have status in schema, default to active
    updatedAt: epic.updatedAt,
    relations,
    metadata: {
      id: epic.id,
      projectId: epic.projectId,
      workspaceId: epic.workspaceId,
      title: epic.title,
      description: epic.description || undefined,
      tasksTotal,
      tasksDone,
      color: epic.color || undefined,
      order: epic.order || undefined
    }
  }
}

