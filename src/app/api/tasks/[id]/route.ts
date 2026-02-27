import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { emitEvent } from '@/lib/events/emit'
import { ACTIVITY_EVENTS } from '@/lib/events/activityEvents'
import { calculateCompletionDays } from '@/lib/org/listeners/utils'
import {
  createProjectAllocation,
  canTakeOnWork,
} from '@/lib/org/capacity/project-capacity'
import { syncProjectToGoals } from '@/lib/goals/project-sync'
import { TaskPutSchema } from '@/lib/pm/schemas'
import { createNotification } from '@/lib/notifications/create'

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
    setWorkspaceContext(auth.workspaceId)
    
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
  } catch (error) {
    return handleApiError(error, request)
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
    setWorkspaceContext(auth.workspaceId)
    
    // 2. Check workspace access (MEMBER can update)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })

    const { id: taskId } = await params
    const body = TaskPutSchema.parse(await request.json())
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
        assigneeId: true,
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

    // Notify new assignee when assignment changed (fire-and-forget)
    if (assigneeId !== undefined && assigneeId && assigneeId !== auth.user.userId && assigneeId !== existingTask.assigneeId) {
      createNotification({
        workspaceId: auth.workspaceId,
        recipientId: assigneeId,
        actorId: auth.user.userId,
        type: 'task.assigned',
        title: `You were assigned to "${task.title}"`,
        body: task.description?.substring(0, 200) || undefined,
        entityType: 'task',
        entityId: task.id,
        url: `/projects/${task.projectId}/tasks/${task.id}`,
      }).catch((err) => console.error('Failed to create task.assigned notification:', err))
    }

    // Link to org and create WorkAllocation when assignee is set
    let capacityWarning: { message: string; currentUtilization: number; newUtilization: number } | null = null
    if (assigneeId !== undefined && assigneeId) {
      const { hasProjectAccess } = await import('@/lib/pm/guards')
      const assigneeHasAccess = await hasProjectAccess(
        assigneeId,
        existingTask.projectId,
        auth.workspaceId
      )
      if (assigneeHasAccess) {
        const orgPosition = await prisma.orgPosition.findFirst({
          where: {
            userId: assigneeId,
            workspaceId: auth.workspaceId,
          },
        })
        const estimatedHours = 5
        const capacityCheck = await canTakeOnWork(
          assigneeId,
          auth.workspaceId,
          estimatedHours,
          120
        )
        if (!capacityCheck.canTake && capacityCheck.reason) {
          capacityWarning = {
            message: capacityCheck.reason,
            currentUtilization: capacityCheck.currentPct,
            newUtilization: Math.round(capacityCheck.currentPct + (estimatedHours / 40) * 100),
          }
        }
        await prisma.projectAssignee.upsert({
          where: {
            projectId_userId: { projectId: existingTask.projectId, userId: assigneeId },
          },
          create: { projectId: existingTask.projectId, userId: assigneeId, workspaceId: auth.workspaceId },
          update: {},
        })
        if (orgPosition) {
          await createProjectAllocation({
            workspaceId: auth.workspaceId,
            orgPositionId: orgPosition.id,
            projectId: existingTask.projectId,
            hoursAllocated: estimatedHours,
            description: `Task: ${task.title}`,
          }).catch((err) => {
            console.error('Failed to create task assignment WorkAllocation', {
              taskId,
              assigneeId,
              error: err,
            })
          })
        }
      }
    }

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

      // Sync to goals if project has goal links
      syncProjectToGoals(existingTask.projectId, auth.user.userId).catch(err => 
        console.error('Failed to sync task completion to goals:', err)
      )
    }

    const response = task as Record<string, unknown>
    if (capacityWarning) response.capacityWarning = capacityWarning
    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error, request)
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
    setWorkspaceContext(auth.workspaceId)
    
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
  } catch (error) {
    return handleApiError(error, request)
  }
}
