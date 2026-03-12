import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { GoalLevel, GoalStatus } from '@prisma/client'
import { syncGoalContext } from '@/lib/goals/loopbrain-integration'
import { CreateGoalSchema } from '@/lib/validations/goals'

// ============================================================================
// GET /api/goals - List goals with filters
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const url = new URL(request.url)
    const level = url.searchParams.get('level') as GoalLevel | null
    const quarter = url.searchParams.get('quarter')
    const ownerId = url.searchParams.get('ownerId')
    const status = url.searchParams.get('status') as GoalStatus | null

    const where: any = {
      workspaceId: auth.workspaceId,
    }

    if (level) where.level = level
    if (quarter) where.quarter = quarter
    if (ownerId) where.ownerId = ownerId
    if (status) where.status = status

    const goals = await prisma.goal.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        objectives: {
          include: {
            keyResults: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        linkedProjects: {
          include: {
            project: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        parent: {
          select: { id: true, title: true },
        },
        children: {
          select: { id: true, title: true, level: true, progress: true },
        },
      },
      orderBy: [
        { level: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json(goals)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/goals - Create a new goal
// ============================================================================

export async function POST(request: NextRequest) {
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
    const data = CreateGoalSchema.parse(body)

    // Check permissions for goal level
    if (data.level === 'COMPANY') {
      await assertAccess({
        userId: auth.user.userId,
        workspaceId: auth.workspaceId,
        scope: 'workspace',
        requireRole: ['ADMIN', 'OWNER'],
      })
    }

    const goal = await prisma.$transaction(async (tx) => {
      // Create goal
      const newGoal = await tx.goal.create({
        data: {
          workspaceId: auth.workspaceId,
          title: data.title,
          description: data.description,
          level: data.level,
          ownerId: data.ownerId || auth.user.userId,
          parentId: data.parentId,
          period: data.period,
          startDate: data.startDate,
          endDate: data.endDate,
          quarter: data.quarter,
          createdById: auth.user.userId,
          status: 'DRAFT',
        },
        include: {
          owner: { select: { id: true, name: true } },
        },
      })

      // Create objectives and key results
      if (data.objectives) {
        for (const objData of data.objectives) {
          const objective = await tx.objective.create({
            data: {
              goalId: newGoal.id,
              workspaceId: auth.workspaceId,
              title: objData.title,
              description: objData.description,
              weight: objData.weight,
            },
          })

          if (objData.keyResults) {
            await tx.keyResult.createMany({
              data: objData.keyResults.map(kr => ({
                objectiveId: objective.id,
                workspaceId: auth.workspaceId,
                title: kr.title,
                description: kr.description,
                metricType: kr.metricType,
                targetValue: kr.targetValue,
                unit: kr.unit,
                dueDate: kr.dueDate,
              })),
            })
          }
        }
      }

      // Fetch complete goal with all relations
      return await tx.goal.findUnique({
        where: { id: newGoal.id },
        include: {
          owner: { select: { id: true, name: true } },
          objectives: {
            include: {
              keyResults: true,
            },
          },
        },
      })
    })

    // Log activity
    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goal!.id,
        action: 'CREATED',
        meta: {
          title: goal!.title,
          level: goal!.level,
        },
      },
    })

    // Sync to Loopbrain context store
    syncGoalContext(goal!.id).catch(err =>
      console.error('Failed to sync goal to Loopbrain:', err)
    )

    return NextResponse.json(goal, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
