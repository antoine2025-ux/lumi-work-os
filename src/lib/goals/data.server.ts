/**
 * Goals Data Server Layer
 * 
 * Server-side data fetching for Goals & OKRs with React.cache and TTL caching.
 * Follows the pattern from src/lib/org/data.server.ts
 */

import { cache } from 'react'
import { prisma } from '@/lib/db'
import { Goal, GoalLevel, GoalStatus, Prisma } from '@prisma/client'
import { getCurrentQuarter, getAvailableQuarters } from './utils'

// ============================================================================
// Types
// ============================================================================

export interface GoalFilters {
  level?: GoalLevel
  quarter?: string
  status?: GoalStatus
  ownerId?: string
}

export interface GoalWithDetails extends Goal {
  owner: {
    id: string
    name: string | null
    email: string
  } | null
  objectives: Array<{
    id: string
    title: string
    description: string | null
    weight: number
    progress: number
    status: string
    keyResults: Array<{
      id: string
      title: string
      description: string | null
      metricType: string
      targetValue: number
      currentValue: number
      unit: string | null
      progress: number
      status: string
      dueDate: Date | null
    }>
  }>
  linkedProjects: Array<{
    id: string
    project: {
      id: string
      name: string
      status: string
    }
  }>
  parent: {
    id: string
    title: string
  } | null
  children: Array<{
    id: string
    title: string
    level: GoalLevel
    progress: number
  }>
}

export interface GoalMetrics {
  total: number
  byStatus: Record<GoalStatus, number>
  byLevel: Record<GoalLevel, number>
  averageProgress: number
  onTrack: number
  atRisk: number
  completed: number
}

// ============================================================================
// Internal Functions
// ============================================================================

async function _getGoalsData(
  workspaceId: string,
  filters?: GoalFilters
): Promise<GoalWithDetails[]> {
  const where: Prisma.GoalWhereInput = {
    workspaceId,
    ...(filters?.level && { level: filters.level }),
    ...(filters?.quarter && { quarter: filters.quarter }),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.ownerId && { ownerId: filters.ownerId }),
  }

  const goals = await prisma.goal.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      objectives: {
        include: {
          keyResults: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
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
          level: true,
          progress: true,
        },
      },
    },
    orderBy: [
      { level: 'asc' },
      { createdAt: 'desc' },
    ],
  })

  return goals as GoalWithDetails[]
}

async function _getGoalById(
  goalId: string,
  workspaceId: string
): Promise<GoalWithDetails | null> {
  const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        workspaceId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        objectives: {
          include: {
            keyResults: {
              include: {
                updates: {
                  include: {
                    updatedBy: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        linkedProjects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                description: true,
              },
            },
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
            level: true,
            progress: true,
            status: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        updates: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        // Enterprise OKR relations
        stakeholders: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        conflictsWith: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

  return goal as GoalWithDetails | null
}

async function _getGoalMetrics(
  workspaceId: string,
  quarter?: string
): Promise<GoalMetrics> {
  const where: Prisma.GoalWhereInput = {
    workspaceId,
    ...(quarter && { quarter }),
  }

  const goals = await prisma.goal.findMany({
    where,
    select: {
      status: true,
      level: true,
      progress: true,
    },
  })

  const metrics: GoalMetrics = {
    total: goals.length,
    byStatus: {
      DRAFT: 0,
      ACTIVE: 0,
      PAUSED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    },
    byLevel: {
      COMPANY: 0,
      DEPARTMENT: 0,
      TEAM: 0,
      INDIVIDUAL: 0,
    },
    averageProgress: 0,
    onTrack: 0,
    atRisk: 0,
    completed: 0,
  }

  let totalProgress = 0

  goals.forEach((goal) => {
    // Count by status
    metrics.byStatus[goal.status]++
    
    // Count by level
    metrics.byLevel[goal.level]++
    
    // Calculate progress metrics
    totalProgress += goal.progress
    
    if (goal.status === 'COMPLETED') {
      metrics.completed++
    } else if (goal.progress >= 75) {
      metrics.onTrack++
    } else if (goal.progress < 50) {
      metrics.atRisk++
    }
  })

  metrics.averageProgress = goals.length > 0 ? totalProgress / goals.length : 0

  return metrics
}

// ============================================================================
// Exported (Cached) Functions
// ============================================================================

/**
 * Get goals data with optional filters
 * Uses React.cache for request deduplication
 */
export const getGoalsData = cache(_getGoalsData)

/**
 * Get a single goal by ID with full details
 * Uses React.cache for request deduplication
 */
export const getGoalById = cache(_getGoalById)

/**
 * Get aggregated metrics for goals
 * Uses React.cache for request deduplication
 */
export const getGoalMetrics = cache(_getGoalMetrics)

// Re-export client-safe utilities
export { getCurrentQuarter, getAvailableQuarters }
