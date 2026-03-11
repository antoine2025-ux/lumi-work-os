import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError, ApiError } from '@/lib/api-errors'
import { assertProjectAccess } from '@/lib/pm/guards'
import { prisma } from '@/lib/db'
import { TaskDependencySchema } from '@/lib/validations/tasks'


// POST /api/tasks/[id]/dependencies - Add or remove task dependencies
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Set workspace context for Prisma scoping
    const auth = await getUnifiedAuth(request)
    setWorkspaceContext(auth.workspaceId)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })

    const resolvedParams = await params
    const taskId = resolvedParams.id
    const { dependsOn, blocks, action } = TaskDependencySchema.parse(
      await request.json()
    )

    if (!taskId) {
      return NextResponse.json({ 
        error: 'Task ID is required' 
      }, { status: 400 })
    }

    // Get the current task
    const currentTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!currentTask) {
      return NextResponse.json({
        error: 'Task not found'
      }, { status: 404 })
    }

    // Verify user has write access to the project
    await assertProjectAccess({ id: auth.user.userId }, currentTask.projectId, 'MEMBER', auth.workspaceId)

    // Validate that all dependency tasks exist and are in the same project
    if (dependsOn.length > 0) {
      const dependencyTasks = await prisma.task.findMany({
        where: {
          id: { in: dependsOn },
          projectId: currentTask.projectId
        }
      })

      if (dependencyTasks.length !== dependsOn.length) {
        return NextResponse.json({ 
          error: 'Some dependency tasks not found or not in the same project' 
        }, { status: 400 })
      }
    }

    // Validate that all blocked tasks exist and are in the same project
    if (blocks.length > 0) {
      const blockedTasks = await prisma.task.findMany({
        where: {
          id: { in: blocks },
          projectId: currentTask.projectId
        }
      })

      if (blockedTasks.length !== blocks.length) {
        return NextResponse.json({ 
          error: 'Some blocked tasks not found or not in the same project' 
        }, { status: 400 })
      }
    }

    // Check for circular dependencies
    if (await hasCircularDependency(taskId, dependsOn)) {
      return NextResponse.json({ 
        error: 'Circular dependency detected' 
      }, { status: 400 })
    }

    // Update dependencies based on action
    let newDependsOn = currentTask.dependsOn
    let newBlocks = currentTask.blocks

    if (action === 'set') {
      newDependsOn = dependsOn
      newBlocks = blocks
    } else if (action === 'add') {
      newDependsOn = [...new Set([...currentTask.dependsOn, ...dependsOn])]
      newBlocks = [...new Set([...currentTask.blocks, ...blocks])]
    } else if (action === 'remove') {
      newDependsOn = currentTask.dependsOn.filter(id => !dependsOn.includes(id))
      newBlocks = currentTask.blocks.filter(id => !blocks.includes(id))
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        dependsOn: newDependsOn,
        blocks: newBlocks
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
            name: true
          }
        }
      }
    })

    // Update reverse dependencies (if task A depends on task B, then task B blocks task A)
    await updateReverseDependencies(taskId, newDependsOn, newBlocks)

    return NextResponse.json(updatedTask)
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// GET /api/tasks/[id]/dependencies - Get task dependencies
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const taskId = resolvedParams.id

    if (!taskId) {
      throw new ApiError('VALIDATION_ERROR', 400, 'Task ID is required')
    }

    // Authenticate and set workspace context
    const auth = await getUnifiedAuth(request)
    setWorkspaceContext(auth.workspaceId)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })

    // Fetch task to get projectId for authorization
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        status: true,
        dependsOn: true,
        blocks: true,
        projectId: true,
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!task) {
      throw new ApiError('NOT_FOUND', 404, 'Task not found')
    }

    // Verify user has access to the project (VIEWER+ can view task dependencies)
    await assertProjectAccess({ id: auth.user.userId }, task.projectId, 'VIEWER', auth.workspaceId)

    // Get dependency details
    const dependencies = await prisma.task.findMany({
      where: {
        id: { in: task.dependsOn }
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Get blocked tasks details
    const blockedTasks = await prisma.task.findMany({
      where: {
        id: { in: task.blocks }
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        project: task.project
      },
      dependencies,
      blockedTasks
    })
  } catch (error: unknown) {
    return handleApiError(error)
  }
}

// Helper function to check for circular dependencies
async function hasCircularDependency(taskId: string, dependsOn: string[]): Promise<boolean> {
  if (dependsOn.includes(taskId)) {
    return true
  }

  // Check if any of the dependencies would create a cycle
  for (const depId of dependsOn) {
    const depTask = await prisma.task.findUnique({
      where: { id: depId },
      select: { dependsOn: true }
    })

    if (depTask && await hasCircularDependency(taskId, depTask.dependsOn)) {
      return true
    }
  }

  return false
}

// Helper function to update reverse dependencies
async function updateReverseDependencies(taskId: string, dependsOn: string[], blocks: string[]) {
  // Update tasks that this task depends on to block this task
  for (const depId of dependsOn) {
    await prisma.task.update({
      where: { id: depId },
      data: {
        blocks: {
          push: taskId
        }
      }
    })
  }

  // Update tasks that this task blocks to depend on this task
  for (const blockedId of blocks) {
    await prisma.task.update({
      where: { id: blockedId },
      data: {
        dependsOn: {
          push: taskId
        }
      }
    })
  }
}
