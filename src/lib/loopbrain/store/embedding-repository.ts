/**
 * Embedding Repository
 * 
 * Data access layer for ContextEmbedding storage and retrieval.
 * Handles vector storage for semantic search capabilities.
 * 
 * Note: Vector search is a placeholder until pgvector is enabled in Step 4.
 * 
 * Rules:
 * - No business logic
 * - No embedding generation
 * - Strong typing only
 * - Handle nulls gracefully
 * - Workspace scoping enforced via workspaceId parameter
 */

import { prisma } from '@/lib/db'
import { ContextItemRecord } from './context-repository'
import { logger } from '@/lib/logger'

/**
 * Maximum number of candidate embeddings to fetch for similarity search
 * Limits CPU/memory usage as data grows
 */
const MAX_CANDIDATES_FOR_SEARCH = 500

/**
 * Parameters for vector similarity search
 */
export interface SearchEmbeddingsParams {
  workspaceId: string
  vector: number[]
  type?: string // ContextType enum value
  limit?: number
}

/**
 * Save an embedding for a context item
 * 
 * @param contextItemId - The ContextItem ID
 * @param vector - The embedding vector (array of floats)
 * @param workspaceId - The workspace ID for scoping
 */
export async function saveEmbedding(
  contextItemId: string,
  vector: number[],
  workspaceId: string
): Promise<void> {
  // Upsert embedding (update if exists, create if not)
  await prisma.contextEmbedding.upsert({
    where: {
      contextItemId
    },
    update: {
      embedding: vector,
      workspaceId,
      updatedAt: new Date()
    },
    create: {
      contextItemId,
      embedding: vector,
      workspaceId,
      updatedAt: new Date()
    }
  })
}

/**
 * Get embedding for a context item
 * 
 * @param contextItemId - The ContextItem ID
 * @returns The embedding vector or null if not found
 */
export async function getEmbedding(
  contextItemId: string
): Promise<number[] | null> {
  const embedding = await prisma.contextEmbedding.findUnique({
    where: {
      contextItemId
    },
    select: {
      embedding: true
    }
  })

  if (!embedding) {
    return null
  }

  return embedding.embedding as number[]
}

/**
 * Compute cosine similarity between two vectors
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity score (0-1, where 1 is identical)
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
  }

  // Compute dot product
  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  magnitudeA = Math.sqrt(magnitudeA)
  magnitudeB = Math.sqrt(magnitudeB)

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (magnitudeA * magnitudeB)
}

/**
 * Search for similar context items using vector similarity
 * 
 * MVP Implementation: Application-side cosine similarity search
 * 
 * Algorithm:
 * 1. Fetch candidate embeddings filtered by workspaceId (and optionally type)
 * 2. Limit candidates to MAX_CANDIDATES_FOR_SEARCH to avoid CPU/memory issues
 * 3. Compute cosine similarity for each candidate
 * 4. Sort by similarity score (descending)
 * 5. Return top N results with ContextItem data
 * 
 * Future: Replace with pgvector DB-side similarity search when available
 * 
 * @param params - Search parameters
 * @returns Array of ContextItem records with similarity scores, sorted by score (descending)
 */
export async function searchEmbeddings(
  params: SearchEmbeddingsParams
): Promise<(ContextItemRecord & { similarityScore: number })[]> {
  const { workspaceId, vector, type, limit = 10 } = params

  // Multi-tenant safety: Always filter by workspaceId first
  const whereClause: any = {
    workspaceId // CRITICAL: Always scope by workspaceId
  }

  // Optional type filter - filter by ContextItem type
  if (type) {
    whereClause.contextItem = {
      type
    }
  }

  // Fetch candidate embeddings (limited to avoid CPU/memory issues)
  const candidates = await prisma.contextEmbedding.findMany({
    where: whereClause,
    include: {
      contextItem: true
    },
    take: MAX_CANDIDATES_FOR_SEARCH, // Limit candidates
    orderBy: {
      updatedAt: 'desc' // Most recently updated first (heuristic)
    }
  })

  if (candidates.length === 0) {
    return []
  }

  // Compute cosine similarity for each candidate
  const results: (ContextItemRecord & { similarityScore: number })[] = []

  for (const candidate of candidates) {
    try {
      const candidateVector = candidate.embedding as number[]
      
      // Verify vector dimensions match
      if (candidateVector.length !== vector.length) {
        logger.warn('Vector dimension mismatch in similarity search', {
          queryDim: vector.length,
          candidateDim: candidateVector.length,
          contextItemId: candidate.contextItemId
        })
        continue
      }

      const score = cosineSimilarity(vector, candidateVector)
      
      // Only include results with positive similarity
      if (score > 0) {
        results.push({
          ...candidate.contextItem,
          similarityScore: score
        })
      }
    } catch (error) {
      logger.error('Error computing similarity for candidate', {
        contextItemId: candidate.contextItemId,
        error
      })
      // Continue with next candidate
    }
  }

  // Sort by similarity score (descending) and return top N
  results.sort((a, b) => b.similarityScore - a.similarityScore)
  
  return results.slice(0, limit)
}

/**
 * Delete embedding for a context item
 * 
 * @param contextItemId - The ContextItem ID
 * @param workspaceId - The workspace ID for scoping
 */
export async function deleteEmbedding(
  contextItemId: string,
  workspaceId: string
): Promise<void> {
  await prisma.contextEmbedding.deleteMany({
    where: {
      contextItemId,
      workspaceId // Ensure workspace scoping
    }
  })
}

