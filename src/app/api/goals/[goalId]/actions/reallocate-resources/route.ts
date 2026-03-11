import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { recalculateGoalAnalytics } from '@/lib/goals/analytics-engine'
import { ReallocateResourcesSchema } from '@/lib/validations/goals'

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
      requireRole: ['ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = ReallocateResourcesSchema.parse(body)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true, title: true, workspaceId: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Verify both projects are linked to this goal
    const links = await prisma.projectGoalLink.findMany({
      where: {
        goalId,
        projectId: { in: [data.fromProjectId, data.toProjectId] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    })

    if (links.length < 2) {
      return NextResponse.json(
        { error: 'Both projects must be linked to this goal' },
        { status: 400 }
      )
    }

    // Move allocations
    const allocations = await prisma.projectAllocation.findMany({
      where: { projectId: data.fromProjectId },
      take: data.resourceCount,
    })

    const movedCount = allocations.length
    const affectedEntities: Array<{ type: string; id: string }> = [
      { type: 'goal', id: goalId },
    ]

    for (const allocation of allocations) {
      await prisma.projectAllocation.update({
        where: { id: allocation.id },
        data: { projectId: data.toProjectId },
      })
      affectedEntities.push({ type: 'project_allocation', id: allocation.id })
    }

    // Log activity
    const fromProject = links.find(l => l.project.id === data.fromProjectId)
    const toProject = links.find(l => l.project.id === data.toProjectId)

    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'RESOURCE_REALLOCATED',
        meta: {
          from: fromProject?.project.name,
          to: toProject?.project.name,
          count: movedCount,
          requestedCount: data.resourceCount,
        },
      },
    })

    // Create progress update audit trail
    await prisma.goalProgressUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        triggeredBy: 'agent_action',
        sourceId: `reallocation:${data.fromProjectId}:${data.toProjectId}`,
        previousProgress: 0,
        newProgress: 0,
        confidence: 0.8,
        updatedById: auth.user.userId,
      },
    })

    // Recalculate analytics
    await recalculateGoalAnalytics(goalId)

    return NextResponse.json({
      success: true,
      action: 'reallocate_resources',
      impact: {
        resourcesMoved: movedCount,
        fromProject: fromProject?.project.name,
        toProject: toProject?.project.name,
      },
      affectedEntities,
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
