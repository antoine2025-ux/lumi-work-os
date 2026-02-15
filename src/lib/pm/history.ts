import { prisma } from '@/lib/db'
import { getWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

export interface TaskHistoryEntry {
  taskId: string
  actorId: string
  field: string
  from?: any
  to?: any
  workspaceId?: string
}

/**
 * Log a task history entry for audit trail
 */
export async function logTaskHistory({
  taskId,
  actorId,
  field,
  from,
  to,
  workspaceId
}: TaskHistoryEntry): Promise<void> {
  try {
    const wsId = workspaceId ?? getWorkspaceContext()
    if (!wsId) {
      console.warn('logTaskHistory: no workspaceId available, skipping')
      return
    }
    await prisma.taskHistory.create({
      data: {
        taskId,
        actorId,
        field,
        from: from ? JSON.stringify(from) : undefined,
        to: to ? JSON.stringify(to) : undefined,
        workspaceId: wsId
      }
    })
  } catch (error) {
    console.error('Error logging task history:', error)
    // Don't throw - history logging should not break the main operation
  }
}

/**
 * Log multiple task history entries in a transaction
 */
export async function logTaskHistoryBatch(entries: TaskHistoryEntry[]): Promise<void> {
  try {
    const wsId = getWorkspaceContext()
    if (!wsId) {
      console.warn('logTaskHistoryBatch: no workspaceId available, skipping')
      return
    }
    await prisma.$transaction(
      entries.map(entry =>
        prisma.taskHistory.create({
          data: {
            taskId: entry.taskId,
            actorId: entry.actorId,
            field: entry.field,
            from: entry.from ? JSON.stringify(entry.from) : undefined,
            to: entry.to ? JSON.stringify(entry.to) : undefined,
            workspaceId: entry.workspaceId ?? wsId
          }
        })
      )
    )
  } catch (error) {
    console.error('Error logging task history batch:', error)
    // Don't throw - history logging should not break the main operation
  }
}

/**
 * Get task history for a specific task
 */
export async function getTaskHistory(taskId: string, limit: number = 50) {
  try {
    return await prisma.taskHistory.findMany({
      where: { taskId },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { at: 'desc' },
      take: limit
    })
  } catch (error) {
    console.error('Error fetching task history:', error)
    return []
  }
}
