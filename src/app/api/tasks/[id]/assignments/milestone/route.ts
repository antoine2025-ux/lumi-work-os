import { NextRequest, NextResponse } from 'next/server'
import { AssignTaskToMilestoneSchema } from '@/lib/pm/schemas'
import { assertProjectWriteAccess } from '@/lib/pm/guards'
import { logTaskHistory } from '@/lib/pm/history'
import { emitProjectEvent } from '@/lib/pm/events'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'


// PATCH /api/tasks/[id]/assignments/milestone - Assign task to milestone
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    setWorkspaceContext(auth.workspaceId)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    const resolvedParams = await params
    const taskId = resolvedParams.id

    const body = await request.json()
    const validatedData = AssignTaskToMilestoneSchema.parse(body)

    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Get task with project info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check write access to project (throws on failure)
    await assertProjectWriteAccess(user, task.projectId, auth.workspaceId)

    // If milestoneId is provided, verify it exists and belongs to the same project
    if (validatedData.milestoneId) {
      const milestone = await prisma.milestone.findFirst({
        where: { 
          id: validatedData.milestoneId,
          projectId: task.projectId 
        }
      })

      if (!milestone) {
        return NextResponse.json({ error: 'Milestone not found or does not belong to this project' }, { status: 404 })
      }
    }

    // Store old value for history
    const oldMilestoneId = task.milestoneId

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { milestoneId: validatedData.milestoneId },
      include: {
        epic: true,
        milestone: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Log history
    await logTaskHistory({
      taskId,
      actorId: user.id,
      field: 'milestone',
      from: oldMilestoneId,
      to: validatedData.milestoneId
    })

    // Emit Socket.IO event
    emitProjectEvent(
      task.projectId,
      'taskMilestoneAssigned',
      {
        taskId,
        milestoneId: validatedData.milestoneId,
        projectId: task.projectId,
        userId: user.id
      }
    )

    return NextResponse.json(updatedTask)
  } catch (error) {
    return handleApiError(error, request)
  }
}
