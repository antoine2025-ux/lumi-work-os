import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/tasks - Get all tasks for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: projectId' 
      }, { status: 400 })
    }

    // Ensure user and workspace exist for development
    const createdById = 'dev-user-1'
    
    let user = await prisma.user.findUnique({
      where: { id: createdById }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: createdById,
          email: 'dev@lumi.com',
          name: 'Development User'
        }
      })
    }

    let workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })
    
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: workspaceId,
          name: 'Development Workspace',
          slug: 'dev-workspace',
          description: 'Development workspace',
          ownerId: createdById
        }
      })
    }

    const where: any = { 
      projectId,
      workspaceId 
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
            color: true
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
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
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
      workspaceId = 'workspace-1',
      title, 
      description,
      status = 'TODO',
      priority = 'MEDIUM',
      assigneeId,
      dueDate,
      tags = [],
      subtasks = []
    } = body

    if (!projectId || !title) {
      return NextResponse.json({ 
        error: 'Missing required fields: projectId, title' 
      }, { status: 400 })
    }

    // Use hardcoded user ID for development
    const createdById = 'dev-user-1'

    // Ensure user and workspace exist for development
    let user = await prisma.user.findUnique({
      where: { id: createdById }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: createdById,
          email: 'dev@lumi.com',
          name: 'Development User'
        }
      })
    }

    let workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })
    
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          id: workspaceId,
          name: 'Development Workspace',
          slug: 'dev-workspace',
          description: 'Development workspace',
          ownerId: createdById
        }
      })
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ 
        error: 'Project not found' 
      }, { status: 404 })
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        projectId,
        workspaceId,
        title,
        description,
        status: status as any,
        priority: priority as any,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags,
        createdById
      },
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
            color: true
          }
        },
        subtasks: true,
        comments: true,
        _count: {
          select: {
            subtasks: true,
            comments: true
          }
        }
      }
    })

    // Create subtasks if provided
    if (subtasks && subtasks.length > 0) {
      await prisma.subtask.createMany({
        data: subtasks.map((subtask: any, index: number) => ({
          taskId: task.id,
          title: subtask.title,
          description: subtask.description,
          assigneeId: subtask.assigneeId || null,
          dueDate: subtask.dueDate ? new Date(subtask.dueDate) : null,
          order: index
        }))
      })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ 
      error: 'Failed to create task',
      details: error.message 
    }, { status: 500 })
  }
}