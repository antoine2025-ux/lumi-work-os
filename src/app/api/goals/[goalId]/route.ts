import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { syncGoalContext } from '@/lib/goals/loopbrain-integration'

// ============================================================================
// Schemas
// ============================================================================

const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  ownerId: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
})

// ============================================================================
// GET /api/goals/[goalId] - Get single goal
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

    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        workspaceId: auth.workspaceId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        objectives: {
          include: {
            keyResults: {
              include: {
                updates: {
                  include: {
                    updatedBy: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                  orderBy: { createdAt: 'desc' },
                  take: 5,
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        linkedProjects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                description: true,
              },
            },
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
            level: true,
            progress: true,
            status: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        updates: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    })

    if (!goal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(goal)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PATCH /api/goals/[goalId] - Update goal
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

    const body = await request.json()
    const data = UpdateGoalSchema.parse(body)

    // Check if goal exists
    const existingGoal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        workspaceId: auth.workspaceId,
      },
    })

    if (!existingGoal) {
      return NextResponse.json(
        { error: 'Goal not found' },
        { status: 404 }
      )
    }

    // Update goal
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
        ...(data.ownerId && { ownerId: data.ownerId }),
        ...(data.startDate && { startDate: data.startDate }),
        ...(data.endDate && { endDate: data.endDate }),
      },
      include: {
        owner: { select: { id: true, name: true } },
        objectives: {
          include: {
            keyResults: true,
          },
        },
      },
    })

    // Log update activity
    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'UPDATED',
        meta: {
          changes: data,
        },
      },
    })

    // Log goal update
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: data.status ? 'STATUS_CHANGE' : 'PROGRESS_UPDATE',
        content: `Goal updated`,
        previousData: existingGoal,
        newData: data,
        authorId: auth.user.userId,
      },
    })

    // Re-sync to Loopbrain context store
    syncGoalContext(goalId).catch(err =>
      console.error('Failed to sync goal to Loopbrain:', err)
    )

    return NextResponse.json(updatedGoal)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// DELETE /api/goals/[goalId] - Delete goal
// ============================================================================

export async function DELETE(
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
      requireRole: ['ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    // Check if goal exists
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

    // Delete goal (cascade will handle related records)
    await prisma.goal.delete({
      where: { id: goalId },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'DELETED',
        meta: {
          title: goal.title,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}
