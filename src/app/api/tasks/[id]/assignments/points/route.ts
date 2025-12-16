import { NextRequest, NextResponse } from 'next/server'
import { UpdateTaskPointsSchema } from '@/lib/pm/schemas'
import { assertProjectWriteAccess } from '@/lib/pm/guards'
import { logTaskHistory } from '@/lib/pm/history'
import { emitProjectEvent } from '@/lib/pm/events'
import { prisma } from '@/lib/db'


// PATCH /api/tasks/[id]/assignments/points - Update task story points
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const taskId = resolvedParams.id

    const body = await request.json()
    const validatedData = UpdateTaskPointsSchema.parse(body)

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

    // Store old value for history
    const oldPoints = task.points

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { points: validatedData.points },
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
      field: 'points',
      from: oldPoints,
      to: validatedData.points
    })

    // Emit Socket.IO event
    emitProjectEvent(
      task.projectId,
      'taskPointsUpdated',
      {
        taskId,
        points: validatedData.points,
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

    console.error('Error updating task points:', error)
    return NextResponse.json({ 
      error: 'Failed to update task points' 
    }, { status: 500 })
  }
}
