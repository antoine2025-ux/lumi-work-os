/**
 * Loopbrain Execute Stream API
 *
 * POST /api/loopbrain/execute-stream
 *
 * Streams execution progress via Server-Sent Events.
 * Used when user confirms a pending plan; fetches plan from session.
 */

import { NextRequest } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { loadSession } from '@/lib/loopbrain/session-store'
import { executePlanWithProgress, type ExecutionProgressEvent } from '@/lib/loopbrain/agent-loop'
import { LoopbrainExecuteStreamSchema } from '@/lib/validations/loopbrain'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const workspaceId = auth.workspaceId
    const userId = auth.user.userId

    const body = LoopbrainExecuteStreamSchema.parse(await request.json())
    const conversationId = body.conversationId

    const session = await loadSession(workspaceId, userId, conversationId)
    const pendingPlan = session.pendingPlan
    if (!pendingPlan || pendingPlan.toolCalls.length === 0) {
      console.error('[ExecuteStream] No pending plan found')
      return new Response(
        JSON.stringify({ error: 'No pending plan to execute' }),
        { status: 400 }
      )
    }

    console.log('[ExecuteStream] Route handler: Plan loaded from session:', {
      conversationId,
      planStepCount: pendingPlan.toolCalls.length,
      toolNames: pendingPlan.toolCalls.map((tc) => tc.name),
    })
    logger.info('[ExecuteStream] Starting execution', {
      conversationId,
      workspaceId,
      userId,
      planStepCount: pendingPlan.toolCalls.length,
      toolNames: pendingPlan.toolCalls.map((tc) => tc.name),
    })
    logger.info('[ExecuteStream] Plan steps', {
      steps: pendingPlan.toolCalls.map((tc) => ({
        name: tc.name,
        arguments: tc.arguments,
        argumentsType: typeof tc.arguments,
      })),
    })

    const sessionWithPlan = {
      ...session,
      pendingPlan,
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    })

    const rawRole = auth.user.roles[0] ?? 'MEMBER'
    const userRole = (
      ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] as const
    ).includes(rawRole as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER')
      ? (rawRole as 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER')
      : ('MEMBER' as const)

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: ExecutionProgressEvent) => {
          console.log('[ExecuteStream] SSE event:', { type: event.type, stepIndex: event.stepIndex, status: event.status })
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        }

        try {
          console.log('[ExecuteStream] Calling executePlanWithProgress...')
          await executePlanWithProgress(
            sessionWithPlan,
            {
              workspaceId,
              userId,
              conversationId,
              userMessage: 'yes',
              userRole,
              userContext: {
                name: auth.user.name || auth.user.email,
                email: auth.user.email,
                timezone: 'UTC',
                workspaceName: workspace?.name ?? workspaceId,
              },
            },
            send
          )
          console.log('[ExecuteStream] executePlanWithProgress completed successfully')
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Execution failed'
          logger.error('[ExecuteStream] Execution error', {
            error: err,
            message: msg,
            stack: err instanceof Error ? err.stack : undefined,
          })
          send({ type: 'error', error: msg })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error: unknown) {
    console.error('[execute-stream] Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Execution stream failed',
      }),
      { status: 500 }
    )
  }
}
