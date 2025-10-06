import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/tasks - Get all tasks for a workspace or project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')

    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 })
    }

    const where: any = { workspaceId }
    if (projectId) {
      where.projectId = projectId
    }
    if (status) {
      where.status = status
    }
    if (assigneeId) {
      where.assigneeId = assigneeId
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
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
        subtasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true
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
            createdAt: 'asc'
          }
        },
        _count: {
          select: {
            subtasks: true,
            comments: true
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch tasks' 
    }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      projectId,
      workspaceId,
      title,
      description,
      priority = 'MEDIUM',
      assigneeId,
      dueDate,
      tags = [],
      createdById
    } = body

    if (!projectId || !workspaceId || !title || !createdById) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, workspaceId, title, createdById' 
      }, { status: 400 })
    }

    // Get the next order number for this project
    const lastTask = await prisma.task.findFirst({
      where: { projectId },
      orderBy: { order: 'desc' }
    })
    const nextOrder = (lastTask?.order || 0) + 1

    const task = await prisma.task.create({
      data: {
        projectId,
        workspaceId,
        title,
        description,
        priority: priority as any,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags,
        order: nextOrder,
        createdById
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
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
        subtasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true
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
            createdAt: 'asc'
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
    console.error('Error creating task:', error)
    return NextResponse.json({ 
      error: 'Failed to create task',
      details: error.message 
    }, { status: 500 })
  }
}
