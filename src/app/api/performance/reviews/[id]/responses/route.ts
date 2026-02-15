import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { BulkSaveResponsesSchema } from '@/lib/validations/performance'

// ============================================================================
// GET /api/performance/reviews/[id]/responses - All responses for a review
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

    // Verify review exists and belongs to workspace
    const review = await prisma.performanceReview.findFirst({
      where: { id, workspaceId: auth.workspaceId },
      select: { id: true },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    const responses = await prisma.reviewResponse.findMany({
      where: {
        reviewId: id,
        workspaceId: auth.workspaceId,
      },
      include: {
        question: {
          select: { id: true, text: true, type: true, sortOrder: true, isRequired: true },
        },
      },
      orderBy: { question: { sortOrder: 'asc' } },
    })

    return NextResponse.json(responses)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PUT /api/performance/reviews/[id]/responses - Bulk upsert responses (auto-save)
// ============================================================================

export async function PUT(
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
    const { responses } = BulkSaveResponsesSchema.parse(body)

    // Verify review exists and user has access
    const review = await prisma.performanceReview.findFirst({
      where: { id, workspaceId: auth.workspaceId },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Access control: employee for self-review, manager for manager-review, admin for any
    const isEmployee = review.employeeId === auth.user.userId
    const isManager = review.managerId === auth.user.userId
    const isSelfReview = review.reviewerRole === 'SELF'

    if (isSelfReview && !isEmployee) {
      await assertAccess({
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        scope: 'workspace',
        requireRole: ['ADMIN', 'OWNER'],
      })
    } else if (!isSelfReview && !isManager) {
      await assertAccess({
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        scope: 'workspace',
        requireRole: ['ADMIN', 'OWNER'],
      })
    }

    // Don't allow edits to finalized reviews
    if (['FINALIZED', 'COMPLETED'].includes(review.status)) {
      return NextResponse.json(
        { error: 'Cannot modify responses on a finalized review' },
        { status: 400 }
      )
    }

    // Bulk upsert responses
    const upserted = await prisma.$transaction(
      responses.map((resp) =>
        prisma.reviewResponse.upsert({
          where: {
            reviewId_questionId: {
              reviewId: id,
              questionId: resp.questionId,
            },
          },
          create: {
            reviewId: id,
            questionId: resp.questionId,
            workspaceId: auth.workspaceId,
            rating: resp.rating ?? null,
            text: resp.text ?? null,
          },
          update: {
            rating: resp.rating ?? null,
            text: resp.text ?? null,
          },
        })
      )
    )

    return NextResponse.json(upserted)
  } catch (error) {
    return handleApiError(error, request)
  }
}
