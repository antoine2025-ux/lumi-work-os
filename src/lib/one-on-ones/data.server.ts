/**
 * 1:1 Meetings Data Server Layer
 *
 * Server-side data fetching for 1:1 series, meetings, talking points,
 * and action items with React.cache.
 */

import { cache } from 'react'
import { prisma } from '@/lib/db'
import { MeetingStatus } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

const userSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const

export interface SeriesWithNextMeeting {
  id: string
  workspaceId: string
  managerId: string
  employeeId: string
  frequency: string
  dayOfWeek: number | null
  duration: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  manager: { id: string; name: string | null; email: string; image: string | null }
  employee: { id: string; name: string | null; email: string; image: string | null }
  nextMeeting: {
    id: string
    scheduledAt: Date
    status: MeetingStatus
  } | null
  _count: {
    meetings: number
  }
  openActionItemCount: number
}

export interface MeetingWithDetails {
  id: string
  workspaceId: string
  seriesId: string | null
  employeeId: string
  managerId: string
  scheduledAt: Date
  status: MeetingStatus
  calendarEventId: string | null
  managerNotes: string | null
  employeeNotes: string | null
  sharedNotes: string | null
  goalProgress: unknown
  blockers: string | null
  support: string | null
  nextActions: string | null
  createdAt: Date
  updatedAt: Date
  employee: { id: string; name: string | null; email: string; image: string | null }
  manager: { id: string; name: string | null; email: string; image: string | null }
  talkingPoints: {
    id: string
    content: string
    addedBy: string
    isDiscussed: boolean
    source: string | null
    sourceId: string | null
    sortOrder: number
    createdAt: Date
  }[]
  actionItems: {
    id: string
    content: string
    assigneeId: string
    status: string
    dueDate: Date | null
    createdAt: Date
    updatedAt: Date
  }[]
}

export interface AutoSuggestedPoint {
  content: string
  source: 'GOAL' | 'REVIEW' | 'ACTION_ITEM'
  sourceId: string
}

// ============================================================================
// Series Queries
// ============================================================================

/**
 * Get all 1:1 series for a user (as manager or employee).
 */
export const getSeriesForUser = cache(
  async (userId: string, workspaceId: string): Promise<SeriesWithNextMeeting[]> => {
    const series = await prisma.oneOnOneSeries.findMany({
      where: {
        workspaceId,
        OR: [{ managerId: userId }, { employeeId: userId }],
      },
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
        _count: { select: { meetings: true } },
        meetings: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Get open action item counts per series
    const seriesIds = series.map((s) => s.id)
    const actionItemCounts = seriesIds.length > 0
      ? await prisma.oneOnOneActionItem.groupBy({
          by: ['meetingId'],
          where: {
            workspaceId,
            status: 'OPEN',
            meeting: { seriesId: { in: seriesIds } },
          },
          _count: { id: true },
        })
      : []

    // Map meeting IDs to series IDs for counting
    const meetingToSeries = new Map<string, string>()
    for (const s of series) {
      for (const m of s.meetings) {
        meetingToSeries.set(m.id, s.id)
      }
    }

    // Also get all meetings per series for action item mapping
    const allMeetings = seriesIds.length > 0
      ? await prisma.oneOnOneMeeting.findMany({
          where: { workspaceId, seriesId: { in: seriesIds } },
          select: { id: true, seriesId: true },
        })
      : []

    const meetingIdToSeriesId = new Map<string, string>()
    for (const m of allMeetings) {
      if (m.seriesId) meetingIdToSeriesId.set(m.id, m.seriesId)
    }

    const seriesActionCounts = new Map<string, number>()
    for (const ac of actionItemCounts) {
      const sid = meetingIdToSeriesId.get(ac.meetingId)
      if (sid) {
        seriesActionCounts.set(sid, (seriesActionCounts.get(sid) ?? 0) + ac._count.id)
      }
    }

    return series.map((s) => ({
      id: s.id,
      workspaceId: s.workspaceId,
      managerId: s.managerId,
      employeeId: s.employeeId,
      frequency: s.frequency,
      dayOfWeek: s.dayOfWeek,
      duration: s.duration,
      isActive: s.isActive,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      manager: s.manager,
      employee: s.employee,
      nextMeeting: s.meetings[0] ?? null,
      _count: s._count,
      openActionItemCount: seriesActionCounts.get(s.id) ?? 0,
    }))
  }
)

/**
 * Get a series by ID with meeting history and stats.
 */
export const getSeriesDetail = cache(
  async (seriesId: string, workspaceId: string) => {
    const series = await prisma.oneOnOneSeries.findFirst({
      where: { id: seriesId, workspaceId },
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
        meetings: {
          orderBy: { scheduledAt: 'desc' },
          take: 20,
          include: {
            _count: {
              select: { talkingPoints: true, actionItems: true },
            },
          },
        },
      },
    })

    if (!series) return null

    // Compute stats
    const completedCount = series.meetings.filter(
      (m) => m.status === 'COMPLETED'
    ).length

    // Count completed action items across all meetings
    const actionItemStats = await prisma.oneOnOneActionItem.groupBy({
      by: ['status'],
      where: {
        workspaceId,
        meeting: { seriesId },
      },
      _count: { id: true },
    })

    const totalActions = actionItemStats.reduce((sum, s) => sum + s._count.id, 0)
    const completedActions =
      actionItemStats.find((s) => s.status === 'DONE')?._count.id ?? 0
    const openActions =
      actionItemStats.find((s) => s.status === 'OPEN')?._count.id ?? 0

    return {
      ...series,
      stats: {
        meetingsHeld: completedCount,
        totalMeetings: series.meetings.length,
        totalActionItems: totalActions,
        completedActionItems: completedActions,
        openActionItems: openActions,
      },
    }
  }
)

// ============================================================================
// Meeting Queries
// ============================================================================

/**
 * Get a single meeting with full details.
 */
export const getMeetingDetail = cache(
  async (meetingId: string, workspaceId: string): Promise<MeetingWithDetails | null> => {
    const meeting = await prisma.oneOnOneMeeting.findFirst({
      where: { id: meetingId, workspaceId },
      include: {
        employee: { select: userSelect },
        manager: { select: userSelect },
        talkingPoints: {
          orderBy: { sortOrder: 'asc' },
        },
        actionItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return meeting
  }
)

/**
 * Get upcoming meetings for a user across all series.
 */
export const getUpcomingMeetings = cache(
  async (userId: string, workspaceId: string, limit = 10) => {
    return prisma.oneOnOneMeeting.findMany({
      where: {
        workspaceId,
        OR: [{ managerId: userId }, { employeeId: userId }],
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledAt: { gte: new Date() },
      },
      include: {
        employee: { select: userSelect },
        manager: { select: userSelect },
        series: {
          select: { id: true, frequency: true },
        },
        _count: {
          select: { talkingPoints: true, actionItems: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    })
  }
)

// ============================================================================
// Auto-Suggested Talking Points
// ============================================================================

/**
 * Generate auto-suggested talking points from goals, reviews, and
 * open action items from the previous meeting in a series.
 */
export const getAutoSuggestedPoints = cache(
  async (
    employeeId: string,
    managerId: string,
    workspaceId: string,
    seriesId?: string
  ): Promise<AutoSuggestedPoint[]> => {
    const suggestions: AutoSuggestedPoint[] = []

    // 1. Open action items from previous meeting in the same series
    if (seriesId) {
      const lastCompletedMeeting = await prisma.oneOnOneMeeting.findFirst({
        where: {
          workspaceId,
          seriesId,
          status: 'COMPLETED',
        },
        orderBy: { scheduledAt: 'desc' },
        select: { id: true },
      })

      if (lastCompletedMeeting) {
        const openActions = await prisma.oneOnOneActionItem.findMany({
          where: {
            meetingId: lastCompletedMeeting.id,
            status: 'OPEN',
            workspaceId,
          },
          select: { id: true, content: true },
        })

        for (const action of openActions) {
          suggestions.push({
            content: `Follow up: ${action.content}`,
            source: 'ACTION_ITEM',
            sourceId: action.id,
          })
        }
      }
    }

    // 2. Goals that are at risk or overdue for the employee
    try {
      const atRiskGoals = await prisma.goal.findMany({
        where: {
          workspaceId,
          ownerId: employeeId,
          status: { in: ['ACTIVE', 'PAUSED'] },
        },
        select: { id: true, title: true, status: true },
        take: 5,
      })

      for (const goal of atRiskGoals) {
        suggestions.push({
          content: `Discuss goal "${goal.title}" (${goal.status})`,
          source: 'GOAL',
          sourceId: goal.id,
        })
      }
    } catch {
      // Goals feature may not be fully set up; skip silently
    }

    // 3. Active performance reviews for the employee
    try {
      const activeReviews = await prisma.performanceReview.findMany({
        where: {
          workspaceId,
          employeeId,
          status: { in: ['DRAFT', 'SUBMITTED'] },
        },
        select: { id: true, period: true, status: true },
        take: 3,
      })

      for (const review of activeReviews) {
        suggestions.push({
          content: `Performance review (${review.period}) — status: ${review.status}`,
          source: 'REVIEW',
          sourceId: review.id,
        })
      }
    } catch {
      // Performance feature may not be fully set up; skip silently
    }

    return suggestions
  }
)
