import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { UpdateReviewSchema } from '@/lib/validations/performance'

// ============================================================================
// GET /api/performance/reviews/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const review = await prisma.performanceReview.findFirst({
      where: { id, workspaceId: auth.workspaceId },
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
        responses: true,
      },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    return NextResponse.json(review)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PATCH /api/performance/reviews/[id]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = UpdateReviewSchema.parse(body)

    const existing = await prisma.performanceReview.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Access control:
    // - Employee can edit their own self-review (reviewerRole=SELF && employeeId matches)
    // - Manager can edit manager reviews for their direct reports
    // - ADMIN/OWNER can edit any review
    const isEmployee = existing.employeeId === auth.user.userId
    const isManager = existing.managerId === auth.user.userId
    const isSelfReview = existing.reviewerRole === 'SELF'

    if (isSelfReview && isEmployee) {
      // Employee editing their self-review - allowed
    } else if (!isSelfReview && isManager) {
      // Manager editing manager review - allowed
    } else {
      // Must be ADMIN/OWNER
      await assertAccess({
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        scope: 'workspace',
        requireRole: ['ADMIN', 'OWNER'],
      })
    }

    // Validate status transitions
    if (data.status) {
      const validTransitions: Record<string, string[]> = {
        DRAFT: ['SUBMITTED', 'IN_PROGRESS'],
        IN_PROGRESS: ['SUBMITTED'],
        SUBMITTED: ['IN_REVIEW', 'DRAFT'], // Can be sent back to draft
        IN_REVIEW: ['FINALIZED', 'SUBMITTED'], // Can be sent back
        PENDING_APPROVAL: ['COMPLETED', 'IN_REVIEW'],
        FINALIZED: [], // Terminal for cycle-based reviews
        COMPLETED: [], // Terminal for legacy reviews
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

      // Self-reviews can only go DRAFT → SUBMITTED
      if (isSelfReview && isEmployee && !['DRAFT', 'IN_PROGRESS', 'SUBMITTED'].includes(data.status)) {
        return NextResponse.json(
          { error: 'Employees can only submit self-reviews (DRAFT → SUBMITTED)' },
          { status: 403 }
        )
      }
    }

    // Calculate overall score from goal scores if provided
    let overallScore = data.overallScore
    if (data.goalScores && !overallScore) {
      const scores: number[] = Object.values(data.goalScores)
      if (scores.length > 0) {
        overallScore = scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (data.status) updatePayload.status = data.status
    if (data.goalScores) updatePayload.goalScores = JSON.parse(JSON.stringify(data.goalScores))
    if (overallScore !== undefined) updatePayload.overallScore = overallScore
    if (data.feedback !== undefined) updatePayload.feedback = data.feedback
    if (data.strengths !== undefined) updatePayload.strengths = data.strengths
    if (data.improvements !== undefined) updatePayload.improvements = data.improvements
    if (data.nextGoals !== undefined) updatePayload.nextGoals = data.nextGoals
    if (data.goalIds) updatePayload.goalIds = data.goalIds
    if (data.acknowledgedAt) updatePayload.acknowledgedAt = data.acknowledgedAt

    const updated = await prisma.performanceReview.update({
      where: { id },
      data: updatePayload,
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
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, request)
  }
}
