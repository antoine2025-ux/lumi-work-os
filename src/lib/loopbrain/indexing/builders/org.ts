/**
 * Org Index Builder
 * 
 * Fetches org entities (person/team/role) and builds ContextObjects for indexing.
 */

import { PrismaClient } from '@prisma/client'
import { ContextObject } from '@/lib/context/context-types'
import { personToContext, teamToContext, roleToContext, type WorkloadStats } from '@/lib/context/context-builders'
import { LoopbrainError } from '@/lib/loopbrain/errors'

export interface BuildContextObjectParams {
  workspaceId: string
  entityId: string
  userId?: string
  prisma: PrismaClient
}

/**
 * Build ContextObject for a person (User with OrgPosition)
 * 
 * @param params - Build parameters
 * @returns ContextObject or null if not found
 */
export async function buildContextObjectForPerson(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params

  // Runtime guard: ensure prisma is provided
  if (!prisma) {
    throw new LoopbrainError('INTERNAL_ERROR', 500, 'Prisma client is required for person indexing', {
      isUserSafe: false,
      details: {
        requestId: params.userId || 'unknown',
        entityType: 'person',
      },
    })
  }

  try {
    // Fetch user (person) with org position and relations
    const user = await prisma.user.findFirst({
      where: {
        id: entityId,
      },
      include: {
        orgPositions: {
          where: {
            workspaceId,
            isActive: true,
          },
          include: {
            team: true,
          },
          take: 1, // Use first active position
        },
      },
    })

    if (!user || !user.orgPositions || user.orgPositions.length === 0) {
      return null
    }

    const position = user.orgPositions[0]

    // Compute workload stats
    const taskCounts = await prisma.task.groupBy({
      by: ['status'],
      where: {
        workspaceId,
        assigneeId: user.id,
      },
      _count: true,
    })

    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const tasksOverdue = await prisma.task.count({
      where: {
        workspaceId,
        assigneeId: user.id,
        dueDate: {
          lt: now,
        },
        status: {
          not: 'DONE',
        },
      },
    })

    const tasksDueNext7Days = await prisma.task.count({
      where: {
        workspaceId,
        assigneeId: user.id,
        dueDate: {
          gte: now,
          lte: nextWeek,
        },
        status: {
          not: 'DONE',
        },
      },
    })

    const tasksInProgress = taskCounts.find(c => c.status === 'IN_PROGRESS')?._count || 0
    const tasksAssignedTotal = taskCounts.reduce((sum, c) => sum + c._count, 0)

    const workloadStats: WorkloadStats = {
      tasksAssignedTotal,
      tasksInProgress,
      tasksOverdue,
      tasksDueNext7Days,
    }

    // Fetch leave request (active + upcoming 30 days)
    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        workspaceId,
        personId: user.id,
        status: 'APPROVED',
        OR: [
          {
            startDate: { lte: now },
            endDate: { gte: now },
          },
          {
            startDate: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
          },
        ],
      },
      orderBy: {
        startDate: 'asc',
      },
    })

    // Build ContextObject using existing builder
    const contextObject = personToContext(user, workspaceId, {
      role: { ...position, user: null } as unknown as NonNullable<NonNullable<Parameters<typeof personToContext>[2]>['role']>,
      team: position.team || undefined,
      workloadStats,
      timeOff: leaveRequest ? {
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        type: leaveRequest.leaveType,
      } : undefined,
    })

    return contextObject
  } catch (error: unknown) {
    console.error('Failed to build person context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Build ContextObject for a team
 * 
 * @param params - Build parameters
 * @returns ContextObject or null if not found
 */
export async function buildContextObjectForTeam(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params

  // Runtime guard: ensure prisma is provided
  if (!prisma) {
    throw new LoopbrainError('INTERNAL_ERROR', 500, 'Prisma client is required for team indexing', {
      isUserSafe: false,
      details: {
        requestId: params.userId || 'unknown',
        entityType: 'team',
      },
    })
  }

  try {
    // Fetch team with relations
    const team = await prisma.orgTeam.findFirst({
      where: {
        id: entityId,
        workspaceId, // Enforce workspace scoping
      },
      include: {
        department: true,
        positions: {
          where: {
            isActive: true,
          },
          include: {
            user: true,
          },
        },
      },
    })

    if (!team) {
      return null
    }

    // Build ContextObject using existing builder
    const contextObject = teamToContext(team)

    // Ensure workspaceId is set
    return {
      ...contextObject,
      workspaceId,
    }
  } catch (error: unknown) {
    console.error('Failed to build team context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Build ContextObject for a role (OrgPosition)
 * 
 * @param params - Build parameters
 * @returns ContextObject or null if not found
 */
export async function buildContextObjectForRole(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params

  // Runtime guard: ensure prisma is provided
  if (!prisma) {
    throw new LoopbrainError('INTERNAL_ERROR', 500, 'Prisma client is required for role indexing', {
      isUserSafe: false,
      details: {
        requestId: params.userId || 'unknown',
        entityType: 'role',
      },
    })
  }

  try {
    // Fetch role (OrgPosition) with relations
    const role = await prisma.orgPosition.findFirst({
      where: {
        id: entityId,
        workspaceId, // Enforce workspace scoping
      },
      include: {
        user: true,
        team: true,
      },
    })

    if (!role) {
      return null
    }

    // Build ContextObject using existing builder
    const contextObject = roleToContext(role, {
      person: role.user || undefined,
      team: role.team || undefined,
    })

    // Ensure workspaceId is set
    return {
      ...contextObject,
      workspaceId,
    }
  } catch (error: unknown) {
    console.error('Failed to build role context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

