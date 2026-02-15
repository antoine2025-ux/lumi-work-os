import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'

// ============================================================================
// Schemas
// ============================================================================

const UpdateReviewSchema = z.object({
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED']).optional(),
  goalScores: z.record(z.string(), z.number()).optional(),
  overallScore: z.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  nextGoals: z.string().optional(),
  goalIds: z.array(z.string()).optional(),
})

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

    // Only manager or admin can update
    if (existing.managerId !== auth.user.userId) {
      await assertAccess({
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        scope: 'workspace',
        requireRole: ['ADMIN', 'OWNER'],
      })
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
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, request)
  }
}
