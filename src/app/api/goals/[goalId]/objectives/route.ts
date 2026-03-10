import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { updateGoalProgress } from '@/lib/goals/progress'
import { syncGoalContext } from '@/lib/goals/loopbrain-integration'
import { CreateObjectiveSchema, UpdateObjectiveSchema } from '@/lib/validations/goals'

// ============================================================================
// POST /api/goals/[goalId]/objectives - Create objective with key results
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = CreateObjectiveSchema.parse(body)

    const { goalId } = await params

    // Verify goal exists and user has access
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      select: { id: true, title: true, workspaceId: true },
    })

    if (!goal || goal.workspaceId !== auth.workspaceId) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    // Create objective with key results in transaction
    const objective = await prisma.$transaction(async (tx) => {
      const newObjective = await tx.objective.create({
        data: {
          title: data.title,
          description: data.description,
          weight: data.weight,
          goalId: goalId,
          workspaceId: auth.workspaceId,
          keyResults: {
            create: data.keyResults.map(kr => ({
              title: kr.title,
              description: kr.description,
              metricType: kr.metricType,
              targetValue: kr.targetValue,
              currentValue: kr.currentValue,
              unit: kr.unit,
              dueDate: kr.dueDate,
              workspaceId: auth.workspaceId,
            })),
          },
        },
        include: {
          keyResults: true,
        },
      })

      // Log activity
      await tx.activity.create({
        data: {
          workspaceId: auth.workspaceId,
          actorId: auth.user.userId,
          entity: 'objective',
          entityId: newObjective.id,
          action: 'created',
          meta: {
            goalId: goalId,
            goalTitle: goal.title,
            objectiveTitle: newObjective.title,
            keyResultCount: data.keyResults.length,
          },
        },
      })

      // Log goal update
      await tx.goalUpdate.create({
        data: {
          goalId: goalId,
          workspaceId: auth.workspaceId,
          authorId: auth.user.userId,
          updateType: 'OBJECTIVE_ADDED',
          content: `Added objective: ${newObjective.title}`,
        },
      })

      return newObjective
    })

    // Recalculate goal progress
    await updateGoalProgress(goalId)

    // Sync to Loopbrain context store
    syncGoalContext(goalId).catch(err =>
      console.error('Failed to sync goal to Loopbrain:', err)
    )

    return NextResponse.json(objective, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

// ============================================================================
// PATCH /api/goals/[goalId]/objectives - Update objective
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = UpdateObjectiveSchema.parse(body)

    const { goalId } = await params

    // Verify objective exists and belongs to this goal
    const existing = await prisma.objective.findUnique({
      where: { id: data.objectiveId },
      select: { id: true, goalId: true, title: true },
    })

    if (!existing || existing.goalId !== goalId) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      )
    }

    const objective = await prisma.$transaction(async (tx) => {
      const updated = await tx.objective.update({
        where: { id: data.objectiveId },
        data: {
          title: data.title,
          description: data.description,
          weight: data.weight,
        },
        include: {
          keyResults: true,
        },
      })

      // Log activity
      await tx.activity.create({
        data: {
          workspaceId: auth.workspaceId,
          actorId: auth.user.userId,
          entity: 'objective',
          entityId: updated.id,
          action: 'updated',
          meta: {
            goalId: goalId,
            changes: data,
          },
        },
      })

      // Log goal update
      await tx.goalUpdate.create({
        data: {
          goalId: goalId,
          workspaceId: auth.workspaceId,
          authorId: auth.user.userId,
          updateType: 'OBJECTIVE_UPDATED',
          content: `Updated objective: ${updated.title}`,
        },
      })

      return updated
    })

    return NextResponse.json(objective)
  } catch (error) {
    return handleApiError(error)
  }
}

// ============================================================================
// DELETE /api/goals/[goalId]/objectives - Delete objective
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const url = new URL(request.url)
    const objectiveId = url.searchParams.get('objectiveId')

    if (!objectiveId) {
      return NextResponse.json(
        { error: 'objectiveId is required' },
        { status: 400 }
      )
    }

    const { goalId } = await params

    // Verify objective exists and belongs to this goal
    const existing = await prisma.objective.findUnique({
      where: { id: objectiveId },
      select: { id: true, goalId: true, title: true },
    })

    if (!existing || existing.goalId !== goalId) {
      return NextResponse.json(
        { error: 'Objective not found' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Delete objective (key results cascade)
      await tx.objective.delete({
        where: { id: objectiveId },
      })

      // Log activity
      await tx.activity.create({
        data: {
          workspaceId: auth.workspaceId,
          actorId: auth.user.userId,
          entity: 'objective',
          entityId: objectiveId,
          action: 'deleted',
          meta: {
            goalId: goalId,
            objectiveTitle: existing.title,
          },
        },
      })

      // Log goal update
      await tx.goalUpdate.create({
        data: {
          goalId: goalId,
          workspaceId: auth.workspaceId,
          authorId: auth.user.userId,
          updateType: 'OBJECTIVE_REMOVED',
          content: `Removed objective: ${existing.title}`,
        },
      })
    })

    // Recalculate goal progress
    await updateGoalProgress(goalId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
