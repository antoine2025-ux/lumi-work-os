import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/tasks/[id] - Get a specific task
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params

    const task = await prisma.task.findUnique({
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

    if (!task) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error fetching task:', error)
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