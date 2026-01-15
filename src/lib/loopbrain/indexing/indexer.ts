/**
 * Loopbrain Indexer
 * 
 * Single entrypoint for indexing ContextItems from Prisma entities.
 * Ensures ContextItems/Embeddings stay in sync with source-of-truth entities.
 * 
 * Rules:
 * - All indexing goes through this module
 * - Errors are normalized and logged, but don't block user operations
 * - Respects workspace scoping and ProjectSpace visibility
 */

import { ContextObject } from '@/lib/context/context-types'
import { saveContextItem, deleteContextItem, getContextItem } from '../store/context-repository'
import { toLoopbrainError } from '../errors'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'
import { PrismaClient } from '@prisma/client'
import { buildContextObjectForProject } from './builders/project'
import { buildContextObjectForTask } from './builders/task'
import { buildContextObjectForPage } from './builders/page'
import { buildContextObjectForEpic } from './builders/epic'
import { 
  buildContextObjectForPerson, 
  buildContextObjectForTeam, 
  buildContextObjectForRole 
} from './builders/org'
import { buildContextObjectForTimeOff } from './builders/time-off'

/**
 * Supported entity types for indexing
 */
export type IndexEntityType = 'project' | 'task' | 'page' | 'epic' | 'person' | 'team' | 'role' | 'time_off'

/**
 * Index action type
 */
export type IndexAction = 'upsert' | 'delete'

/**
 * Index request
 */
export interface IndexRequest {
  workspaceId: string
  userId: string
  entityType: IndexEntityType
  entityId: string
  action: IndexAction
  reason: string
  requestId?: string
}

/**
 * Index result
 */
export interface IndexResult {
  ok: boolean
  entityType: IndexEntityType
  entityId: string
  action: IndexAction
  didChange?: boolean
  error?: {
    code: string
    message: string
  }
}

/**
 * Index a single entity
 * 
 * @param req - Index request
 * @returns Index result
 */
export async function indexOne(req: IndexRequest): Promise<IndexResult> {
  const requestId = req.requestId || `index-${Date.now()}`
  const logContext = {
    requestId,
    workspaceId: req.workspaceId ? `${req.workspaceId.substring(0, 8)}...` : undefined,
    entityType: req.entityType,
    entityId: req.entityId,
    action: req.action,
    reason: req.reason,
  }

  try {
    if (req.action === 'delete') {
      // Delete ContextItem (cascade will delete embedding/summary)
      const existing = await getContextItem(
        req.entityId,
        req.entityType as any,
        req.workspaceId
      )

      if (existing) {
        await deleteContextItem(existing.id, req.workspaceId)
        logger.debug('Deleted ContextItem', {
          ...logContext,
          contextItemId: existing.id,
        })
      } else {
        logger.debug('ContextItem not found for deletion (already deleted)', logContext)
      }

      return {
        ok: true,
        entityType: req.entityType,
        entityId: req.entityId,
        action: req.action,
      }
    } else {
      // Upsert: Build ContextObject and save
      // Runtime guard: ensure prisma is defined
      if (!prisma) {
        logger.error('Prisma client is undefined in indexer', logContext)
        return {
          ok: false,
          entityType: req.entityType,
          entityId: req.entityId,
          action: req.action,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Prisma client is not available',
          },
        }
      }
      
      const contextObject = await buildContextObjectForIndexing(
        req.entityType,
        req.workspaceId,
        req.entityId,
        prisma
      )

      if (!contextObject) {
        // Entity not found or not visible - this is ok, just skip
        logger.debug('Entity not found or not visible, skipping index', logContext)
        return {
          ok: true,
          entityType: req.entityType,
          entityId: req.entityId,
          action: req.action,
        }
      }

      // Save ContextItem (Phase 3 invalidation-on-write is already there)
      const result = await saveContextItem(contextObject, {
        requestId: req.requestId,
      })

      logger.debug('Indexed entity', {
        ...logContext,
        contextItemId: result.contextItem.id,
        didChange: result.didChange,
      })

      return {
        ok: true,
        entityType: req.entityType,
        entityId: req.entityId,
        action: req.action,
        didChange: result.didChange,
      }
    }
  } catch (error) {
    const lbError = toLoopbrainError(error)
    logger.error('Indexing failed', {
      ...logContext,
      errorCode: lbError.code,
      errorMessage: lbError.message,
      error: error instanceof Error ? error.stack : String(error),
    })

    return {
      ok: false,
      entityType: req.entityType,
      entityId: req.entityId,
      action: req.action,
      error: {
        code: lbError.code,
        message: lbError.message,
      },
    }
  }
}

/**
 * Index multiple entities in batch
 * 
 * @param reqs - Array of index requests
 * @returns Batch result with stats
 */
export async function indexMany(
  reqs: IndexRequest[]
): Promise<{ ok: boolean; results: IndexResult[]; stats: { total: number; ok: number; failed: number } }> {
  const results = await Promise.all(reqs.map(req => indexOne(req)))

  const stats = {
    total: results.length,
    ok: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
  }

  return {
    ok: stats.failed === 0,
    results,
    stats,
  }
}

/**
 * Build ContextObject for indexing based on entity type
 * 
 * @param entityType - Entity type
 * @param workspaceId - Workspace ID
 * @param entityId - Entity ID
 * @param prismaClient - Prisma client instance (required)
 * @returns ContextObject or null if not found/not visible
 */
async function buildContextObjectForIndexing(
  entityType: IndexEntityType,
  workspaceId: string,
  entityId: string,
  prismaClient: PrismaClient
): Promise<ContextObject | null> {
  switch (entityType) {
    case 'project':
      return buildContextObjectForProject({ workspaceId, entityId, prisma: prismaClient })
    case 'task':
      return buildContextObjectForTask({ workspaceId, entityId, prisma: prismaClient })
    case 'page':
      return buildContextObjectForPage({ workspaceId, entityId, prisma: prismaClient })
    case 'epic':
      return buildContextObjectForEpic({ workspaceId, entityId, prisma: prismaClient })
    case 'person':
      return buildContextObjectForPerson({ workspaceId, entityId, prisma: prismaClient })
    case 'team':
      return buildContextObjectForTeam({ workspaceId, entityId, prisma: prismaClient })
    case 'role':
      return buildContextObjectForRole({ workspaceId, entityId, prisma: prismaClient })
    case 'time_off':
      return buildContextObjectForTimeOff({ workspaceId, entityId, prisma: prismaClient })
    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

