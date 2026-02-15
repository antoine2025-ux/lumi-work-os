import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { UpdateCycleSchema } from '@/lib/validations/performance'

// ============================================================================
// GET /api/performance/cycles/[cycleId] - Cycle detail with completion stats
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  try {
    const { cycleId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const cycle = await prisma.performanceCycle.findFirst({
      where: { id: cycleId, workspaceId: auth.workspaceId },
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
          orderBy: [{ employee: { name: 'asc' } }, { reviewerRole: 'asc' }],
        },
      },
    })

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    // Compute per-participant stats
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

    return NextResponse.json({
      ...cycle,
      participants,
      stats: {
        totalReviews,
        submittedCount,
        finalizedCount,
        participantCount: participantMap.size,
        completionPercent:
          totalReviews > 0
            ? Math.round((finalizedCount / totalReviews) * 100)
            : 0,
      },
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PATCH /api/performance/cycles/[cycleId] - Update cycle (ADMIN only)
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  try {
    const { cycleId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = UpdateCycleSchema.parse(body)

    const existing = await prisma.performanceCycle.findFirst({
      where: { id: cycleId, workspaceId: auth.workspaceId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    // Validate status transitions
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        SETUP: ['ACTIVE'],
        ACTIVE: ['CLOSED'],
        CLOSED: ['FINALIZED'],
        FINALIZED: [], // terminal
      }

      const allowed = validTransitions[existing.status] ?? []
      if (!allowed.includes(data.status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition: ${existing.status} → ${data.status}`,
          },
          { status: 400 }
        )
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (data.name !== undefined) updatePayload.name = data.name
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.status !== undefined) updatePayload.status = data.status
    if (data.startDate !== undefined) updatePayload.startDate = data.startDate
    if (data.endDate !== undefined) updatePayload.endDate = data.endDate
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate

    const updated = await prisma.performanceCycle.update({
      where: { id: cycleId },
      data: updatePayload,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { reviews: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, request)
  }
}
