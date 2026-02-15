/**
 * Performance Data Server Layer
 *
 * Server-side data fetching for Performance Reviews with React.cache.
 * Follows the pattern from src/lib/goals/data.server.ts
 */

import { cache } from 'react'
import { prisma } from '@/lib/db'
import { CycleStatus, ReviewerRole, ReviewStatus } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

export interface CycleFilters {
  status?: CycleStatus
}

export interface CycleWithStats {
  id: string
  workspaceId: string
  name: string
  description: string | null
  status: CycleStatus
  reviewType: string
  startDate: Date
  endDate: Date
  dueDate: Date
  createdAt: Date
  createdBy: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  _count: {
    questions: number
    reviews: number
  }
  stats: {
    totalReviews: number
    submittedOrBeyond: number
    finalized: number
    completionPercent: number
  }
}

export interface ReviewForUser {
  id: string
  employeeId: string
  managerId: string
  period: string
  status: ReviewStatus
  reviewerRole: ReviewerRole
  cycleId: string | null
  overallScore: number | null
  createdAt: Date
  updatedAt: Date
  employee: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  manager: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  cycle: {
    id: string
    name: string
    status: CycleStatus
    reviewType: string
    dueDate: Date
  } | null
}

// ============================================================================
// Cycle queries
// ============================================================================

export const getPerformanceCycles = cache(
  async (workspaceId: string, filters?: CycleFilters): Promise<CycleWithStats[]> => {
    const where: Record<string, unknown> = { workspaceId }
    if (filters?.status) where.status = filters.status

    const cycles = await prisma.performanceCycle.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: { questions: true, reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Enrich with completion stats
    const enriched = await Promise.all(
      cycles.map(async (cycle) => {
        const reviewStats = await prisma.performanceReview.groupBy({
          by: ['status'],
          where: { workspaceId, cycleId: cycle.id },
          _count: true,
        })

        const totalReviews = reviewStats.reduce((sum, s) => sum + s._count, 0)
        const submittedOrBeyond = reviewStats
          .filter((s) =>
            ['SUBMITTED', 'IN_REVIEW', 'FINALIZED', 'COMPLETED'].includes(s.status)
          )
          .reduce((sum, s) => sum + s._count, 0)
        const finalized = reviewStats
          .filter((s) => ['FINALIZED', 'COMPLETED'].includes(s.status))
          .reduce((sum, s) => sum + s._count, 0)

        return {
          ...cycle,
          stats: {
            totalReviews,
            submittedOrBeyond,
            finalized,
            completionPercent:
              totalReviews > 0 ? Math.round((finalized / totalReviews) * 100) : 0,
          },
        }
      })
    )

    return enriched
  }
)

export const getCycleDetail = cache(
  async (cycleId: string, workspaceId: string) => {
    const cycle = await prisma.performanceCycle.findFirst({
      where: { id: cycleId, workspaceId },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
        },
        reviews: {
          include: {
            employee: {
              select: { id: true, name: true, email: true, image: true },
            },
            manager: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    })

    if (!cycle) return null

    // Build participant map
    const participantMap = new Map<
      string,
      {
        employee: { id: string; name: string | null; email: string; image: string | null }
        selfReviewStatus: string | null
        managerReviewStatus: string | null
        selfReviewId: string | null
        managerReviewId: string | null
      }
    >()

    for (const review of cycle.reviews) {
      const key = review.employeeId
      if (!participantMap.has(key)) {
        participantMap.set(key, {
          employee: review.employee,
          selfReviewStatus: null,
          managerReviewStatus: null,
          selfReviewId: null,
          managerReviewId: null,
        })
      }
      const entry = participantMap.get(key)!
      if (review.reviewerRole === 'SELF') {
        entry.selfReviewStatus = review.status
        entry.selfReviewId = review.id
      } else {
        entry.managerReviewStatus = review.status
        entry.managerReviewId = review.id
      }
    }

    const participants = Array.from(participantMap.values())
    const totalReviews = cycle.reviews.length
    const submittedCount = cycle.reviews.filter((r) =>
      ['SUBMITTED', 'IN_REVIEW', 'FINALIZED', 'COMPLETED'].includes(r.status)
    ).length
    const finalizedCount = cycle.reviews.filter((r) =>
      ['FINALIZED', 'COMPLETED'].includes(r.status)
    ).length

    return {
      ...cycle,
      participants,
      stats: {
        totalReviews,
        submittedCount,
        finalizedCount,
        participantCount: participantMap.size,
        completionPercent:
          totalReviews > 0 ? Math.round((finalizedCount / totalReviews) * 100) : 0,
      },
    }
  }
)

// ============================================================================
// Review queries
// ============================================================================

export const getReviewsForUser = cache(
  async (userId: string, workspaceId: string): Promise<ReviewForUser[]> => {
    const reviews = await prisma.performanceReview.findMany({
      where: {
        workspaceId,
        OR: [{ employeeId: userId }, { managerId: userId }],
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
        cycle: {
          select: { id: true, name: true, status: true, reviewType: true, dueDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return reviews
  }
)

export const getReviewDetail = cache(
  async (reviewId: string, workspaceId: string) => {
    const review = await prisma.performanceReview.findFirst({
      where: { id: reviewId, workspaceId },
      include: {
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
        cycle: {
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
        responses: {
          include: {
            question: true,
          },
        },
      },
    })

    if (!review) return null

    // If manager review, also fetch the employee's self-review for reference
    let selfReview = null
    if (review.reviewerRole === 'MANAGER' && review.cycleId) {
      selfReview = await prisma.performanceReview.findFirst({
        where: {
          workspaceId,
          cycleId: review.cycleId,
          employeeId: review.employeeId,
          reviewerRole: 'SELF',
        },
        include: {
          responses: {
            include: { question: true },
          },
        },
      })
    }

    // Fetch linked goals if any
    const linkedGoals =
      review.goalIds.length > 0
        ? await prisma.goal.findMany({
            where: {
              id: { in: review.goalIds },
              workspaceId,
            },
            select: {
              id: true,
              title: true,
              progress: true,
              status: true,
            },
          })
        : []

    return {
      ...review,
      selfReview,
      linkedGoals,
    }
  }
)

// ============================================================================
// Manager queries
// ============================================================================

export const getDirectReportsForReview = cache(
  async (managerId: string, workspaceId: string, cycleId?: string) => {
    // Find direct reports via OrgPosition
    const managerPosition = await prisma.orgPosition.findFirst({
      where: {
        userId: managerId,
        workspaceId,
        isActive: true,
      },
      select: { id: true },
    })

    if (!managerPosition) return []

    const directReports = await prisma.orgPosition.findMany({
      where: {
        parentId: managerPosition.id,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    // Fetch review status for each direct report
    const reportIds = directReports.map((r) => r.userId).filter(Boolean) as string[]

    const reviews = cycleId
      ? await prisma.performanceReview.findMany({
          where: {
            workspaceId,
            cycleId,
            employeeId: { in: reportIds },
          },
          select: {
            id: true,
            employeeId: true,
            reviewerRole: true,
            status: true,
          },
        })
      : []

    return directReports
      .filter((r) => r.userId)
      .map((report) => {
        const selfReview = reviews.find(
          (r) => r.employeeId === report.userId && r.reviewerRole === 'SELF'
        )
        const managerReview = reviews.find(
          (r) => r.employeeId === report.userId && r.reviewerRole === 'MANAGER'
        )

        return {
          employee: report.user!,
          selfReviewId: selfReview?.id ?? null,
          selfReviewStatus: selfReview?.status ?? null,
          managerReviewId: managerReview?.id ?? null,
          managerReviewStatus: managerReview?.status ?? null,
        }
      })
  }
)
