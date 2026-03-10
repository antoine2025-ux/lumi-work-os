import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { cascadeParentChanges } from '@/lib/goals/cascading'
import { recalculateGoalAnalytics } from '@/lib/goals/analytics-engine'
import { evaluateWorkflowRules } from '@/lib/goals/workflow-engine'
import { AdjustTimelineSchema } from '@/lib/validations/goals'

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
    const data = AdjustTimelineSchema.parse(body)

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true, title: true, endDate: true, workspaceId: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const previousEndDate = goal.endDate

    // Update goal timeline
    await prisma.goal.update({
      where: { id: goalId },
      data: { endDate: data.newEndDate },
    })

    // Cascade to children
    const cascadeResult = await cascadeParentChanges(goalId, {
      endDate: data.newEndDate,
    })

    // Log activity
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'STATUS_CHANGE',
        content: `Timeline adjusted: ${previousEndDate.toLocaleDateString()} → ${data.newEndDate.toLocaleDateString()}${data.reason ? ` (${data.reason})` : ''}`,
        authorId: auth.user.userId,
        previousData: { endDate: previousEndDate.toISOString() },
        newData: { endDate: data.newEndDate.toISOString(), reason: data.reason },
      },
    })

    // Create audit trail
    await prisma.goalProgressUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        triggeredBy: 'agent_action',
        sourceId: `timeline:${previousEndDate.toISOString()}:${data.newEndDate.toISOString()}`,
        previousProgress: 0,
        newProgress: 0,
        confidence: 0.85,
        updatedById: auth.user.userId,
      },
    })

    // Recalculate analytics
    await recalculateGoalAnalytics(goalId)

    // Evaluate workflow rules
    await evaluateWorkflowRules({
      goalId,
      workspaceId: goal.workspaceId,
      trigger: 'DEADLINE_APPROACHING',
      data: {
        newEndDate: data.newEndDate.toISOString(),
        previousEndDate: previousEndDate.toISOString(),
      },
    })

    const affectedEntities = [
      { type: 'goal', id: goalId },
      ...cascadeResult.affectedGoalIds.map(id => ({ type: 'goal', id })),
    ]

    return NextResponse.json({
      success: true,
      action: 'adjust_timeline',
      impact: {
        previousEndDate: previousEndDate.toISOString(),
        newEndDate: data.newEndDate.toISOString(),
        childGoalsAffected: cascadeResult.affectedGoalIds.length,
        reason: data.reason,
      },
      affectedEntities,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
