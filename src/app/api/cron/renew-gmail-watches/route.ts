/**
 * Cron Job: Renew Gmail Push Notification Watches
 *
 * GET /api/cron/renew-gmail-watches
 *
 * Runs daily. Gmail watches expire after 7 days; this job renews any
 * watch expiring within the next 48 hours and sets up watches for
 * users who don't have one yet.
 *
 * Auth: x-cron-secret or Authorization: Bearer must match CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { findExpiringWatches, renewGmailWatch } from '@/lib/integrations/gmail/watch'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000

function getCronSecret(): string | null {
  return process.env.LOOPBRAIN_CRON_SECRET ?? process.env.CRON_SECRET ?? null
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getCronSecret()
  if (!secret) return process.env.NODE_ENV !== 'production'
  const headerSecret =
    request.headers.get('x-cron-secret') ??
    request.headers
      .get('authorization')
      ?.replace(/^Bearer\s+/i, '')
      .trim()
  return headerSecret === secret
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const watches = await findExpiringWatches(FORTY_EIGHT_HOURS_MS)

    logger.info('[Gmail Watch Renewal] Starting', { total: watches.length })

    const results = await Promise.allSettled(
      watches.map(({ userId, workspaceId }) =>
        renewGmailWatch(userId, workspaceId),
      ),
    )

    const renewed = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    if (failed > 0) {
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)))
      logger.warn('[Gmail Watch Renewal] Some renewals failed', { renewed, failed, errors })
    }

    logger.info('[Gmail Watch Renewal] Complete', { renewed, failed, total: watches.length })

    return NextResponse.json({ success: true, renewed, failed, total: watches.length })
  } catch (err) {
    logger.error('[Gmail Watch Renewal] Fatal error', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
