/**
 * Time Off Index Builder
 * 
 * Fetches a time off entry and builds a ContextObject for indexing.
 */

import { PrismaClient } from '@prisma/client'
import { ContextObject } from '@/lib/context/context-types'
import { timeOffToContext } from '@/lib/context/context-builders'

export interface BuildContextObjectParams {
  workspaceId: string
  entityId: string
  userId?: string
  prisma: PrismaClient
}

/**
 * Build ContextObject for a time off entry
 * 
 * @param params - Build parameters
 * @returns ContextObject or null if not found
 */
export async function buildContextObjectForTimeOff(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params

  try {
    // Fetch leave request with relations
    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        id: entityId,
        workspaceId, // Enforce workspace scoping
      },
    })

    if (!leaveRequest) {
      return null
    }

    // Build ContextObject using existing builder
    // Map LeaveRequest fields to timeOff format for builder
    const contextObject = timeOffToContext({
      id: leaveRequest.id,
      userId: leaveRequest.personId,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      type: leaveRequest.leaveType,
      status: leaveRequest.status,
      updatedAt: leaveRequest.updatedAt,
    }, workspaceId)

    return contextObject
  } catch (error: unknown) {
    console.error('Failed to build time off context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

