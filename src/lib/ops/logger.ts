import { prisma } from '@/lib/db'

/**
 * Log an ops event for monitoring and debugging.
 * 
 * This function is non-blocking and will silently fail if:
 * - OPS_LOGGING_ENABLED is not "true"
 * - Database write fails
 * 
 * Never stores PII:
 * - No emails, names, tokens
 * - No page content/body/html
 * - userId is stored for correlation only, not displayed in UI
 */
export async function logOpsEvent(input: {
  kind: 'REQUEST_TIMING' | 'CLIENT_ERROR' | 'BOOTSTRAP' | 'AI_USAGE'
  workspaceId?: string | null
  userId?: string | null  // For correlation only, not displayed in UI
  route?: string | null
  method?: string | null
  status?: number | null
  durationMs?: number | null
  authDurationMs?: number | null
  dbDurationMs?: number | null
  meta?: Record<string, unknown> | null
}): Promise<void> {
  // Only log if enabled
  if (process.env.OPS_LOGGING_ENABLED !== 'true') {
    return
  }

  // Fire-and-forget: don't block the request
  void prisma.opsEvent
    .create({
      data: {
        kind: input.kind,
        workspaceId: input.workspaceId ?? null,
        userId: input.userId ?? null,
        route: input.route ?? null,
        method: input.method ?? null,
        status: input.status ?? null,
        durationMs: input.durationMs ?? null,
        authDurationMs: input.authDurationMs ?? null,
        dbDurationMs: input.dbDurationMs ?? null,
        meta: input.meta ?? null,
      },
    })
    .catch((error) => {
      // Silently ignore errors - don't break the request flow
      // Log to console in development only
      if (process.env.NODE_ENV === 'development') {
        console.error('[OpsLogger] Failed to log event:', error)
      }
    })
}

