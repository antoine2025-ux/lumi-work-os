/**
 * Loopbrain Semantic Search API
 * 
 * POST endpoint for semantic search over context items.
 * Uses embeddings and cosine similarity to find relevant context.
 * 
 * No LLM calls - retrieval only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { searchSimilarContextItems } from '@/lib/loopbrain/embedding-service'
import { ContextType } from '@/lib/loopbrain/context-types'
import { logger } from '@/lib/logger'

/**
 * POST /api/loopbrain/search
 * 
 * Request body:
 * {
 *   "query": "string (required)",
 *   "type": "workspace|page|project|task|org|activity|unified (optional)",
 *   "limit": number (optional, default: 10)
 * }
 * 
 * Response:
 * {
 *   "workspaceId": "string",
 *   "query": "string",
 *   "results": [
 *     {
 *       "contextItemId": "string",
 *       "contextId": "string",
 *       "type": "string",
 *       "title": "string",
 *       "score": number (0-1)
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth context (preferred source for workspaceId)
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })

    // Use workspaceId from auth (preferred source)
    const workspaceId = auth.workspaceId

    // Parse request body
    let body: {
      query?: string
      type?: string
      limit?: number
    }

    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'query is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate type if provided
    let contextType: ContextType | undefined
    if (body.type) {
      const validTypes = Object.values(ContextType)
      if (!validTypes.includes(body.type as ContextType)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
      contextType = body.type as ContextType
    }

    // Validate limit
    const limit = body.limit
      ? Math.min(Math.max(1, body.limit), 50) // Clamp between 1 and 50
      : 10

    // Perform semantic search
    const results = await searchSimilarContextItems({
      workspaceId,
      query: body.query.trim(),
      type: contextType,
      limit
    })

    // Return results
    return NextResponse.json({
      workspaceId,
      query: body.query.trim(),
      results: results.map(result => ({
        contextItemId: result.contextItemId,
        contextId: result.contextId,
        type: result.type,
        title: result.title,
        score: Math.round(result.score * 1000) / 1000 // Round to 3 decimal places
      }))
    })
  } catch (error) {
    logger.error('Error in loopbrain search API', { error })

    // Handle auth errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }
      if (error.message.includes('OPENAI_API_KEY')) {
        return NextResponse.json(
          { error: 'Embedding service not configured. OPENAI_API_KEY is missing.' },
          { status: 500 }
        )
      }
      if (error.message.includes('Embedding generation failed')) {
        return NextResponse.json(
          { error: 'Failed to generate embedding for query' },
          { status: 500 }
        )
      }
    }

    // Generic error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


