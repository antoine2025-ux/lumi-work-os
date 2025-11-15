import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { logTaskHistory } from '@/lib/pm/history'
import { emitProjectEvent } from '@/lib/pm/events'
import { TaskPatchSchema, TaskPutSchema } from '@/lib/pm/schemas'
import { assertProjectAccess } from '@/lib/pm/guards'
import { z } from 'zod'
import { prisma } from '@/lib/db'


// GET /api/tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params

    // Get authenticated user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check project access
    await assertProjectAccess(user, task.projectId)

    // Get full task details
    const fullTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
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
            order: 'asc'
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
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            subtasks: true,
            comments: true
          }
        }
      }
    })

    if (!fullTask) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }

    return NextResponse.json(fullTask)
  } catch (error) {
    console.error('Error fetching task:', error)
    
    // Handle RBAC errors
    if (error.message === 'Unauthorized: User not authenticated.' || 
        error.message === 'User not found.') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message === 'Project not found.') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (error.message === 'Forbidden: Insufficient project permissions.') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params
    const body = await request.json()
    
    // Validate request body with Zod
    let validatedData
    try {
      validatedData = TaskPutSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Validation failed',
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        }, { status: 400 })
      }
      throw error
    }
    const { 
      title, 
      description,
      status,
      priority,
      assigneeId,
      dueDate,
      tags,
      completedAt,
      epicId,
      milestoneId,
      points,
      dependsOn,
      blocks
    } = validatedData

    // Get authenticated user
    let user = null
    if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email! }
      })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const userToUse = user

    // Get current task to track changes and check access
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assigneeId: true,
        dueDate: true,
        tags: true,
        completedAt: true,
        epicId: true,
        milestoneId: true,
        points: true,
        dependsOn: true,
        blocks: true,
        projectId: true
      }
    })

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check project access (require member access for updating tasks)
    await assertProjectAccess(userToUse, currentTask.projectId, 'MEMBER')

    // Get actor ID for history logging
    const actorId = userToUse.id

    // Build update data object
    const updateData: any = {}
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (tags !== undefined) updateData.tags = tags
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null
    if (epicId !== undefined) updateData.epicId = epicId || null
    if (milestoneId !== undefined) updateData.milestoneId = milestoneId || null
    if (points !== undefined) updateData.points = points || null

    // If status is DONE and completedAt is not set, set it to now
    if (status === 'DONE' && !completedAt) {
      updateData.completedAt = new Date()
    }

    // If status is not DONE, clear completedAt
    if (status && status !== 'DONE') {
      updateData.completedAt = null
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
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
        epic: {
          select: {
            id: true,
            title: true,
            color: true
          }
        },
        milestone: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true
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
            order: 'asc'
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
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            subtasks: true,
            comments: true
          }
        }
      }
    })

    // Log history for changed fields
    const changedFields = []
    for (const [field, newValue] of Object.entries(updateData)) {
      const oldValue = currentTask[field as keyof typeof currentTask]
      if (oldValue !== newValue) {
        await logTaskHistory(taskId, actorId, field, oldValue, newValue)
        changedFields.push({ field, oldValue, newValue })
      }
    }

    // Emit Socket.IO event with only changed fields
    if (changedFields.length > 0) {
      emitProjectEvent(currentTask.projectId, 'taskUpdated', {
        taskId,
        updates: changedFields.reduce((acc, { field, newValue }) => {
          acc[field] = newValue
          return acc
        }, {} as any),
        userId: actorId
      })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    
    // Handle RBAC errors
    if (error instanceof Error) {
      if (error.message === 'Unauthorized: User not authenticated.' || 
          error.message === 'User not found.') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      if (error.message === 'Project not found.') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      
      if (error.message === 'Forbidden: Insufficient project permissions.') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    
    return NextResponse.json({ 
      error: 'Failed to update task',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PATCH /api/tasks/[id] - Partial update a task
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
      completedAt,
      epicId,
      milestoneId,
      points
    } = body

    // Get current task to track changes
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assigneeId: true,
        dueDate: true,
        tags: true,
        completedAt: true,
        epicId: true,
        milestoneId: true,
        points: true,
        projectId: true
      }
    })

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get session for history logging
    const session = await getServerSession(authOptions)
    const actorId = session?.user?.id || 'system'

    // Build update data object
    const updateData: any = {}
    
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId || null
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null
    if (tags !== undefined) updateData.tags = tags
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null
    if (epicId !== undefined) updateData.epicId = epicId || null
    if (milestoneId !== undefined) updateData.milestoneId = milestoneId || null
    if (points !== undefined) updateData.points = points || null

    // If status is DONE and completedAt is not set, set it to now
    if (status === 'DONE' && !completedAt) {
      updateData.completedAt = new Date()
    }

    // If status is not DONE, clear completedAt
    if (status && status !== 'DONE') {
      updateData.completedAt = null
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
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
        epic: {
          select: {
            id: true,
            title: true,
            color: true
          }
        },
        milestone: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true
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
            order: 'asc'
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
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            subtasks: true,
            comments: true
          }
        }
      }
    })

    // Log history for changed fields
    const changedFields = []
    for (const [field, newValue] of Object.entries(updateData)) {
      const oldValue = currentTask[field as keyof typeof currentTask]
      if (oldValue !== newValue) {
        await logTaskHistory(taskId, actorId, field, oldValue, newValue)
        changedFields.push({ field, oldValue, newValue })
      }
    }

    // Emit Socket.IO event with only changed fields
    if (changedFields.length > 0) {
      emitProjectEvent(currentTask.projectId, 'taskUpdated', {
        taskId,
        updates: changedFields.reduce((acc, { field, newValue }) => {
          acc[field] = newValue
          return acc
        }, {} as any),
        userId: actorId
      })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ 
      error: 'Failed to update task',
      details: error.message 
    }, { status: 500 })
  }
}

// DELETE /api/tasks/[id] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    })

    if (!task) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }

    // Delete the task (cascade will handle subtasks and comments)
    await prisma.task.delete({
      where: { id: taskId }
    })

    return NextResponse.json({ 
      message: 'Task deleted successfully' 
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ 
      error: 'Failed to delete task',
      details: error.message 
    }, { status: 500 })
  }
}