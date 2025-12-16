/**
 * Loopbrain Embedding Service
 * 
 * Generates embeddings for ContextObjects and provides semantic search capabilities.
 * Uses OpenAI's text-embedding-3-small model for cost-effective embeddings.
 * 
 * Rules:
 * - Always filter by workspaceId for multi-tenant safety
 * - Fail fast if OPENAI_API_KEY is missing
 * - Log embedding dimensions for sanity checks
 * - Limit candidate embeddings for cosine search (200-500 max)
 */

import OpenAI from 'openai'
import { ContextObject, ContextType } from './context-types'
import { type ContextItemRecord } from './store/context-repository'
import { saveEmbedding, searchEmbeddings } from './store/embedding-repository'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Embedding model configuration
 */
const EMBEDDING_MODEL = 'text-embedding-3-small'
const EXPECTED_EMBEDDING_DIM = 1536 // text-embedding-3-small produces 1536-dimensional vectors
const MAX_CANDIDATES_FOR_SEARCH = 500 // Limit candidates to avoid CPU/memory issues

/**
 * Initialize OpenAI client for embeddings
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Please set it in your environment variables.'
    )
  }
  return new OpenAI({ apiKey })
}

/**
 * Generate embedding vector for a text string
 * 
 * @param input - Text to embed
 * @returns Embedding vector (array of floats)
 * @throws Error if API key is missing or API call fails
 */
export async function embedText(input: string): Promise<number[]> {
  if (!input || input.trim().length === 0) {
    throw new Error('Cannot embed empty text')
  }

  const client = getOpenAIClient()

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: input.trim()
    })

    const vector = response.data[0]?.embedding
    if (!vector || !Array.isArray(vector)) {
      throw new Error('Invalid embedding response from OpenAI')
    }

    // Sanity check: log dimension on first call, warn if unexpected
    if (vector.length !== EXPECTED_EMBEDDING_DIM) {
      logger.warn('Unexpected embedding dimension', {
        expected: EXPECTED_EMBEDDING_DIM,
        actual: vector.length,
        model: EMBEDDING_MODEL
      })
    } else {
      logger.debug('Embedding generated', {
        dimension: vector.length,
        model: EMBEDDING_MODEL
      })
    }

    return vector
  } catch (error) {
    logger.error('Failed to generate embedding', { error, model: EMBEDDING_MODEL })
    if (error instanceof Error) {
      throw new Error(`Embedding generation failed: ${error.message}`)
    }
    throw new Error('Embedding generation failed: Unknown error')
  }
}

/**
 * Build embedding text from a ContextObject
 * Extracts key fields to create a concise, structured text representation
 * 
 * @param context - The ContextObject to convert to text
 * @returns Concise text representation for embedding
 */
export function buildEmbeddingTextFromContext(context: ContextObject): string {
  const parts: string[] = []

  switch (context.type) {
    case ContextType.WORKSPACE:
      parts.push(context.name)
      if (context.description) parts.push(context.description)
      if (context.purpose) parts.push(`Purpose: ${context.purpose}`)
      break

    case ContextType.PAGE:
      parts.push(context.title)
      if (context.excerpt) {
        parts.push(context.excerpt)
      } else if (context.content) {
        // Use first 500 chars of content as excerpt
        const contentExcerpt = context.content.substring(0, 500).trim()
        if (contentExcerpt) parts.push(contentExcerpt)
      }
      if (context.category) parts.push(`Category: ${context.category}`)
      if (context.tags && context.tags.length > 0) {
        parts.push(`Tags: ${context.tags.join(', ')}`)
      }
      break

    case ContextType.PROJECT:
      parts.push(context.name)
      if (context.description) parts.push(context.description)
      parts.push(`Status: ${context.status}`)
      if (context.priority) parts.push(`Priority: ${context.priority}`)
      if (context.department) parts.push(`Department: ${context.department}`)
      if (context.team) parts.push(`Team: ${context.team}`)
      break

    case ContextType.TASK:
      parts.push(context.title)
      if (context.description) parts.push(context.description)
      parts.push(`Status: ${context.status}`)
      if (context.priority) parts.push(`Priority: ${context.priority}`)
      if (context.project?.name) parts.push(`Project: ${context.project.name}`)
      if (context.epic?.name) parts.push(`Epic: ${context.epic.name}`)
      break

    case ContextType.ORG:
      if (context.teams && context.teams.length > 0) {
        parts.push(`Teams: ${context.teams.map(t => t.name).join(', ')}`)
      }
      if (context.roles && context.roles.length > 0) {
        parts.push(`Roles: ${context.roles.map(r => r.title).join(', ')}`)
      }
      if (context.departments && context.departments.length > 0) {
        parts.push(`Departments: ${context.departments.map(d => d.name).join(', ')}`)
      }
      break

    case ContextType.ACTIVITY:
      if (context.activities && context.activities.length > 0) {
        const activityTexts = context.activities
          .slice(0, 10) // Limit to first 10 activities
          .map(a => `${a.action} on ${a.entity} ${a.entityId}`)
        parts.push(activityTexts.join('; '))
      }
      break

    case ContextType.UNIFIED:
      // Combine workspace + active entity text
      if (context.workspace) {
        parts.push(`Workspace: ${context.workspace.name}`)
        if (context.workspace.description) {
          parts.push(context.workspace.description)
        }
      }
      if (context.activePage) {
        parts.push(`Page: ${context.activePage.title}`)
        if (context.activePage.excerpt) parts.push(context.activePage.excerpt)
      }
      if (context.activeProject) {
        parts.push(`Project: ${context.activeProject.name}`)
        if (context.activeProject.description) {
          parts.push(context.activeProject.description)
        }
      }
      if (context.activeTask) {
        parts.push(`Task: ${context.activeTask.title}`)
        if (context.activeTask.description) {
          parts.push(context.activeTask.description)
        }
      }
      break
  }

  return parts.filter(p => p.trim().length > 0).join('\n')
}

/**
 * Parameters for embedding a context item
 */
export interface EmbedContextParams {
  workspaceId: string
  contextItemId: string
}

/**
 * Embed a context item and save to ContextEmbedding
 * 
 * @param params - Embedding parameters
 * @throws Error if context item not found or embedding fails
 */
export async function embedContextItem(
  params: EmbedContextParams
): Promise<void> {
  const { workspaceId, contextItemId } = params

  // Load context item directly from Prisma (by ID)
  const contextItem = await prisma.contextItem.findFirst({
    where: {
      id: contextItemId,
      workspaceId // Multi-tenant safety: enforce workspace scoping
    }
  })

  if (!contextItem) {
    throw new Error(`ContextItem not found: ${contextItemId} (workspace: ${workspaceId})`)
  }

  // Verify workspaceId matches (double-check multi-tenant safety)
  if (contextItem.workspaceId !== workspaceId) {
    throw new Error(
      `Workspace mismatch: context item belongs to ${contextItem.workspaceId}, not ${workspaceId}`
    )
  }

  // Deserialize ContextObject from JSON data
  const context = contextItem.data as ContextObject

  // Build embedding text from context
  const embeddingText = buildEmbeddingTextFromContext(context)
  if (!embeddingText || embeddingText.trim().length === 0) {
    logger.warn('Empty embedding text for context item', {
      contextItemId,
      type: context.type
    })
    // Still create embedding with minimal text to avoid errors
    const minimalText = `Type: ${context.type}`
    const vector = await embedText(minimalText)
    await saveEmbedding(contextItemId, vector, workspaceId)
    return
  }

  // Generate embedding
  const vector = await embedText(embeddingText)

  // Save to ContextEmbedding
  await saveEmbedding(contextItemId, vector, workspaceId)

  logger.debug('Context item embedded', {
    contextItemId,
    type: context.type,
    workspaceId,
    vectorDim: vector.length
  })
}

/**
 * Parameters for semantic search
 */
export interface SemanticSearchParams {
  workspaceId: string
  query: string
  type?: ContextType
  limit?: number
}

/**
 * Search result with similarity score
 */
export interface SearchResult {
  contextItemId: string
  contextId: string
  type: ContextType
  title: string
  score: number
}

/**
 * Search for similar context items using semantic search
 * 
 * @param params - Search parameters
 * @returns Array of search results sorted by similarity score (descending)
 * @throws Error if embedding generation fails
 */
export async function searchSimilarContextItems(
  params: SemanticSearchParams
): Promise<SearchResult[]> {
  const { workspaceId, query, type, limit = 10 } = params

  // Generate embedding for query
  const queryVector = await embedText(query)

  // Search using repository (handles cosine similarity)
  const contextItems = await searchEmbeddings({
    workspaceId,
    vector: queryVector,
    type,
    limit: Math.min(limit, 50) // Cap at 50 results
  })

  // Map to SearchResult format
  return contextItems.map(item => ({
    contextItemId: item.id,
    contextId: item.contextId,
    type: item.type as ContextType,
    title: item.title,
    score: (item as any).similarityScore || 0 // Similarity score from repository
  }))
}

