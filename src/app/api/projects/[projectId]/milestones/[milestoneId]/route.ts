import { NextRequest, NextResponse } from 'next/server'
import { UpdateMilestoneSchema } from '@/lib/pm/schemas'
import { assertProjectAccess, assertProjectWriteAccess } from '@/lib/pm/guards'
import { emitProjectEvent } from '@/lib/pm/events'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { ProjectRole } from '@prisma/client'


// GET /api/projects/[projectId]/milestones/[milestoneId] - Get a specific milestone
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params
    const { projectId, milestoneId } = resolvedParams

    // Check project access
    const nextAuthUser = { id: auth.user.userId, email: auth.user.email, name: auth.user.name } as any
    await assertProjectAccess(nextAuthUser, projectId, ProjectRole.VIEWER, auth.workspaceId)

    const milestone = await prisma.milestone.findFirst({
      where: { 
        id: milestoneId,
        projectId 
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            points: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    return NextResponse.json(milestone)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// PATCH /api/projects/[projectId]/milestones/[milestoneId] - Update a milestone
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params
    const { projectId, milestoneId } = resolvedParams

    // Check write access
    const nextAuthUser = { id: auth.user.userId, email: auth.user.email, name: auth.user.name } as any
    const accessResult = await assertProjectWriteAccess(nextAuthUser, projectId, auth.workspaceId)

    const body = await request.json()
    
    // Validate input
    const validatedData = UpdateMilestoneSchema.parse(body)

    // Check if milestone exists
    const existingMilestone = await prisma.milestone.findFirst({
      where: { 
        id: milestoneId,
        projectId 
      }
    })

    if (!existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Update the milestone
    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        title: validatedData.title,
        description: validatedData.description,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            points: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    })

    // Emit Socket.IO event
    emitProjectEvent(
      projectId,
      'milestoneUpdated',
      {
        milestone,
        projectId,
        userId: accessResult.user!.id
      }
    )

    return NextResponse.json(milestone)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// DELETE /api/projects/[projectId]/milestones/[milestoneId] - Delete a milestone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(auth.workspaceId)

    const resolvedParams = await params
    const { projectId, milestoneId } = resolvedParams

    // Check write access
    const nextAuthUser = { id: auth.user.userId, email: auth.user.email, name: auth.user.name } as any
    const accessResult = await assertProjectWriteAccess(nextAuthUser, projectId, auth.workspaceId)

    // Check if milestone exists
    const existingMilestone = await prisma.milestone.findFirst({
      where: { 
        id: milestoneId,
        projectId 
      }
    })

    if (!existingMilestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Check if milestone has tasks
    const taskCount = await prisma.task.count({
      where: { milestoneId }
    })

    if (taskCount > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete milestone with tasks. Please reassign or delete tasks first.' 
      }, { status: 400 })
    }

    // Delete the milestone
    await prisma.milestone.delete({
      where: { id: milestoneId }
    })

    // Emit Socket.IO event
    emitProjectEvent(
      projectId,
      'milestoneDeleted',
      {
        milestoneId,
        projectId,
        userId: accessResult.user!.id
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, request)
  }
}
