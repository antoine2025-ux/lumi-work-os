import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'

// ============================================================================
// GET /api/goals/correlations - Cross-goal dependencies and conflict graph
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

    // Fetch all active goals with their relationships
    const goals = await prisma.goal.findMany({
      where: {
        workspaceId: auth.workspaceId,
        status: { in: ['ACTIVE', 'DRAFT'] },
      },
      select: {
        id: true,
        title: true,
        level: true,
        status: true,
        progress: true,
        parentId: true,
        ownerId: true,
        alignmentScore: true,
        linkedProjects: {
          select: { projectId: true },
        },
        conflictsWith: {
          select: { id: true, title: true },
        },
        conflictedWith: {
          select: { id: true, title: true },
        },
      },
    })

    // Build dependency graph
    const nodes = goals.map(g => ({
      id: g.id,
      title: g.title,
      level: g.level,
      status: g.status,
      progress: g.progress,
      ownerId: g.ownerId,
      alignmentScore: g.alignmentScore,
    }))

    const edges: Array<{
      from: string
      to: string
      type: 'parent_child' | 'shared_project' | 'shared_owner' | 'conflict'
      detail?: string
    }> = []

    // Parent-child edges
    for (const goal of goals) {
      if (goal.parentId) {
        edges.push({
          from: goal.parentId,
          to: goal.id,
          type: 'parent_child',
        })
      }
    }

    // Conflict edges
    for (const goal of goals) {
      for (const conflict of goal.conflictsWith) {
        edges.push({
          from: goal.id,
          to: conflict.id,
          type: 'conflict',
          detail: `Conflict: ${conflict.title}`,
        })
      }
    }

    // Shared project edges
    const projectGoalMap = new Map<string, string[]>()
    for (const goal of goals) {
      for (const link of goal.linkedProjects) {
        const existing = projectGoalMap.get(link.projectId) || []
        existing.push(goal.id)
        projectGoalMap.set(link.projectId, existing)
      }
    }

    for (const [projectId, goalIds] of projectGoalMap) {
      if (goalIds.length > 1) {
        for (let i = 0; i < goalIds.length; i++) {
          for (let j = i + 1; j < goalIds.length; j++) {
            edges.push({
              from: goalIds[i],
              to: goalIds[j],
              type: 'shared_project',
              detail: `Shared project: ${projectId}`,
            })
          }
        }
      }
    }

    // Shared owner edges
    const ownerGoalMap = new Map<string, string[]>()
    for (const goal of goals) {
      if (goal.ownerId) {
        const existing = ownerGoalMap.get(goal.ownerId) || []
        existing.push(goal.id)
        ownerGoalMap.set(goal.ownerId, existing)
      }
    }

    for (const [, goalIds] of ownerGoalMap) {
      if (goalIds.length > 1) {
        for (let i = 0; i < goalIds.length; i++) {
          for (let j = i + 1; j < goalIds.length; j++) {
            edges.push({
              from: goalIds[i],
              to: goalIds[j],
              type: 'shared_owner',
            })
          }
        }
      }
    }

    return NextResponse.json({
      nodes,
      edges,
      summary: {
        totalGoals: nodes.length,
        totalEdges: edges.length,
        parentChildLinks: edges.filter(e => e.type === 'parent_child').length,
        sharedProjectLinks: edges.filter(e => e.type === 'shared_project').length,
        conflicts: edges.filter(e => e.type === 'conflict').length,
        sharedOwnerLinks: edges.filter(e => e.type === 'shared_owner').length,
      },
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
