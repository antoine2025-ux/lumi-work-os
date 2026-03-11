import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { recalculateGoalAnalytics } from '@/lib/goals/analytics-engine'
import { evaluateWorkflowRules } from '@/lib/goals/workflow-engine'
import { UpdateProgressActionSchema } from '@/lib/validations/goals'

export async function POST(
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

    const body = await request.json()
    const data = UpdateProgressActionSchema.parse(body)

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true, progress: true, workspaceId: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const previousProgress = goal.progress

    // Update goal progress
    await prisma.goal.update({
      where: { id: goalId },
      data: { progress: data.newProgress },
    })

    // Create audit trail
    await prisma.goalProgressUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        triggeredBy: data.triggeredBy,
        sourceId: data.sourceId,
        previousProgress,
        newProgress: data.newProgress,
        confidence: data.confidence,
        updatedById: auth.user.userId,
      },
    })

    // Recalculate analytics
    const analytics = await recalculateGoalAnalytics(goalId)

    // Evaluate workflow rules
    const workflowResults = await evaluateWorkflowRules({
      goalId,
      workspaceId: goal.workspaceId,
      trigger: 'GOAL_AT_RISK',
      data: { riskScore: analytics?.riskScore ?? 0, progress: data.newProgress },
    })

    return NextResponse.json({
      success: true,
      action: 'update_progress',
      impact: {
        previousProgress,
        newProgress: data.newProgress,
        change: data.newProgress - previousProgress,
      },
      affectedEntities: [{ type: 'goal', id: goalId }],
      workflowsTriggered: workflowResults.length,
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
