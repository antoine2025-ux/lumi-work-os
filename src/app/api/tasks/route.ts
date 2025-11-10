import { NextRequest, NextResponse } from 'next/server'
import { TaskCreateSchema } from '@/lib/pm/schemas'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { getTasksOptimized } from '@/lib/db-optimization'

// GET /api/tasks - Get all tasks for a project
export async function GET(request: NextRequest) {
  try {
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')
    const epicId = searchParams.get('epicId')

    if (!projectId) {
      return NextResponse.json({ 
        error: 'Missing required parameter: projectId' 
      }, { status: 400 })
    }

    // 4. Assert project access (project must be in active workspace)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      projectId, 
      scope: 'project', 
      requireRole: ['MEMBER'] 
    })

    const where: any = { 
      projectId,
      workspaceId: auth.workspaceId // 5. Use activeWorkspaceId, no hardcoded values
    }
    
    if (status) {
      where.status = status
    }
    
    if (assigneeId) {
      where.assigneeId = assigneeId
    }
    
    if (epicId) {
      where.epicId = epicId
    }

    // Optimized query: Use select and limit nested data to reduce payload
    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        createdAt: true,
        updatedAt: true,
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
        // Limit subtasks - only load summary data
        subtasks: {
          take: 5, // Only load first 5 subtasks
          select: {
            id: true,
            title: true,
            status: true,
            order: true,
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
        // Limit comments - only load recent comments
        comments: {
          take: 5, // Only load 5 most recent comments
          select: {
            id: true,
            content: true,
            createdAt: true,
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
      ],
      take: 100 // Add limit to prevent loading thousands of tasks
    })

    // Add HTTP caching headers for better performance
    const response = NextResponse.json(tasks)
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
    return response
  } catch (error) {
    console.error('Error fetching tasks:', error)
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch tasks' 
    }, { status: 500 })
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    // 1. Get authenticated user with workspace context
    const auth = await getUnifiedAuth(request)
    
    // 2. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // 3. Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    
    // Validate request body with Zod
    const validatedData = TaskCreateSchema.parse(body)
    const { 
      projectId,
      title, 
      description,
      status = 'TODO',
      priority = 'MEDIUM',
      assigneeId,
      dueDate,
      tags = [],
      epicId,
      milestoneId,
      points,
      dependsOn = [],
      blocks = [],
      subtasks = []
    } = validatedData

    // Additional validation for required fields not in schema
    if (!projectId) {
      return NextResponse.json({ 
        error: 'Missing required field: projectId' 
      }, { status: 400 })
    }

    // 4. Assert project access (project must be in active workspace)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      projectId, 
      scope: 'project', 
      requireRole: ['MEMBER'] 
    })

    // Verify project exists and is in the correct workspace
    const project = await prisma.project.findUnique({
      where: { 
        id: projectId,
        workspaceId: auth.workspaceId // 5. Ensure cross-tenant safety
      }
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
        workspaceId: auth.workspaceId, // 5. Use activeWorkspaceId
        title,
        description,
        status: status as any,
        priority: priority as any,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        tags,
        epicId: epicId || null,
        milestoneId: milestoneId || null,
        points: points || null,
        dependsOn,
        blocks,
        createdById: auth.user.userId // 3. Use userId from auth
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
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    // Handle auth errors
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (error.message.includes('Project not found')) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create task',
      details: error.message 
    }, { status: 500 })
  }
}