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
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { searchSimilarContextItems } from '@/lib/loopbrain/embedding-service'
import { ContextType } from '@/lib/loopbrain/context-types'
import { logger } from '@/lib/logger'
import { LoopbrainSearchSchema } from '@/lib/validations/loopbrain'

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
    setWorkspaceContext(auth.workspaceId)

    // Use workspaceId from auth (preferred source)
    const workspaceId = auth.workspaceId

    // Parse and validate request body
    const body = LoopbrainSearchSchema.parse(await request.json())

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
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}






