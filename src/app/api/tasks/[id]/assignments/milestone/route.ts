import { NextRequest, NextResponse } from 'next/server'
import { AssignTaskToMilestoneSchema } from '@/lib/pm/schemas'
import { assertProjectWriteAccess } from '@/lib/pm/guards'
import { logTaskHistory } from '@/lib/pm/history'
import { emitProjectEvent } from '@/lib/pm/events'
import { prisma } from '@/lib/db'


// PATCH /api/tasks/[id]/assignments/milestone - Assign task to milestone
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const taskId = resolvedParams.id

    const body = await request.json()
    const validatedData = AssignTaskToMilestoneSchema.parse(body)

    // Get task with project info
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check write access to project
    const accessResult = await assertProjectWriteAccess(task.projectId)
    if (!accessResult.hasAccess) {
      return NextResponse.json({ error: accessResult.error }, { status: 403 })
    }

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
      actorId: accessResult.user!.id,
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
        userId: accessResult.user!.id
      }
    )

    return NextResponse.json(updatedTask)
  } catch (error) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error assigning task to milestone:', error)
    return NextResponse.json({ 
      error: 'Failed to assign task to milestone' 
    }, { status: 500 })
  }
}
