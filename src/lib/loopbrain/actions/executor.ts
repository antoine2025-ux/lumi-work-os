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
import type { User as NextAuthUser } from 'next-auth'
import { upsertIntegrationAllocation } from '@/lib/org/capacity/project-capacity'
import { getDefaultSpaceForUser } from '@/lib/spaces/get-default-space'
import {
  processLeaveRequest,
  LeaveRequestError,
} from '@/server/org/leave/process-leave-request'
import { createOrgPerson } from '@/server/org/people/write'

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

      case 'org.assign_to_project':
        return await executeOrgAssignToProject(action, workspaceId, userId, reqId)

      case 'org.approve_leave':
        return await executeOrgApproveLeave(action, workspaceId, userId, reqId)

      case 'org.update_capacity':
        return await executeOrgUpdateCapacity(action, workspaceId, userId, reqId)

      case 'org.assign_manager':
        return await executeOrgAssignManager(action, workspaceId, userId, reqId)

      case 'org.create_person':
        return await executeOrgCreatePerson(action, workspaceId, userId, reqId)

      default:
        throw new LoopbrainError('BAD_REQUEST', 400, `Unknown action type: ${(action as { type: string }).type}`)
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
  const nextAuthUser: NextAuthUser = {
    id: userId,
    email: null,
    name: null,
    image: null,
  }

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
  // Log action parameters (before validation)
  logger.info('Executing timeoff.create action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    actorUserId: userId ? `${userId.substring(0, 8)}...` : undefined,
    targetUserId: action.userId ? `${action.userId.substring(0, 8)}...` : undefined,
    startDate: action.startDate,
    endDate: action.endDate,
    timeOffType: action.timeOffType || 'vacation',
    hasNotes: !!action.notes,
  })

  // MVP: Only allow users to create time off for themselves
  if (action.userId !== userId) {
    throw new LoopbrainError('ACCESS_DENIED', 403, 'You can only create time off for yourself')
  }

  // Validate dates
  const startDate = new Date(action.startDate)
  const endDate = new Date(action.endDate)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new LoopbrainError('BAD_REQUEST', 400, 'Invalid date format')
  }

  if (startDate >= endDate) {
    throw new LoopbrainError('BAD_REQUEST', 400, 'Start date must be before end date')
  }

  // Verify user exists in workspace
  const user = await prisma.user.findFirst({
    where: {
      id: action.userId,
      workspaceMemberships: {
        some: {
          workspaceId,
        },
      },
    },
  })

  if (!user) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'User not found in workspace')
  }

  // Runtime guard: ensure prisma is defined
  if (!prisma) {
    logger.error('Prisma client is undefined in executor', {
      requestId,
      actionType: 'timeoff.create',
    })
    throw new LoopbrainError('INTERNAL_ERROR', 500, 'Prisma client is not available', {
      isUserSafe: false,
      details: {
        requestId,
        actionType: 'timeoff.create',
      },
    })
  }

  const leaveTypeMap: Record<string, string> = {
    vacation: 'VACATION',
    sick: 'SICK',
    personal: 'PERSONAL',
    other: 'PERSONAL',
  }
  const leaveType = leaveTypeMap[action.timeOffType || 'vacation'] ?? 'VACATION'
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  logger.debug('Creating leave request', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    userId: action.userId ? `${action.userId.substring(0, 8)}...` : undefined,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    leaveType,
  })

  let leaveRequest
  try {
    leaveRequest = await prisma.leaveRequest.create({
      data: {
        workspaceId,
        personId: action.userId,
        requesterId: userId,
        startDate,
        endDate,
        totalDays,
        leaveType,
        status: 'PENDING',
        notes: action.notes || null,
      },
    })
    logger.debug('Leave request created successfully', {
      requestId,
      leaveRequestId: leaveRequest.id,
    })
  } catch (prismaError) {
    logger.error('Failed to create leave request', {
      requestId,
      workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
      userId: action.userId ? `${action.userId.substring(0, 8)}...` : undefined,
      error: prismaError instanceof Error ? {
        name: prismaError.name,
        message: prismaError.message,
        stack: prismaError.stack,
      } : String(prismaError),
    })
    throw new LoopbrainError('INTERNAL_ERROR', 500, 'Failed to create leave request', {
      isUserSafe: false,
      details: {
        requestId,
        actionType: 'timeoff.create',
      },
      cause: prismaError instanceof Error ? prismaError : new Error(String(prismaError)),
    })
  }

  indexOne({
    workspaceId,
    userId,
    entityType: 'leave_request',
    entityId: leaveRequest.id,
    action: 'upsert',
    reason: 'action:timeoff.create',
    requestId,
  }).catch(err => {
    logger.error('Failed to index leave request after creation', {
      requestId,
      leaveRequestId: leaveRequest.id,
      error: err,
    })
  })

  indexOne({
    workspaceId,
    userId,
    entityType: 'person',
    entityId: action.userId,
    action: 'upsert',
    reason: 'action:timeoff.create (person)',
    requestId,
  }).catch(err => {
    logger.error('Failed to index person after leave request creation', {
      requestId,
      personId: action.userId,
      error: err,
    })
  })

  logger.info('Leave request created via action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    leaveRequestId: leaveRequest.id,
    userId: action.userId,
    startDate: action.startDate,
    endDate: action.endDate,
  })

  return {
    ok: true,
    result: {
      actionType: 'timeoff.create',
      entityId: leaveRequest.id,
      message: `Leave request submitted from ${action.startDate} to ${action.endDate} (pending approval)`,
    },
    requestId,
  }
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
    // Get default space for system project
    const defaultSpaceId = await getDefaultSpaceForUser(userId, workspaceId)
    if (!defaultSpaceId) {
      throw new LoopbrainError(
        'BAD_REQUEST',
        400,
        'Cannot create Requests project: no default space found'
      )
    }

    // Create a "Requests" project
    requestsProject = await prisma.project.create({
      data: {
        workspaceId,
        name: 'Requests',
        description: 'System project for capacity and resource requests',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        isArchived: false,
        createdById: userId,
        spaceId: defaultSpaceId
      },
    })

    // Index the project (non-blocking)
    indexOne({
      workspaceId,
      userId,
      entityType: 'project',
      entityId: requestsProject.id,
      action: 'upsert',
      reason: 'action:capacity.request (project)',
      requestId,
    }).catch(err => {
      logger.error('Failed to index requests project', {
        requestId,
        // requestsProject is guaranteed non-null here: either found or just created above
        projectId: requestsProject!.id,
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

/**
 * Execute org.assign_to_project action
 *
 * Validates:
 * - OrgPosition exists in workspace → resolves userId
 * - Project exists in workspace
 * - Requesting user has at least MEMBER role
 */
async function executeOrgAssignToProject(
  action: Extract<LoopbrainAction, { type: 'org.assign_to_project' }>,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<LoopbrainActionResult> {
  // Resolve OrgPosition → userId
  const position = await prisma.orgPosition.findFirst({
    where: { id: action.personId, workspaceId, isActive: true },
    include: { user: { select: { id: true, name: true } } },
  })

  if (!position?.userId) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'Person not found in workspace')
  }

  const personUserId = position.userId
  const personName = position.user?.name ?? 'Unknown'

  // Verify project exists in workspace
  const project = await prisma.project.findFirst({
    where: { id: action.projectId, workspaceId },
    select: { id: true, name: true },
  })

  if (!project) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'Project not found in workspace')
  }

  // Upsert ProjectMember
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: action.projectId, userId: personUserId } },
    create: {
      workspaceId,
      projectId: action.projectId,
      userId: personUserId,
      orgPositionId: position.id,
      role: ProjectRole.MEMBER,
    },
    update: {},
  })

  // Upsert integration allocation (idempotent)
  await upsertIntegrationAllocation(workspaceId, personUserId, action.projectId, userId)

  // Index person + project (non-blocking)
  indexOne({
    workspaceId,
    userId,
    entityType: 'person',
    entityId: personUserId,
    action: 'upsert',
    reason: 'action:org.assign_to_project (person)',
    requestId,
  }).catch(err => {
    logger.error('Failed to index person after org.assign_to_project', { requestId, error: err })
  })

  indexOne({
    workspaceId,
    userId,
    entityType: 'project',
    entityId: action.projectId,
    action: 'upsert',
    reason: 'action:org.assign_to_project (project)',
    requestId,
  }).catch(err => {
    logger.error('Failed to index project after org.assign_to_project', { requestId, error: err })
  })

  logger.info('Person assigned to project via action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    personId: action.personId,
    projectId: action.projectId,
  })

  return {
    ok: true,
    result: {
      actionType: 'org.assign_to_project',
      entityId: action.projectId,
      message: `${personName} assigned to ${project.name}`,
    },
    requestId,
  }
}

/**
 * Execute org.approve_leave action
 *
 * Delegates all permission checking and state transitions to processLeaveRequest.
 */
async function executeOrgApproveLeave(
  action: Extract<LoopbrainAction, { type: 'org.approve_leave' }>,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<LoopbrainActionResult> {
  if (action.action === 'deny' && !action.denialReason?.trim()) {
    throw new LoopbrainError('BAD_REQUEST', 400, 'Denial reason is required when denying a request')
  }

  let result
  try {
    result = await processLeaveRequest({
      leaveRequestId: action.leaveRequestId,
      workspaceId,
      actorUserId: userId,
      action: action.action,
      denialReason: action.denialReason,
    })
  } catch (err) {
    if (err instanceof LeaveRequestError) {
      const codeMap = {
        NOT_FOUND: 'BAD_REQUEST',
        NOT_PENDING: 'BAD_REQUEST',
        ACCESS_DENIED: 'ACCESS_DENIED',
        VALIDATION_ERROR: 'BAD_REQUEST',
      } as const
      const statusMap = { NOT_FOUND: 404, NOT_PENDING: 400, ACCESS_DENIED: 403, VALIDATION_ERROR: 400 } as const
      throw new LoopbrainError(codeMap[err.code], statusMap[err.code], err.message)
    }
    throw err
  }

  // Resolve person name for the message
  const person = await prisma.user.findUnique({
    where: { id: result.personId },
    select: { name: true },
  })
  const personName = person?.name ?? 'Unknown'
  const startStr = result.startDate.toISOString().slice(0, 10)
  const endStr = result.endDate.toISOString().slice(0, 10)
  const actionLabel = result.status === 'APPROVED' ? 'approved' : 'denied'

  // Index leave request + person (non-blocking)
  indexOne({
    workspaceId,
    userId,
    entityType: 'leave_request',
    entityId: action.leaveRequestId,
    action: 'upsert',
    reason: 'action:org.approve_leave',
    requestId,
  }).catch(err => {
    logger.error('Failed to index leave_request after org.approve_leave', { requestId, error: err })
  })

  indexOne({
    workspaceId,
    userId,
    entityType: 'person',
    entityId: result.personId,
    action: 'upsert',
    reason: 'action:org.approve_leave (person)',
    requestId,
  }).catch(err => {
    logger.error('Failed to index person after org.approve_leave', { requestId, error: err })
  })

  logger.info('Leave request processed via action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    leaveRequestId: action.leaveRequestId,
    status: result.status,
  })

  return {
    ok: true,
    result: {
      actionType: 'org.approve_leave',
      entityId: action.leaveRequestId,
      message: `Leave request ${actionLabel} for ${personName} (${startStr} – ${endStr})`,
    },
    requestId,
  }
}

/**
 * Execute org.update_capacity action
 *
 * Requires ADMIN or OWNER role.
 * Closes any open CapacityContract (effectiveTo = yesterday), then creates a new one.
 */
async function executeOrgUpdateCapacity(
  action: Extract<LoopbrainAction, { type: 'org.update_capacity' }>,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<LoopbrainActionResult> {
  // RBAC: ADMIN+ required
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  })

  if (workspaceMember?.role !== 'ADMIN' && workspaceMember?.role !== 'OWNER') {
    throw new LoopbrainError('ACCESS_DENIED', 403, 'ADMIN role required to update capacity')
  }

  // Verify person exists in workspace
  const person = await prisma.user.findFirst({
    where: {
      id: action.personId,
      workspaceMemberships: { some: { workspaceId } },
    },
    select: { id: true, name: true },
  })

  if (!person) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'Person not found in workspace')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Close any open contracts for this person
  await prisma.capacityContract.updateMany({
    where: { workspaceId, personId: action.personId, effectiveTo: null },
    data: { effectiveTo: yesterday },
  })

  // Create the new open-ended contract
  const newContract = await prisma.capacityContract.create({
    data: {
      workspaceId,
      personId: action.personId,
      weeklyCapacityHours: action.weeklyCapacityHours,
      effectiveFrom: today,
      effectiveTo: null,
      createdById: userId,
    },
    select: { id: true },
  })

  // Index person (non-blocking)
  indexOne({
    workspaceId,
    userId,
    entityType: 'person',
    entityId: action.personId,
    action: 'upsert',
    reason: 'action:org.update_capacity',
    requestId,
  }).catch(err => {
    logger.error('Failed to index person after org.update_capacity', { requestId, error: err })
  })

  logger.info('Capacity updated via action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    personId: action.personId,
    weeklyCapacityHours: action.weeklyCapacityHours,
    contractId: newContract.id,
  })

  return {
    ok: true,
    result: {
      actionType: 'org.update_capacity',
      entityId: newContract.id,
      message: `${person.name ?? 'Person'} capacity updated to ${action.weeklyCapacityHours}h/week`,
    },
    requestId,
  }
}

/**
 * Execute org.assign_manager action
 *
 * Requires ADMIN or OWNER role.
 * Creates a PersonManagerLink. Returns a no-op message if the link already exists.
 * Prevents self-assignment.
 */
async function executeOrgAssignManager(
  action: Extract<LoopbrainAction, { type: 'org.assign_manager' }>,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<LoopbrainActionResult> {
  // RBAC: ADMIN+ required
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  })

  if (workspaceMember?.role !== 'ADMIN' && workspaceMember?.role !== 'OWNER') {
    throw new LoopbrainError('ACCESS_DENIED', 403, 'ADMIN role required to assign managers')
  }

  // Prevent self-assignment
  if (action.managerId === action.reportId) {
    throw new LoopbrainError('BAD_REQUEST', 400, 'A person cannot be their own manager')
  }

  // Verify both people exist in workspace
  const [manager, report] = await Promise.all([
    prisma.user.findFirst({
      where: { id: action.managerId, workspaceMemberships: { some: { workspaceId } } },
      select: { id: true, name: true },
    }),
    prisma.user.findFirst({
      where: { id: action.reportId, workspaceMemberships: { some: { workspaceId } } },
      select: { id: true, name: true },
    }),
  ])

  if (!manager) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'Manager not found in workspace')
  }
  if (!report) {
    throw new LoopbrainError('BAD_REQUEST', 404, 'Report not found in workspace')
  }

  // Check if the link already exists (no-op if so)
  const existing = await prisma.personManagerLink.findFirst({
    where: { workspaceId, managerId: action.managerId, personId: action.reportId },
    select: { id: true },
  })

  if (existing) {
    logger.info('org.assign_manager no-op: link already exists', { requestId, existing: existing.id })
    return {
      ok: true,
      result: {
        actionType: 'org.assign_manager',
        entityId: existing.id,
        message: `${manager.name ?? 'Manager'} is already the manager of ${report.name ?? 'Report'}`,
      },
      requestId,
    }
  }

  const link = await prisma.personManagerLink.create({
    data: {
      workspaceId,
      managerId: action.managerId,
      personId: action.reportId,
    },
    select: { id: true },
  })

  // Index both people (non-blocking)
  for (const personId of [action.managerId, action.reportId]) {
    indexOne({
      workspaceId,
      userId,
      entityType: 'person',
      entityId: personId,
      action: 'upsert',
      reason: 'action:org.assign_manager',
      requestId,
    }).catch(err => {
      logger.error('Failed to index person after org.assign_manager', { requestId, personId, error: err })
    })
  }

  logger.info('Manager assigned via action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    managerId: action.managerId,
    reportId: action.reportId,
    linkId: link.id,
  })

  return {
    ok: true,
    result: {
      actionType: 'org.assign_manager',
      entityId: link.id,
      message: `${manager.name ?? 'Manager'} set as manager of ${report.name ?? 'Report'}`,
    },
    requestId,
  }
}

/**
 * Execute org.create_person action
 *
 * Requires ADMIN or OWNER role.
 * Delegates creation to createOrgPerson from the people write service.
 */
async function executeOrgCreatePerson(
  action: Extract<LoopbrainAction, { type: 'org.create_person' }>,
  workspaceId: string,
  userId: string,
  requestId: string
): Promise<LoopbrainActionResult> {
  // RBAC: ADMIN+ required
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    select: { role: true },
  })

  if (workspaceMember?.role !== 'ADMIN' && workspaceMember?.role !== 'OWNER') {
    throw new LoopbrainError('ACCESS_DENIED', 403, 'ADMIN role required to create people')
  }

  // Resolve team name for confirmation message (optional)
  let teamName: string | undefined
  if (action.teamId) {
    const team = await prisma.orgTeam.findFirst({
      where: { id: action.teamId, workspaceId },
      select: { name: true },
    })
    teamName = team?.name
  }

  const created = await createOrgPerson({
    workspaceId,
    fullName: action.fullName,
    email: action.email ?? null,
    title: action.title ?? null,
    departmentId: null,
    teamId: action.teamId ?? null,
    managerId: null,
  })

  // Index person (non-blocking)
  indexOne({
    workspaceId,
    userId,
    entityType: 'person',
    entityId: created.userId,
    action: 'upsert',
    reason: 'action:org.create_person',
    requestId,
  }).catch(err => {
    logger.error('Failed to index person after org.create_person', { requestId, error: err })
  })

  logger.info('Person created via action', {
    requestId,
    workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
    positionId: created.id,
    userId: created.userId,
  })

  const teamSuffix = teamName ? `, assigned to ${teamName}` : ''

  return {
    ok: true,
    result: {
      actionType: 'org.create_person',
      entityId: created.id,
      message: `${action.fullName} created${teamSuffix}`,
    },
    requestId,
  }
}

