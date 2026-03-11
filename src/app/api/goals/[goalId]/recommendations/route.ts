import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { UpdateRecommendationSchema } from '@/lib/validations/goals'

// ============================================================================
// GET /api/goals/[goalId]/recommendations - List recommendations
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const where: Record<string, unknown> = { goalId }
    if (status) where.status = status
    if (priority) where.priority = priority

    const recommendations = await prisma.goalRecommendation.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(recommendations)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PATCH /api/goals/[goalId]/recommendations - Update recommendation status
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const url = new URL(request.url)
    const recId = url.searchParams.get('recId')

    if (!recId) {
      return NextResponse.json(
        { error: 'recId query parameter is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = UpdateRecommendationSchema.parse(body)

    const recommendation = await prisma.goalRecommendation.findFirst({
      where: { id: recId, goalId },
    })

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.goalRecommendation.update({
      where: { id: recId },
      data: {
        status: data.status,
        feedback: data.feedback,
        ...(data.status === 'COMPLETED' && { implementedAt: new Date() }),
      },
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
