/**
 * Loopbrain Chat API
 * 
 * Unified endpoint for Loopbrain Orchestrator - the Virtual COO assistant.
 * Coordinates context retrieval, semantic search, and LLM calls.
 * 
 * This is a new endpoint separate from /api/ai/chat to avoid breaking changes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { runLoopbrainQuery } from '@/lib/loopbrain/orchestrator'
import { LoopbrainMode, LoopbrainRequest } from '@/lib/loopbrain/orchestrator-types'
import { logger } from '@/lib/logger'

/**
 * POST /api/loopbrain/chat
 * 
 * Request body:
 * {
 *   "mode": "spaces" | "org" | "dashboard",
 *   "query": "string (required)",
 *   "projectId": "string (optional)",
 *   "pageId": "string (optional)",
 *   "taskId": "string (optional)",
 *   "roleId": "string (optional)",
 *   "teamId": "string (optional)",
 *   "useSemanticSearch": boolean (optional, default: true),
 *   "maxContextItems": number (optional, default: 10)
 * }
 * 
 * Response: LoopbrainResponse
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth context (preferred source for workspaceId and userId)
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER']
    })

    // Multi-tenant safety: Always use workspaceId from auth, ignore any from client
    const workspaceId = auth.workspaceId
    const userId = auth.user.userId

    // Parse request body
    let body: {
      mode?: string
      query?: string
      projectId?: string
      pageId?: string
      taskId?: string
      roleId?: string
      teamId?: string
      useSemanticSearch?: boolean
      maxContextItems?: number
      sendToSlack?: boolean
      slackChannel?: string
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
    if (!body.mode || typeof body.mode !== 'string') {
      return NextResponse.json(
        { error: 'mode is required and must be a string' },
        { status: 400 }
      )
    }

    if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
      return NextResponse.json(
        { error: 'query is required and must be a non-empty string' },
        { status: 400 }
      )
    }

    // Validate mode
    const validModes: LoopbrainMode[] = ['spaces', 'org', 'dashboard']
    if (!validModes.includes(body.mode as LoopbrainMode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    // Build LoopbrainRequest (workspaceId and userId from auth, never from client)
    const loopbrainRequest: LoopbrainRequest = {
      workspaceId, // Always from auth
      userId, // Always from auth
      mode: body.mode as LoopbrainMode,
      query: body.query.trim(),
      projectId: body.projectId,
      pageId: body.pageId,
      taskId: body.taskId,
      roleId: body.roleId,
      teamId: body.teamId,
      useSemanticSearch: body.useSemanticSearch !== false, // Default to true
      maxContextItems: body.maxContextItems ? Math.min(Math.max(1, body.maxContextItems), 50) : 10,
      sendToSlack: body.sendToSlack === true, // Only true if explicitly set
      slackChannel: body.slackChannel
    }

    // Run Loopbrain query
    const result = await runLoopbrainQuery(loopbrainRequest)

    // Return response
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Error in Loopbrain chat API', { error })

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
      if (error.message.includes('Unsupported Loopbrain mode')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('LLM call failed')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable' },
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


