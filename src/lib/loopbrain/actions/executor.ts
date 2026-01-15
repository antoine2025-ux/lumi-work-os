/**
 * Loopbrain Action Executor
 * 
 * Server-side executor for Loopbrain actions.
 * Validates permissions and executes actions safely.
 * 
 * Rules:
 * - All actions require workspace + permission validation
 * - Actions trigger indexing after execution
 * - Errors are normalized via LoopbrainError
 */

import { prisma } from '@/lib/db'
import { LoopbrainAction, LoopbrainActionResult } from './action-types'
import { indexOne } from '../indexing/indexer'
import { getRequestId } from '../request-id'
import { LoopbrainError, toLoopbrainError } from '../errors'
import { logger } from '@/lib/logger'
import { assertProjectAccess } from '@/lib/pm/guards'
import { ProjectRole } from '@prisma/client'

export interface ExecuteActionParams {
  action: LoopbrainAction
  workspaceId: string
  userId: string
  requestId?: string
}

/**
 * Execute a Loopbrain action
 * 
 * @param params - Action execution parameters
 * @returns Action result with success/error
 */
export async function executeAction(
  params: ExecuteActionParams
): Promise<LoopbrainActionResult> {
  const { action, workspaceId, userId, requestId } = params
  const reqId = requestId || getRequestId()

  try {
    switch (action.type) {
      case 'task.assign':
        return await executeTaskAssign(action, workspaceId, userId, reqId)
      
      case 'timeoff.create':
        return await executeTimeOffCreate(action, workspaceId, userId, reqId)
      
      case 'capacity.request':
        return await executeCapacityRequest(action, workspaceId, userId, reqId)
      
      default:
        throw new LoopbrainError('BAD_REQUEST', 400, `Unknown action type: ${(action as any).type}`)
    }
  } catch (error) {
    // Preserve the actual error cause
    let finalError: LoopbrainError
    
    if (error instanceof LoopbrainError) {
      finalError = error
    } else {
      // Convert to LoopbrainError, preserving cause
      const lbError = toLoopbrainError(error)
      // If toLoopbrainError didn't preserve cause, wrap it explicitly
      finalError = new LoopbrainError(
        lbError.code === 'UNKNOWN' ? 'INTERNAL_ERROR' : lbError.code,
        lbError.status || 500,
        lbError.message || 'An unexpected error occurred',
        {
          isUserSafe: false,
          details: {
            requestId: reqId,
            actionType: action.type,
          },
          cause: error instanceof Error ? error : new Error(String(error)),
        }
      )
    }

    logger.error('Action execution failed', {
      requestId: reqId,
      workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
      userId: userId ? `${userId.substring(0, 8)}...` : undefined,
      actionType: action.type,
      errorCode: finalError.code,
      errorMessage: finalError.message,
      errorStatus: finalError.status,
      causeName: finalError.cause instanceof Error ? finalError.cause.name : undefined,
      causeMessage: finalError.cause instanceof Error ? finalError.cause.message : String(finalError.cause),
      causeStack: finalError.cause instanceof Error ? finalError.cause.stack : undefined,
    })

    return {
      ok: false,
      error: {
        code: finalError.code,
        message: finalError.message,
      },
      requestId: reqId,
    }
  }
}

/**
 * Execute task assignment action
 * 
 * Validates:
 * - Task exists in workspace
 * - User has access to task's project (MEMBER or higher)
 */
async function executeTaskAssign(
  action: Extract<LoopbrainAction, { type: 'task.assign' }>,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<LoopbrainActionResult> {
  // Runtime guard: ensure prisma is defined
  if (!prisma) {
    logger.error('Prisma client is undefined in executor', {
      requestId,
      actionType: 'task.assign',
    })
    throw new LoopbrainError('INTERNAL_ERROR', 500, 'Prisma client is not available', {
      isUserSafe: false,
      details: {
        requestId,
        actionType: 'task.assign',
      },
    })
  }

  // Fetch task with project
  const task = await prisma.task.findFirst({
    where: {
      id: action.taskId,
      workspaceId, // Enforce workspace scoping
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!task) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'Task not found')
  }

  // Validate access to task's project
  // Convert userId to NextAuth format for assertProjectAccess
  const nextAuthUser = {
    id: userId,
    email: null,
    name: null,
  } as any

  await assertProjectAccess(
    nextAuthUser,
    task.projectId,
    ProjectRole.MEMBER, // Require MEMBER or higher to assign tasks
    workspaceId
  )

  // Verify assignee exists in workspace
  const assignee = await prisma.user.findFirst({
    where: {
      id: action.assigneeId,
      workspaceMemberships: {
        some: {
          workspaceId,
        },
      },
    },
  })

  if (!assignee) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'Assignee not found in workspace')
  }

  // Update task
  const updatedTask = await prisma.task.update({
    where: { id: action.taskId },
    data: { assigneeId: action.assigneeId },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Index the task (non-blocking)
  indexOne({
    workspaceId,
    userId,
    entityType: 'task',
    entityId: action.taskId,
    action: 'upsert',
    reason: 'action:task.assign',
    requestId,
  }).catch(err => {
    logger.error('Failed to index task after assignment', {
      requestId,
      taskId: action.taskId,
      error: err,
    })
  })

  // Index the person (assignee) (non-blocking)
  indexOne({
    workspaceId,
    userId,
    entityType: 'person',
    entityId: action.assigneeId,
    action: 'upsert',
    reason: 'action:task.assign (person)',
    requestId,
  }).catch(err => {
    logger.error('Failed to index person after task assignment', {
      requestId,
      personId: action.assigneeId,
      error: err,
    })
  })

  logger.info('Task assigned via action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    taskId: action.taskId,
    assigneeId: action.assigneeId,
    assigneeName: updatedTask.assignee?.name,
  })

  return {
    ok: true,
    result: {
      actionType: 'task.assign',
      entityId: action.taskId,
      message: `Task assigned to ${updatedTask.assignee?.name || 'assignee'}`,
    },
    requestId,
  }
}

/**
 * Execute time off creation action
 * 
 * Validates:
 * - User can only create time off for themselves (MVP: self-only)
 * - Dates are valid (startDate < endDate)
 */
async function executeTimeOffCreate(
  action: Extract<LoopbrainAction, { type: 'timeoff.create' }>,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<LoopbrainActionResult> {
  // TODO: TimeOff model not yet implemented in Prisma schema
  // When implementing, add model TimeOff { id, workspaceId, userId, startDate, endDate, type, status, notes }
  // and restore the full implementation from git history
  logger.info('timeoff.create action attempted but not yet implemented', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    userId: action.userId ? `${action.userId.substring(0, 8)}...` : undefined,
  })
  
  throw new LoopbrainError('BAD_REQUEST', 501, 'Time off feature is not yet implemented', {
    isUserSafe: true,
    details: { requestId, actionType: 'timeoff.create' },
  })
}

/**
 * Execute capacity request action
 * 
 * Validates:
 * - User is a member of the team OR has admin role
 * - Team exists in workspace
 * 
 * Creates a task in a "Requests" project (or wiki page if no project exists)
 */
async function executeCapacityRequest(
  action: Extract<LoopbrainAction, { type: 'capacity.request' }>,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<LoopbrainActionResult> {
  // Runtime guard: ensure prisma is defined
  if (!prisma) {
    logger.error('Prisma client is undefined in executor', {
      requestId,
      actionType: 'capacity.request',
    })
    throw new LoopbrainError('INTERNAL_ERROR', 500, 'Prisma client is not available', {
      isUserSafe: false,
      details: {
        requestId,
        actionType: 'capacity.request',
      },
    })
  }

  // Verify team exists in workspace
  const team = await prisma.orgTeam.findFirst({
    where: {
      id: action.teamId,
      workspaceId, // Enforce workspace scoping
    },
    include: {
      positions: {
        where: {
          userId,
          isActive: true,
        },
      },
    },
  })

  if (!team) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'Team not found in workspace')
  }

  // Validate access: user must be a member of the team OR have admin role
  const isTeamMember = team.positions.length > 0

  // Check if user has admin role in workspace
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
    },
    select: {
      role: true,
    },
  })

  const isAdmin = workspaceMember?.role === 'ADMIN' || workspaceMember?.role === 'OWNER'

  if (!isTeamMember && !isAdmin) {
    throw new LoopbrainError('ACCESS_DENIED', 403, 'You must be a member of the team or an admin to request capacity')
  }

  // Try to find or create a "Requests" project
  let requestsProject = await prisma.project.findFirst({
    where: {
      workspaceId,
      name: { contains: 'Requests', mode: 'insensitive' },
      isArchived: false,
    },
  })

  if (!requestsProject) {
    // Create a "Requests" project
    requestsProject = await prisma.project.create({
      data: {
        workspaceId,
        name: 'Requests',
        description: 'System project for capacity and resource requests',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        isArchived: false,
        createdById: userId, // Required field
      },
    })

    // Index the project (non-blocking)
    const createdProjectId = requestsProject.id
    indexOne({
      workspaceId,
      userId,
      entityType: 'project',
      entityId: createdProjectId,
      action: 'upsert',
      reason: 'action:capacity.request (project)',
      requestId,
    }).catch(err => {
      logger.error('Failed to index requests project', {
        requestId,
        projectId: createdProjectId,
        error: err,
      })
    })
  }

  // Create a task for the capacity request
  const requestTitle = `Capacity request: ${team.name}${action.roleHint ? ` (${action.roleHint})` : ''} - ${action.durationDays} days`
  const requestDescription = `**Capacity Request**

**Team:** ${team.name}
**Duration:** ${action.durationDays} days
**Role Hint:** ${action.roleHint || 'Any role'}
**Notes:** ${action.notes}

Requested by: ${userId}
Created via Loopbrain action.`

  const requestTask = await prisma.task.create({
    data: {
      workspaceId,
      projectId: requestsProject.id,
      title: requestTitle,
      description: requestDescription,
      status: 'TODO',
      priority: 'MEDIUM',
      assigneeId: null, // Unassigned initially
      createdById: userId, // Required field
    },
  })

  // Index the task (non-blocking)
  indexOne({
    workspaceId,
    userId,
    entityType: 'task',
    entityId: requestTask.id,
    action: 'upsert',
    reason: 'action:capacity.request',
    requestId,
  }).catch(err => {
    logger.error('Failed to index capacity request task', {
      requestId,
      taskId: requestTask.id,
      error: err,
    })
  })

  // Index the team (non-blocking)
  indexOne({
    workspaceId,
    userId,
    entityType: 'team',
    entityId: action.teamId,
    action: 'upsert',
    reason: 'action:capacity.request (team)',
    requestId,
  }).catch(err => {
    logger.error('Failed to index team after capacity request', {
      requestId,
      teamId: action.teamId,
      error: err,
    })
  })

  logger.info('Capacity request created via action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    taskId: requestTask.id,
    teamId: action.teamId,
    durationDays: action.durationDays,
  })

  return {
    ok: true,
    result: {
      actionType: 'capacity.request',
      entityId: requestTask.id,
      message: `Capacity request created for ${team.name} (${action.durationDays} days)`,
    },
    requestId,
  }
}

