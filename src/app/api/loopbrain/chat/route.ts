/**
 * Loopbrain Chat API
 * 
 * Unified endpoint for Loopbrain Orchestrator - the Virtual COO assistant.
 * Coordinates context retrieval, semantic search, and LLM calls.
 * 
 * This is a new endpoint separate from /api/ai/chat to avoid breaking changes.
 */

export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import type { AgentPlan } from '@/lib/loopbrain/agent/types'
import { runAgentLoop } from '@/lib/loopbrain/agent-loop'
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'
import { isOrgLoopbrainEnabled } from '@/lib/loopbrain/orgGate'
import { ensureOrgContextSyncedSync } from '@/lib/loopbrain/ensureOrgContextSynced'
import { handleApiError } from '@/lib/api-errors'
import { formatActionForUser } from '@/lib/loopbrain/format-action'
import { LoopbrainChatSchema } from '@/lib/validations/loopbrain'

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

    // Workspace scoping for Prisma queries
    setWorkspaceContext(auth.workspaceId)

    // Multi-tenant safety: Always use workspaceId from auth, ignore any from client
    const workspaceId = auth.workspaceId
    const userId = auth.user.userId

    // Parse and validate request body
    const body = LoopbrainChatSchema.parse(await request.json())

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

    // Check if Org Loopbrain is enabled (only for org mode)
    if (body.mode === 'org') {
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
      } catch (error: unknown) {
        logger.error('Failed to ensure org context synced', {
          ...baseContext,
          workspaceId,
        }, error)
        // Don't fail the request - continue with potentially incomplete context
      }
    }

    // Run agent loop (the only execution path)
    try {
      const conversationId = body.conversationId || crypto.randomUUID()

      // Resolve workspace name for system prompt (one lightweight query)
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true },
      })

      // Derive highest role from auth (roles array contains the workspace role)
      const rawRole = auth.user.roles[0] ?? 'MEMBER'
      const userRole = (['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] as const).includes(
        rawRole as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER'
      )
        ? (rawRole as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER')
        : ('MEMBER' as const)

      const agentResult = await runAgentLoop({
        workspaceId,
        userId,
        conversationId,
        userMessage: body.query.trim(),
        userRole,
        userContext: {
          name: auth.user.name || auth.user.email,
          email: auth.user.email,
          timezone: 'UTC',
          workspaceName: workspace?.name ?? workspaceId,
        },
      })

      const durationMs = Date.now() - startTime
      logger.info('Loopbrain agent loop completed', {
        ...baseContext,
        conversationId,
        toolCallsMade: agentResult.toolCallsMade.length,
        hasPendingPlan: !!agentResult.pendingPlan,
        durationMs,
      })

      // Transform session-store PendingPlan → AgentPlan shape expected by the UI
      const rawPlan = agentResult.pendingPlan ?? null
      const pendingPlan: AgentPlan | null = rawPlan
        ? {
            reasoning: rawPlan.originalAssistantMessage,
            requiresConfirmation: true,
            steps: rawPlan.toolCalls.map((tc, i) => ({
              stepNumber: i + 1,
              toolName: tc.name,
              parameters: tc.arguments,
              description: buildStepDescription(tc.name, tc.arguments),
            })),
          }
        : null

      // Substitute raw JSON confirmation with friendly message when plan requires confirmation
      const answer =
        pendingPlan != null
          ? "I've prepared an execution plan. Review the steps below and click Proceed when ready."
          : agentResult.response

      return NextResponse.json({
        answer,
        conversationId: agentResult.conversationId,
        pendingPlan,
        toolCallsMade: agentResult.toolCallsMade,
        clientAction: agentResult.clientAction ?? null,
        // Backward-compatible with old orchestrator response shape
        context: {
          retrievedItems: [],
        },
        confidence: 'high',
        intent: 'agent',
      })
    } catch (agentError) {
      const message = agentError instanceof Error ? agentError.message : 'Agent loop failed'
      console.error('[Loopbrain agent loop error]', agentError)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

/**
 * Derive a human-readable step description from a tool call's name and arguments.
 * Used when transforming the session-store PendingPlan into the AgentPlan UI shape.
 */
function buildStepDescription(name: string, args: Record<string, unknown>): string {
  return formatActionForUser(name, args ?? {})
}
