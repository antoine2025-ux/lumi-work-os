import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { syncGoalProjects } from '@/lib/goals/project-sync'
import { LinkProjectSchema } from '@/lib/validations/goals'

// ============================================================================
// POST /api/goals/[goalId]/link-project - Link a project to goal
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
    const data = LinkProjectSchema.parse(body)

    // Verify goal exists
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

    // Verify project exists
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        workspaceId: auth.workspaceId,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if link already exists
    const existingLink = await prisma.projectGoalLink.findFirst({
      where: {
        goalId,
        projectId: data.projectId,
      },
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'Project is already linked to this goal' },
        { status: 409 }
      )
    }

    // Create link
    const link = await prisma.projectGoalLink.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        projectId: data.projectId,
        contributionType: data.contributionType,
        expectedImpact: data.expectedImpact,
        autoUpdate: data.autoUpdate,
        syncRules: data.syncRules ? JSON.parse(JSON.stringify(data.syncRules)) : undefined,
      },
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
    })

    // Compute initial actualImpact
    await syncGoalProjects(goalId, auth.user.userId)

    // Log activity
    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'PROJECT_LINKED',
        meta: {
          projectId: data.projectId,
          projectName: project.name,
        },
      },
    })

    // Log goal update
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'PROJECT_LINKED',
        content: `Linked project: ${project.name}`,
        authorId: auth.user.userId,
      },
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// DELETE /api/goals/[goalId]/link-project - Unlink a project from goal
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
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter is required' },
        { status: 400 }
      )
    }

    // Verify goal exists
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

    // Find and delete link
    const link = await prisma.projectGoalLink.findFirst({
      where: {
        goalId,
        projectId,
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!link) {
      return NextResponse.json(
        { error: 'Project link not found' },
        { status: 404 }
      )
    }

    await prisma.projectGoalLink.delete({
      where: {
        id: link.id,
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        workspaceId: auth.workspaceId,
        actorId: auth.user.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'PROJECT_UNLINKED',
        meta: {
          projectId,
          projectName: link.project.name,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}
