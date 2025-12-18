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
    // Fetch time off with relations
    const timeOff = await prisma.timeOff.findFirst({
      where: {
        id: entityId,
        workspaceId, // Enforce workspace scoping
      },
      include: {
        user: true,
      },
    })

    if (!timeOff) {
      return null
    }

    // Build ContextObject using existing builder
    const contextObject = timeOffToContext(timeOff)

    // Ensure workspaceId is set
    return {
      ...contextObject,
      workspaceId,
    }
  } catch (error) {
    console.error('Failed to build time off context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

