/**
 * Embedding Repository
 * 
 * Data access layer for ContextEmbedding storage and retrieval.
 * Handles vector storage for semantic search capabilities using pgvector.
 * 
 * Rules:
 * - No business logic
 * - No embedding generation
 * - Strong typing only
 * - Handle nulls gracefully
 * - Workspace scoping enforced via workspaceId parameter
 */

import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
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
 * Search for similar context items using pgvector similarity search
 * 
 * Implementation: Database-side cosine similarity using pgvector extension
 * 
 * Algorithm:
 * 1. Use pgvector's <=> operator for cosine distance
 * 2. Filter by workspaceId (multi-tenant safety)
 * 3. Optionally filter by ContextItem type
 * 4. Apply similarity threshold to filter out low-quality matches
 * 5. Return top N results sorted by similarity (descending)
 * 
 * @param params - Search parameters
 * @returns Array of ContextItem records with similarity scores, sorted by score (descending)
 */
export async function searchEmbeddings(
  params: SearchEmbeddingsParams
): Promise<(ContextItemRecord & { similarityScore: number })[]> {
  const { workspaceId, vector, type, limit = 10 } = params

  // Default similarity threshold (0-1 scale, where 1 is identical)
  // 0.3 filters out very dissimilar results while keeping moderately relevant ones
  const threshold = 0.3

  try {
    // Build the SQL query with pgvector cosine distance operator (<=>)
    // Note: <=> returns distance (0 = identical, 2 = opposite), so we convert to similarity: 1 - distance/2
    // For cosine distance, the range is [0, 2], so similarity = 1 - (distance / 2)
    // However, for practical purposes, we use: similarity = 1 - distance (since distance is typically [0, 1])
    
    // Serialize vector as string for pgvector
    const vectorString = `[${vector.join(',')}]`
    
    // Build type filter clause
    const typeFilter = type 
      ? Prisma.sql`AND ci.type = ${type}`
      : Prisma.empty

    // Execute raw SQL query with pgvector operator
    const results = await prisma.$queryRaw<Array<{
      id: string
      contextId: string
      workspaceId: string
      type: string
      title: string
      summary: string | null
      data: unknown
      updatedAt: Date
      createdAt: Date
      similarity: number
    }>>`
      SELECT 
        ci.id,
        ci."contextId",
        ci."workspaceId",
        ci.type,
        ci.title,
        ci.summary,
        ci.data,
        ci."updatedAt",
        ci."createdAt",
        1 - (ce.embedding <=> ${vectorString}::vector) as similarity
      FROM context_embeddings ce
      INNER JOIN context_items ci ON ce."contextItemId" = ci.id
      WHERE ce."workspaceId" = ${workspaceId}
        ${typeFilter}
        AND 1 - (ce.embedding <=> ${vectorString}::vector) > ${threshold}
      ORDER BY ce.embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `

    // Map results to ContextItemRecord format with similarity score
    return results.map(row => ({
      id: row.id,
      contextId: row.contextId,
      workspaceId: row.workspaceId,
      type: row.type,
      title: row.title,
      summary: row.summary,
      data: row.data,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      similarityScore: row.similarity
    }))
  } catch (error: unknown) {
    logger.error('pgvector similarity search failed', {
      workspaceId,
      vectorDim: vector.length,
      type,
      limit,
      error: error instanceof Error ? error.message : String(error)
    })
    
    // If pgvector is not available, fall back to application-side search
    if (error instanceof Error && error.message.includes('operator does not exist')) {
      logger.warn('pgvector extension not available, falling back to application-side search')
      return fallbackApplicationSideSearch(params)
    }
    
    throw error
  }
}

/**
 * Fallback to application-side cosine similarity search
 * Used when pgvector extension is not available
 * 
 * @param params - Search parameters
 * @returns Array of ContextItem records with similarity scores
 */
async function fallbackApplicationSideSearch(
  params: SearchEmbeddingsParams
): Promise<(ContextItemRecord & { similarityScore: number })[]> {
  const { workspaceId, vector, type, limit = 10 } = params

  // Multi-tenant safety: Always filter by workspaceId first
  const whereClause: Record<string, unknown> = {
    workspaceId
  }

  // Optional type filter
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
    take: MAX_CANDIDATES_FOR_SEARCH,
    orderBy: {
      updatedAt: 'desc'
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
      
      if (candidateVector.length !== vector.length) {
        logger.warn('Vector dimension mismatch in similarity search', {
          queryDim: vector.length,
          candidateDim: candidateVector.length,
          contextItemId: candidate.contextItemId
        })
        continue
      }

      const score = cosineSimilarity(vector, candidateVector)
      
      if (score > 0) {
        results.push({
          ...candidate.contextItem,
          similarityScore: score
        })
      }
    } catch (error: unknown) {
      logger.error('Error computing similarity for candidate', {
        contextItemId: candidate.contextItemId,
        error
      })
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

