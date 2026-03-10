import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { updateGoalProgress } from '@/lib/goals/progress'
import { UpdateProgressSchema } from '@/lib/validations/goals'

// ============================================================================
// POST /api/goals/[goalId]/progress - Update key result progress
// ============================================================================

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
    const data = UpdateProgressSchema.parse(body)

    // Verify goal exists and belongs to workspace
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        workspaceId: auth.workspaceId,
      },
    })

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    // Update key result in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Verify key result belongs to this goal
      const keyResult = await tx.keyResult.findUnique({
        where: { id: data.keyResultId },
        include: {
          objective: {
            include: {
              goal: {
                select: { id: true },
              },
            },
          },
        },
      })

      if (!keyResult || keyResult.objective.goal.id !== goalId) {
        throw new Error('Key result not found or does not belong to this goal')
      }

      const previousValue = keyResult.currentValue
      const progress = Math.min((data.newValue / keyResult.targetValue) * 100, 100)
      const status = progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED'

      // Update key result
      const updatedKeyResult = await tx.keyResult.update({
        where: { id: data.keyResultId },
        data: {
          currentValue: data.newValue,
          progress,
          status,
        },
      })

      // Log the update
      await tx.keyResultUpdate.create({
        data: {
          keyResultId: data.keyResultId,
          workspaceId: auth.workspaceId,
          previousValue,
          newValue: data.newValue,
          note: data.note,
          updatedById: auth.user.userId,
        },
      })

      return { updatedKeyResult, previousValue }
    })

    // Recalculate goal progress (outside transaction)
    await updateGoalProgress(goalId)

    // Log activity
    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'PROGRESS_UPDATED',
        meta: {
          keyResultId: data.keyResultId,
          previousValue: result.previousValue,
          newValue: data.newValue,
          note: data.note,
        },
      },
    })

    // Log goal update
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'KEY_RESULT_UPDATED',
        content: data.note || 'Key result updated',
        previousData: { value: result.previousValue },
        newData: { value: data.newValue },
        authorId: auth.user.userId,
      },
    })

    return NextResponse.json(result.updatedKeyResult)
  } catch (error) {
    return handleApiError(error, request)
  }
}
