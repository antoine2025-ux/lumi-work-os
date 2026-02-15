/**
 * Goals Loopbrain Integration
 * 
 * Integrates Goals/OKRs with Loopbrain for contextual AI assistance.
 */

import { prisma } from '@/lib/db'
import { saveContextItem } from '@/lib/loopbrain/store/context-repository'
import { ContextType, GoalContext } from '@/lib/loopbrain/context-types'

// ============================================================================
// Types
// ============================================================================

interface GoalForContext {
  id: string
  workspaceId: string
  title: string
  description: string | null
  level: string
  status: string
  progress: number
  period: string
  quarter: string | null
  startDate: Date
  endDate: Date
  owner?: {
    id: string
    name: string | null
  } | null
  objectives?: Array<{
    id: string
    title: string
    progress: number
    keyResults?: Array<{
      id: string
      title: string
      currentValue: number
      targetValue: number
      unit: string | null
      progress: number
    }>
  }>
  linkedProjects?: Array<{
    project: {
      id: string
      name: string
      status: string
    }
  }>
  parent?: {
    id: string
    title: string
  } | null
  children?: Array<{
    id: string
    title: string
    progress: number
  }>
}

interface ActivityParams {
  goalId: string
  action: string
  userId: string
  workspaceId: string
  details?: any
}

// ============================================================================
// Context Sync
// ============================================================================

/**
 * Build GoalContext from goal data
 */
function buildGoalContext(goal: GoalForContext): GoalContext {
  return {
    type: ContextType.GOAL,
    id: goal.id,
    workspaceId: goal.workspaceId,
    timestamp: new Date().toISOString(),
    title: goal.title,
    description: goal.description || undefined,
    level: goal.level,
    status: goal.status,
    progress: goal.progress,
    period: goal.period,
    quarter: goal.quarter || undefined,
    startDate: goal.startDate.toISOString(),
    endDate: goal.endDate.toISOString(),
    owner: goal.owner ? {
      id: goal.owner.id,
      name: goal.owner.name || 'Unknown',
    } : undefined,
    objectives: goal.objectives?.map(obj => ({
      id: obj.id,
      title: obj.title,
      progress: obj.progress,
      keyResults: obj.keyResults?.map(kr => ({
        id: kr.id,
        title: kr.title,
        currentValue: kr.currentValue,
        targetValue: kr.targetValue,
        unit: kr.unit || undefined,
        progress: kr.progress,
      })),
    })),
    linkedProjects: goal.linkedProjects?.map(link => ({
      id: link.project.id,
      name: link.project.name,
      status: link.project.status,
    })),
    parentGoal: goal.parent ? {
      id: goal.parent.id,
      title: goal.parent.title,
    } : undefined,
    childGoals: goal.children?.map(child => ({
      id: child.id,
      title: child.title,
      progress: child.progress,
    })),
  }
}

/**
 * Sync a goal to Loopbrain context store
 */
export async function syncGoalContext(goalId: string): Promise<void> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      objectives: {
        include: {
          keyResults: {
            select: {
              id: true,
              title: true,
              currentValue: true,
              targetValue: true,
              unit: true,
              progress: true,
            },
          },
        },
      },
      linkedProjects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
      parent: {
        select: {
          id: true,
          title: true,
        },
      },
      children: {
        select: {
          id: true,
          title: true,
          progress: true,
        },
      },
    },
  })

  if (!goal) {
    throw new Error(`Goal ${goalId} not found`)
  }

  const context = buildGoalContext(goal)
  await saveContextItem(context)
}

/**
 * Sync multiple goals to Loopbrain context store
 */
export async function syncMultipleGoals(
  workspaceId: string,
  filters?: {
    quarter?: string
    level?: string
    status?: string
  }
): Promise<void> {
  const goals = await prisma.goal.findMany({
    where: {
      workspaceId,
      ...(filters?.quarter && { quarter: filters.quarter }),
      ...(filters?.level && { level: filters.level as any }),
      ...(filters?.status && { status: filters.status as any }),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      objectives: {
        include: {
          keyResults: {
            select: {
              id: true,
              title: true,
              currentValue: true,
              targetValue: true,
              unit: true,
              progress: true,
            },
          },
        },
      },
      linkedProjects: {
        include: {
          project: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      },
      parent: {
        select: {
          id: true,
          title: true,
        },
      },
      children: {
        select: {
          id: true,
          title: true,
          progress: true,
        },
      },
    },
  })

  for (const goal of goals) {
    const context = buildGoalContext(goal)
    await saveContextItem(context)
  }
}

// ============================================================================
// Activity Logging
// ============================================================================

/**
 * Log a goal-related activity
 */
export async function logGoalActivity(params: ActivityParams): Promise<void> {
  await prisma.activity.create({
    data: {
      workspaceId: params.workspaceId,
      actorId: params.userId,
      entity: 'goal',
      entityId: params.goalId,
      action: params.action,
      meta: params.details || {},
    },
  })
}

/**
 * Get recent goal activities for a workspace
 */
export async function getRecentGoalActivities(
  workspaceId: string,
  limit: number = 20
) {
  return await prisma.activity.findMany({
    where: {
      workspaceId,
      entity: 'goal',
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  })
}

// ============================================================================
// Search & Discovery
// ============================================================================

/**
 * Generate searchable tags for a goal
 */
export function generateGoalTags(goal: {
  level: string
  status: string
  period: string
  quarter: string | null
  ownerId: string | null
}): string[] {
  const tags: string[] = [
    `level:${goal.level.toLowerCase()}`,
    `status:${goal.status.toLowerCase()}`,
    `period:${goal.period.toLowerCase()}`,
  ]

  if (goal.quarter) {
    tags.push(`quarter:${goal.quarter.toLowerCase()}`)
  }

  if (goal.ownerId) {
    tags.push(`owner:${goal.ownerId}`)
  }

  return tags
}

/**
 * Build searchable text for a goal
 */
export function buildGoalSearchText(goal: {
  title: string
  description: string | null
  level: string
  status: string
  objectives?: Array<{
    title: string
    keyResults?: Array<{
      title: string
    }>
  }>
}): string {
  const parts: string[] = [
    goal.title,
    goal.description || '',
    goal.level,
    goal.status,
  ]

  if (goal.objectives) {
    goal.objectives.forEach(obj => {
      parts.push(obj.title)
      if (obj.keyResults) {
        obj.keyResults.forEach(kr => parts.push(kr.title))
      }
    })
  }

  return parts.filter(Boolean).join(' ')
}
