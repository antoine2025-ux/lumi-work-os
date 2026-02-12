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
import { buildLogContextFromRequest } from '@/lib/request-context'
import { isOrgLoopbrainEnabled } from '@/lib/loopbrain/orgGate'
import { ensureOrgContextSyncedSync } from '@/lib/loopbrain/ensureOrgContextSynced'

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
  const startTime = Date.now()
  const baseContext = await buildLogContextFromRequest(request)
  
  logger.info('Incoming request /api/loopbrain/chat', baseContext)
  
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
      epicId?: string
      roleId?: string
      teamId?: string
      personId?: string
      useSemanticSearch?: boolean
      maxContextItems?: number
      sendToSlack?: boolean
      slackChannel?: string
      clientMetadata?: Record<string, unknown>
      slackChannelHints?: string[]
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

    // Fix routing: ensure projectId triggers spaces mode
    // If projectId, pageId, taskId, or epicId is present, force spaces mode
    let finalMode = body.mode as LoopbrainMode
    if (body.projectId || body.pageId || body.taskId || body.epicId) {
      finalMode = 'spaces'
    }

    // Check if Org Loopbrain is enabled (only for org mode)
    if (finalMode === 'org') {
      const orgEnabled = await isOrgLoopbrainEnabled(workspaceId)
      if (!orgEnabled) {
        return NextResponse.json(
          {
            error: 'Org Loopbrain is not enabled for this workspace.',
            mode: 'org',
            workspaceId
          },
          { status: 403 }
        )
      }

      // Ensure org context is synced before answering org queries
      // This is a preflight check that syncs if no context exists
      try {
        const didSync = await ensureOrgContextSyncedSync(workspaceId)
        if (didSync) {
          logger.info('Org context synced before query', {
            ...baseContext,
            workspaceId,
          })
        }
      } catch (error) {
        logger.error('Failed to ensure org context synced', {
          ...baseContext,
          workspaceId,
        }, error)
        // Don't fail the request - continue with potentially incomplete context
      }
    }

    // Build LoopbrainRequest (workspaceId and userId from auth, never from client)
    const loopbrainRequest: LoopbrainRequest = {
      workspaceId, // Always from auth
      userId, // Always from auth
      mode: finalMode,
      query: body.query.trim(),
      projectId: body.projectId,
      pageId: body.pageId,
      taskId: body.taskId,
      epicId: body.epicId,
      roleId: body.roleId,
      teamId: body.teamId,
      personId: body.personId,
      useSemanticSearch: body.useSemanticSearch !== false, // Default to true
      maxContextItems: body.maxContextItems ? Math.min(Math.max(1, body.maxContextItems), 50) : 10,
      sendToSlack: body.sendToSlack === true, // Only true if explicitly set
      slackChannel: body.slackChannel,
      clientMetadata: body.clientMetadata,
      slackChannelHints: body.slackChannelHints // From project edit (sent in request body, not persisted)
    } as any

    // Pass requestId to orchestrator for logging
    ;(loopbrainRequest as any).requestId = baseContext.requestId

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:pre-run',message:'Before runLoopbrainQuery',data:{mode:finalMode,workspaceId,userId:userId?.slice(0,8)},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    // Run Loopbrain query
    const result = await runLoopbrainQuery(loopbrainRequest)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:post-run',message:'After runLoopbrainQuery',data:{hasResult:!!result},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion

    // Log completion
    const durationMs = Date.now() - startTime
    logger.info('Loopbrain chat completed', {
      ...baseContext,
      mode: finalMode,
      queryLength: body.query.length,
      durationMs,
    })

    // Log slow requests
    if (durationMs > 1000) {
      logger.warn('Slow request /api/loopbrain/chat', {
        ...baseContext,
        durationMs,
      })
    }

    // Return response
    return NextResponse.json(result)
  } catch (error) {
    const durationMs = Date.now() - startTime
    logger.error('Error in /api/loopbrain/chat', {
      ...baseContext,
      durationMs,
    }, error)
    // #region agent log
    const err = error instanceof Error ? error : new Error(String(error))
    fetch('http://127.0.0.1:7242/ingest/2a79ccc7-8419-4f6b-84d3-31982e160042',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat/route.ts:catch',message:'Chat route caught',data:{message:err.message,stack:err.stack?.slice(0,500),name:err.name},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion

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


