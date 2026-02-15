import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { recalculateGoalAnalytics } from '@/lib/goals/analytics-engine'

// ============================================================================
// GET /api/goals/[goalId]/analytics - Get latest analytics for a goal
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
    const refresh = searchParams.get('refresh') === 'true'

    // If refresh requested, recalculate
    if (refresh) {
      const freshAnalytics = await recalculateGoalAnalytics(goalId)
      return NextResponse.json(freshAnalytics)
    }

    // Return latest analytics
    const analytics = await prisma.goalAnalytics.findMany({
      where: { goalId },
      orderBy: { calculatedAt: 'desc' },
      take: 1,
    })

    if (analytics.length === 0) {
      // No analytics yet - compute fresh
      const freshAnalytics = await recalculateGoalAnalytics(goalId)
      return NextResponse.json(freshAnalytics)
    }

    return NextResponse.json(analytics[0])
  } catch (error) {
    return handleApiError(error, request)
  }
}
