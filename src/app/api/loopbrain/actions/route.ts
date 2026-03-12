/**
 * Loopbrain Actions API
 * 
 * Endpoint for executing Loopbrain actions.
 * All actions require authentication and workspace access validation.
 * 
 * POST /api/loopbrain/actions
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { executeAction } from '@/lib/loopbrain/actions/executor'
import { LoopbrainActionSchema } from '@/lib/loopbrain/actions/action-types'
import { getRequestId } from '@/lib/loopbrain/request-id'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = getRequestId(request)

  try {
    // Authenticate and get workspace context
    const auth = await getUnifiedAuth(request)
    const workspaceId = auth.workspaceId

    if (!workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Workspace ID required',
          },
          requestId,
        },
        { status: 400 }
      )
    }

    // Assert workspace access (MEMBER or higher required for actions)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })
    setWorkspaceContext(workspaceId)

    // Parse and validate request body
    const body = await request.json()

    if (!body.action) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Action is required',
          },
          requestId,
        },
        { status: 400 }
      )
    }

    // Validate action with Zod
    const validationResult = LoopbrainActionSchema.safeParse(body.action)

    if (!validationResult.success) {
      logger.warn('Invalid action schema', {
        requestId,
        workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
        errors: validationResult.error.issues,
      })

      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid action format',
          },
          requestId,
        },
        { status: 400 }
      )
    }

    const action = validationResult.data

    // Execute action
    const result = await executeAction({
      action,
      workspaceId,
      userId: auth.user.userId,
      requestId,
    })

    const duration = Date.now() - startTime

    logger.info('Action executed', {
      requestId,
      workspaceId: workspaceId ? `${workspaceId.substring(0, 8)}...` : undefined,
      userId: auth.user.userId ? `${auth.user.userId.substring(0, 8)}...` : undefined,
      actionType: action.type,
      ok: result.ok,
      durationMs: duration,
    })

    // Return result
    if (result.ok) {
      return NextResponse.json(result, { status: 200 })
    } else {
      return NextResponse.json(result, { status: result.error?.code === 'ACCESS_DENIED' ? 403 : 400 })
    }
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

