/**
 * Create Extracted Tasks
 *
 * Server-side bulk creation of tasks confirmed via MeetingTaskReview.
 * All creation happens through Prisma — no client-side API calls.
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { ExtractedTask } from './meeting-task-extraction'
import { Priority } from '@prisma/client'

// ---------------------------------------------------------------------------
// Priority mapping
// ---------------------------------------------------------------------------

const PRIORITY_MAP: Record<ExtractedTask['priority'], Priority> = {
  urgent: Priority.URGENT,
  high: Priority.HIGH,
  medium: Priority.MEDIUM,
  low: Priority.LOW,
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Create confirmed tasks in the database.
 *
 * Tasks without a `projectSuggestion.projectId` are skipped (returned in
 * `failed` count). This is by design — orphaned tasks are not allowed.
 */
export async function createExtractedTasks(
  tasks: ExtractedTask[],
  workspaceId: string,
  createdByUserId: string,
  options?: { wikiPageId?: string }
): Promise<{ created: number; failed: number; taskIds: string[] }> {
  const taskIds: string[] = []
  let failed = 0

  for (const task of tasks) {
    const { projectId } = task.projectSuggestion

    if (!projectId) {
      logger.warn('Skipping extracted task — no projectId resolved', {
        workspaceId,
        taskTitle: task.title,
      })
      failed++
      continue
    }

    const assigneeId =
      task.assigneeSuggestion.personId &&
      task.assigneeSuggestion.confidence !== 'low'
        ? task.assigneeSuggestion.personId
        : null

    const dueDate = task.deadlineSuggestion.date
      ? new Date(task.deadlineSuggestion.date)
      : null

    // Build description — append wiki page reference if provided
    let description = task.description ?? null
    if (options?.wikiPageId && description) {
      description = `${description}\n\nSource: wiki page ${options.wikiPageId}`
    } else if (options?.wikiPageId && !description) {
      description = `Source: wiki page ${options.wikiPageId}`
    }

    try {
      const created = await prisma.task.create({
        data: {
          workspaceId,
          projectId,
          title: task.title,
          description,
          priority: PRIORITY_MAP[task.priority] ?? Priority.MEDIUM,
          ...(assigneeId && { assigneeId }),
          ...(dueDate && { dueDate }),
          createdById: createdByUserId,
          tags: [],
        },
        select: { id: true },
      })
      taskIds.push(created.id)
    } catch (error: unknown) {
      logger.error('Failed to create extracted task', {
        workspaceId,
        taskTitle: task.title,
        projectId,
        error,
      })
      failed++
    }
  }

  logger.info('Extracted tasks created', {
    workspaceId,
    created: taskIds.length,
    failed,
    wikiPageId: options?.wikiPageId,
  })

  return { created: taskIds.length, failed, taskIds }
}
