import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { emitEvent } from '@/lib/events/emit'
import { ACTIVITY_EVENTS } from '@/lib/events/activityEvents'
import { calculateCompletionDays } from '@/lib/org/listeners/utils'

// Shared include for task queries
const taskInclude = {
  assignee: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true
    }
  },
  project: {
    select: {
      id: true,
      name: true,
      color: true,
      status: true
    }
  },
  subtasks: {
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      order: 'asc' as const
    }
  },
  comments: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc' as const
    }
  },
  _count: {
    select: {
      subtasks: true,
      comments: true
    }
  }
}

// GET /api/tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const auth = await getUnifiedAuth(request)
    
    // 2. Check workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'] // Read access
    })

    const { id: taskId } = await params

    // 3. Fetch task with workspace constraint
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        workspaceId: auth.workspaceId // Workspace isolation
      },
      include: taskInclude
    })

    if (!task) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error: unknown) {
    console.error('Error fetching task:', error)
    
    // Handle auth errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch task' 
    }, { status: 500 })
  }
}

// PUT /api/tasks/[id] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const auth = await getUnifiedAuth(request)
    
    // 2. Check workspace access (MEMBER can update)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })

    const { id: taskId } = await params
    const body = await request.json()
    const { 
      title, 
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      tags,
      completedAt
    } = body

    // 3. Verify task exists in this workspace before updating
    const existingTask = await prisma.task.findFirst({
      where: { 
        id: taskId,
        workspaceId: auth.workspaceId
      },
      select: { 
        id: true,
        completedAt: true,
        createdAt: true,
        projectId: true,
        status: true
      }
    })

    if (!existingTask) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }

    // Build update data object
    const updateData: Record<string, unknown> = {}
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (tags !== undefined) updateData.tags = tags
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null

    // If status is DONE and completedAt is not set, set it to now
    if (status === 'DONE' && !completedAt) {
      updateData.completedAt = new Date()
    }

    // If status is not DONE, clear completedAt
    if (status && status !== 'DONE') {
      updateData.completedAt = null
    }

    // Check if task is being completed
    const isBeingCompleted = status === 'DONE' && !existingTask.completedAt

    // 4. Update task (safe because we verified ownership above)
    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: taskInclude
    })

    // Emit activity event if task was just completed
    if (isBeingCompleted) {
      const completionDays = calculateCompletionDays(
        existingTask.createdAt,
        new Date()
      )
      
      emitEvent(ACTIVITY_EVENTS.TASK_COMPLETED, {
        workspaceId: auth.workspaceId,
        userId: auth.user.userId,
        taskId,
        projectId: existingTask.projectId,
        completionDays,
        timestamp: new Date()
      }).catch((err) => 
        console.error('Failed to emit task completed event', err)
      )
    }

    return NextResponse.json(task)
  } catch (error: unknown) {
    console.error('Error updating task:', error)
    
    // Handle auth errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate user
    const auth = await getUnifiedAuth(request)
    
    // 2. Check workspace access (MEMBER can delete)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })

    const { id: taskId } = await params

    // 3. Verify task exists in this workspace before deleting
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        workspaceId: auth.workspaceId
      },
      select: { id: true }
    })

    if (!task) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }

    // 4. Delete the task (cascade will handle subtasks and comments)
    await prisma.task.delete({
      where: { id: taskId }
    })

    return NextResponse.json({ 
      message: 'Task deleted successfully' 
    })
  } catch (error: unknown) {
    console.error('Error deleting task:', error)
    
    // Handle auth errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete task',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
