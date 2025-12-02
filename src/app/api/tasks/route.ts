import { NextRequest, NextResponse } from 'next/server'
import { TaskCreateSchema } from '@/lib/pm/schemas'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'
import { getTasksOptimized } from '@/lib/db-optimization'
import { upsertTaskContext } from '@/lib/loopbrain/context-engine'
import { logger } from '@/lib/logger'

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
        epicId: true,
        tags: true,
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
        epic: {
          select: {
            id: true,
            title: true,
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
    
    // 2. Fail early if workspaceId is missing (should never happen with proper auth)
    if (!auth.workspaceId) {
      return NextResponse.json({ 
        error: 'Workspace context is required. Please ensure you are authenticated and have an active workspace.' 
      }, { status: 401 })
    }
    
    // 3. Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // 4. Set workspace context for Prisma middleware
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

    // 5. Assert project access (project must be in active workspace)
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
        workspaceId: auth.workspaceId // 6. Ensure cross-tenant safety
      }
    })

    if (!project) {
      return NextResponse.json({ 
        error: 'Project not found' 
      }, { status: 404 })
    }

    // Validate epic if provided
    if (epicId) {
      const epic = await prisma.epic.findUnique({
        where: { 
          id: epicId,
          workspaceId: auth.workspaceId // Ensure epic is in the same workspace
        },
        select: {
          id: true,
          projectId: true
        }
      })

      if (!epic) {
        return NextResponse.json({ 
          error: 'Epic not found or you do not have access to it' 
        }, { status: 404 })
      }

      // Ensure epic belongs to the same project
      if (epic.projectId !== projectId) {
        return NextResponse.json({ 
          error: 'Epic does not belong to the specified project' 
        }, { status: 400 })
      }
    }

    // Create the task
    // Note: workspaceId is always derived from auth.workspaceId, never from client input
    const task = await prisma.task.create({
      data: {
        projectId,
        workspaceId: auth.workspaceId, // Always use authenticated workspace
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
          description: subtask.description || null,
          assigneeId: subtask.assigneeId || null,
          dueDate: subtask.dueDate ? new Date(subtask.dueDate) : null,
          order: index
        }))
      })
      
      // Reload task with subtasks included
      const taskWithSubtasks = await prisma.task.findUnique({
        where: { id: task.id },
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
            orderBy: {
              order: 'asc'
            }
          },
          comments: true,
          _count: {
            select: {
              subtasks: true,
              comments: true
            }
          }
        }
      })
      
      // Upsert task context for Loopbrain
      upsertTaskContext(task.id).catch((err) => 
        logger.error('Failed to update task context after creation', { taskId: task.id, error: err })
      )
      
      return NextResponse.json(taskWithSubtasks)
    }

    // Upsert task context for Loopbrain
    upsertTaskContext(task.id).catch((err) => 
      logger.error('Failed to update task context after creation', { taskId: task.id, error: err })
    )

    return NextResponse.json(task)
  } catch (error) {
    logger.error('Error creating task', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: error instanceof Error ? undefined : error
    })
    console.error('Error creating task:', error)
    
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }
    
    // Handle Prisma foreign key constraint errors
    if ((error as any).code === 'P2003') {
      return NextResponse.json({ 
        error: 'Invalid reference. Please check that the epic, project, or assignee exists and you have access to it.',
        details: (error as any).meta
      }, { status: 400 })
    }
    
    // Handle Prisma unique constraint errors
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ 
        error: 'A task with this information already exists',
        details: (error as any).meta
      }, { status: 409 })
    }
    
    // Handle auth errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    if (error instanceof Error && error.message.includes('Project not found')) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }
    
    if (error instanceof Error && error.message.includes('Epic not found')) {
      return NextResponse.json({ error: 'Epic not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create task',
      details: error instanceof Error ? error.message : String(error),
      code: (error as any).code || undefined
    }, { status: 500 })
  }
}