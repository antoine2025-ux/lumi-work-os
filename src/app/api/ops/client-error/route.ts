import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { logOpsEvent } from '@/lib/ops/logger'
import { getUnifiedAuth } from '@/lib/unified-auth'

const ClientErrorSchema = z.object({
  route: z.string().max(500).optional(),
  message: z.string().max(1000),
  stack: z.string().max(2000).optional(),
  userAgent: z.string().max(500).optional(),
})

/**
 * POST /api/ops/client-error
 * 
 * Accepts client-side error reports and logs them as OpsEvents.
 * Only processes if OPS_LOGGING_ENABLED === "true"
 */
export async function POST(request: NextRequest) {
  // Only process if logging is enabled
  if (process.env.OPS_LOGGING_ENABLED !== 'true') {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const body = await request.json()
    const validated = ClientErrorSchema.parse(body)

    // Get auth context (optional - don't fail if not authenticated)
    let workspaceId: string | null = null
    let userId: string | null = null
    try {
      const auth = await getUnifiedAuth(request)
      workspaceId = auth.workspaceId
      userId = auth.user.userId
    } catch {
      // Not authenticated - that's OK for client errors
    }

    // Log the error event
    await logOpsEvent({
      kind: 'CLIENT_ERROR',
      workspaceId,
      userId,
      route: validated.route ?? null,
      meta: {
        message: validated.message,
        stack: validated.stack ? validated.stack.substring(0, 2000) : null,
        userAgent: validated.userAgent ?? null,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    // Silently ignore errors - don't break client error reporting
    if (process.env.NODE_ENV === 'development') {
      console.error('[ClientError] Failed to log error:', error)
    }
    return new NextResponse(null, { status: 204 })
  }
}

