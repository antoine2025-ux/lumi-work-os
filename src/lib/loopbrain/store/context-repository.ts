/**
 * Context Repository
 * 
 * Data access layer for ContextItem storage and retrieval.
 * Handles Prisma operations and mapping between Prisma models and ContextObject types.
 * 
 * Rules:
 * - No business logic
 * - No inference
 * - No embedding generation
 * - Strong typing only
 * - Handle nulls gracefully
 * - Workspace scoping enforced via workspaceId parameter
 */

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ContextObject, ContextType } from '../context-types'

/**
 * Prisma model type for ContextItem (inferred from schema)
 */
export interface ContextItemRecord {
  id: string
  contextId: string
  workspaceId: string
  type: string
  title: string
  summary: string | null
  data: unknown // JSON field - will be typed as ContextObject
  updatedAt: Date
  createdAt: Date
}

/**
 * Parameters for listing context items
 */
export interface ListContextItemsParams {
  workspaceId: string
  type?: ContextType
  limit?: number
  offset?: number
}

/**
 * Save a context item to the database
 * 
 * @param context - The ContextObject to save (must extend BaseContext)
 * @returns The saved ContextItem record
 */
export async function saveContextItem(
  context: ContextObject
): Promise<ContextItemRecord> {
  // Extract title from context based on type
  const title = extractTitle(context)
  
  // Serialize entire ContextObject to JSON for Prisma JSON field
  const data = context as unknown as Prisma.InputJsonValue

  // Upsert to avoid P2002 race when two concurrent saves target the same context
  return await prisma.contextItem.upsert({
    where: { id: context.id },
    update: {
      title,
      summary: null, // Will be populated by summary repository
      data,
      updatedAt: new Date()
    },
    create: {
      id: context.id,
      contextId: context.id,
      workspaceId: context.workspaceId,
      type: context.type,
      title,
      summary: null,
      data,
      updatedAt: new Date(),
      createdAt: new Date()
    }
  }) as ContextItemRecord
}

/**
 * Get a context item by contextId, type, and workspaceId
 * 
 * @param contextId - The original entity ID
 * @param type - The ContextType
 * @param workspaceId - The workspace ID for scoping
 * @returns The ContextItem record or null if not found
 */
export async function getContextItem(
  contextId: string,
  type: ContextType,
  workspaceId: string
): Promise<ContextItemRecord | null> {
  const item = await prisma.contextItem.findFirst({
    where: {
      contextId,
      type,
      workspaceId
    }
  })

  return item as ContextItemRecord | null
}

/**
 * List context items with optional filtering
 * 
 * @param params - Query parameters
 * @returns Array of ContextItem records
 */
export async function listContextItems(
  params: ListContextItemsParams
): Promise<ContextItemRecord[]> {
  const { workspaceId, type, limit = 100, offset = 0 } = params

  const where: {
    workspaceId: string
    type?: string
  } = {
    workspaceId
  }

  if (type) {
    where.type = type
  }

  const items = await prisma.contextItem.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: {
      updatedAt: 'desc'
    }
  })

  return items as ContextItemRecord[]
}

/**
 * Get context items by workspace and type
 * 
 * @param workspaceId - The workspace ID
 * @param type - The context type to filter by
 * @returns Array of context items
 */
export async function findByWorkspaceAndType(
  workspaceId: string,
  type: ContextType
): Promise<ContextItemRecord[]> {
  const items = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: 100, // Limit to most recent 100 items
  })

  return items as ContextItemRecord[]
}

/**
 * Delete a context item by ID and workspaceId (for safety)
 * 
 * @param id - The ContextItem ID
 * @param workspaceId - The workspace ID for scoping
 */
export async function deleteContextItem(
  id: string,
  workspaceId: string
): Promise<void> {
  await prisma.contextItem.deleteMany({
    where: {
      id,
      workspaceId // Ensure workspace scoping
    }
  })
}

/**
 * Extract title from context object based on type
 * Helper function for mapping ContextObject to Prisma model
 */
function extractTitle(context: ContextObject): string {
  switch (context.type) {
    case ContextType.WORKSPACE:
      return context.name
    case ContextType.PAGE:
      return context.title
    case ContextType.PROJECT:
      return context.name
    case ContextType.TASK:
      return context.title
    case ContextType.EPIC:
      return context.title
    case ContextType.ORG:
      return `Org Context for ${context.workspaceId}`
    case ContextType.ACTIVITY:
      return `Activity Context for ${context.workspaceId}`
    case ContextType.UNIFIED:
      return `Unified Context for ${context.workspaceId}`
    case ContextType.GOAL:
      return context.title
    default:
      return 'Unknown Context'
  }
}

/**
 * Deserialize ContextItem data back to ContextObject
 * Type-safe conversion from Prisma JSON to ContextObject
 * 
 * @param item - The ContextItem record
 * @returns The deserialized ContextObject
 */
export function deserializeContextObject(
  item: ContextItemRecord
): ContextObject {
  // The data field contains the full serialized ContextObject
  return item.data as ContextObject
}

