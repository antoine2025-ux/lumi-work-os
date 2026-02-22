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
import type { AgentPlan, ClarificationContext, AdvisoryContext } from '@/lib/loopbrain/agent/types'
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'
import { isOrgLoopbrainEnabled } from '@/lib/loopbrain/orgGate'
import { ensureOrgContextSyncedSync } from '@/lib/loopbrain/ensureOrgContextSynced'
import { handleApiError } from '@/lib/api-errors'

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
      pendingPlan?: AgentPlan
      conversationContext?: string
      pendingClarification?: ClarificationContext
      pendingAdvisory?: AdvisoryContext
    }

    try {
      body = await request.json()
    } catch (_error) {
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
      slackChannelHints: body.slackChannelHints, // From project edit (sent in request body, not persisted)
      pendingPlan: body.pendingPlan, // Agentic execution: plan from previous turn for confirmation
      conversationContext: body.conversationContext, // Clarification follow-ups: prior turns for context
      pendingClarification: body.pendingClarification, // Clarification answer routing
      pendingAdvisory: body.pendingAdvisory, // Advisory→execution transition
    } as any

    // Pass requestId to orchestrator for logging
    ;(loopbrainRequest as any).requestId = baseContext.requestId

    // Run Loopbrain query
    const result = await runLoopbrainQuery(loopbrainRequest)

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
    return handleApiError(error, request)
  }
}


