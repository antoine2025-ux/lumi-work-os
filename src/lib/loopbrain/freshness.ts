/**
 * Freshness Utilities
 * 
 * Determines if embeddings and summaries are stale relative to their source ContextItems.
 * Stale data is excluded from retrieval to ensure correctness.
 */

/**
 * Maximum number of embeddings to regenerate inline during a single request
 * Prevents unbounded regeneration that could slow down user requests
 */
export const MAX_INLINE_REGEN = 3

/**
 * Cooldown period (in milliseconds) before allowing re-regeneration of the same item
 * Prevents repeated regeneration thrash if an item is updated multiple times quickly
 */
export const REGEN_COOLDOWN_MS = 60_000 // 1 minute

/**
 * Check if an embedding is stale
 * 
 * An embedding is stale if:
 * - No embedding exists (null/undefined)
 * - The embedding was last updated before the ContextItem was last updated
 * 
 * Note: ContextEmbedding uses `updatedAt` (not `createdAt`), so we compare
 * embedding.updatedAt to contextItem.updatedAt.
 * 
 * @param contextItemUpdatedAt - When the ContextItem was last updated
 * @param embeddingUpdatedAt - When the embedding was last updated (optional)
 * @returns true if embedding is stale or missing
 */
export function isStale(
  contextItemUpdatedAt: Date,
  embeddingUpdatedAt?: Date | null
): boolean {
  // No embedding = stale
  if (!embeddingUpdatedAt) {
    return true
  }
  
  // Embedding updated before ContextItem update = stale
  return embeddingUpdatedAt < contextItemUpdatedAt
}

/**
 * Check if a summary is stale
 * 
 * A summary is stale if:
 * - No summary exists (null/undefined)
 * - The summary was updated before the ContextItem was last updated
 * 
 * @param contextItemUpdatedAt - When the ContextItem was last updated
 * @param summaryUpdatedAt - When the summary was last updated (optional)
 * @returns true if summary is stale or missing
 */
export function isSummaryStale(
  contextItemUpdatedAt: Date,
  summaryUpdatedAt?: Date | null
): boolean {
  // No summary = stale
  if (!summaryUpdatedAt) {
    return true
  }
  
  // Summary updated before ContextItem update = stale
  return summaryUpdatedAt < contextItemUpdatedAt
}

