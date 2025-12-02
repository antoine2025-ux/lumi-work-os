/**
 * Loopbrain Embedding Backfill Helper
 * 
 * Server-only utility to backfill embeddings for existing ContextItems.
 * 
 * ⚠️ WARNING: This is for manual use only. Do NOT call this in a request handler.
 * This function processes all ContextItems for a workspace and can take a long time.
 * 
 * Usage:
 * - Call from a one-off script or temporary admin route
 * - Includes throttling to avoid rate limits
 * - Handles errors gracefully and continues processing
 */

import { prisma } from '@/lib/db'
import { embedContextItem } from './embedding-service'
import { logger } from '@/lib/logger'

/**
 * Parameters for backfill operation
 */
export interface BackfillParams {
  workspaceId: string
  type?: string // Optional: filter by ContextType
  batchSize?: number // Number of items to process before delay
  delayMs?: number // Delay between batches (ms)
}

/**
 * Backfill embeddings for all ContextItems in a workspace
 * 
 * @param params - Backfill parameters
 * @returns Statistics about the backfill operation
 */
export async function backfillWorkspaceEmbeddings(
  params: BackfillParams
): Promise<{
  total: number
  processed: number
  succeeded: number
  failed: number
  errors: Array<{ contextItemId: string; error: string }>
}> {
  const {
    workspaceId,
    type,
    batchSize = 10, // Process 10 items at a time
    delayMs = 1000 // 1 second delay between batches
  } = params

  logger.info('Starting embedding backfill', {
    workspaceId,
    type,
    batchSize,
    delayMs
  })

  // Build where clause
  const where: any = {
    workspaceId // Multi-tenant safety: always filter by workspaceId
  }

  if (type) {
    where.type = type
  }

  // Count total items
  const total = await prisma.contextItem.count({ where })
  
  logger.info('Found context items to backfill', {
    workspaceId,
    total,
    type
  })

  // Fetch all context items (paginated to avoid memory issues)
  let processed = 0
  let succeeded = 0
  let failed = 0
  const errors: Array<{ contextItemId: string; error: string }> = []

  let offset = 0
  const pageSize = 100 // Fetch 100 items at a time

  while (offset < total) {
    const items = await prisma.contextItem.findMany({
      where,
      select: {
        id: true,
        type: true,
        workspaceId: true
      },
      take: pageSize,
      skip: offset,
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Process items in batches
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)

      // Process batch
      for (const item of batch) {
        try {
          await embedContextItem({
            workspaceId: item.workspaceId,
            contextItemId: item.id
          })
          succeeded++
          processed++

          if (processed % 10 === 0) {
            logger.info('Backfill progress', {
              workspaceId,
              processed,
              total,
              succeeded,
              failed
            })
          }
        } catch (error) {
          failed++
          processed++
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          errors.push({
            contextItemId: item.id,
            error: errorMessage
          })
          logger.error('Failed to embed context item', {
            contextItemId: item.id,
            workspaceId: item.workspaceId,
            error: errorMessage
          })
        }
      }

      // Delay between batches (except for last batch)
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    offset += pageSize
  }

  logger.info('Embedding backfill completed', {
    workspaceId,
    total,
    processed,
    succeeded,
    failed,
    errorCount: errors.length
  })

  return {
    total,
    processed,
    succeeded,
    failed,
    errors: errors.slice(0, 100) // Limit error list to first 100
  }
}




