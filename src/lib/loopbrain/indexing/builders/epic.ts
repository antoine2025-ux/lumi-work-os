/**
 * Epic Index Builder
 * 
 * Fetches an epic and builds a ContextObject for indexing.
 */

import { PrismaClient } from '@prisma/client'
import { ContextObject, ContextRelation } from '@/lib/context/context-types'

export interface BuildContextObjectParams {
  workspaceId: string
  entityId: string
  userId?: string
  prisma: PrismaClient
}

/**
 * Build ContextObject for an epic
 * 
 * @param params - Build parameters
 * @returns ContextObject or null if not found
 */
export async function buildContextObjectForEpic(
  params: BuildContextObjectParams
): Promise<ContextObject | null> {
  const { workspaceId, entityId, prisma } = params

  try {
    // Fetch epic with relations
    const epic = await prisma.epic.findFirst({
      where: {
        id: entityId,
        workspaceId, // Enforce workspace scoping
      },
      include: {
        project: true,
      },
    })

    if (!epic) {
      return null
    }

    // Build ContextObject manually (epicToContext doesn't exist yet)
    const relations: ContextRelation[] = []
    if (epic.projectId) {
      relations.push({
        type: 'project',
        id: epic.projectId,
        label: 'belongs to',
        direction: 'out',
      })
    }

    const contextObject: ContextObject = {
      id: epic.id,
      type: 'epic',
      title: epic.title,
      summary: `Epic${epic.project ? ` in ${epic.project.name}` : ''}${epic.description ? `: ${epic.description.substring(0, 100)}` : ''}`,
      tags: ['epic'],
      status: 'active', // Epic doesn't have status in schema
      updatedAt: epic.updatedAt,
      relations,
      metadata: {
        color: epic.color || undefined,
        order: epic.order,
        description: epic.description || undefined,
      },
      workspaceId,
    }

    return contextObject
  } catch (error: unknown) {
    console.error('Failed to build epic context object', {
      workspaceId,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

