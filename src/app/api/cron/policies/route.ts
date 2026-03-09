/**
 * Cron Job: Loopbrain Policy Scheduler
 *
 * POST /api/cron/policies
 *
 * Runs every 15 minutes (Vercel cron). Picks up enabled scheduled policies
 * whose nextRunAt has passed and executes them sequentially.
 *
 * Auth: Header x-cron-secret or Authorization: Bearer <token> must match
 * LOOPBRAIN_CRON_SECRET (or CRON_SECRET). In non-production, the secret
 * check is bypassed for manual testing.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prismaUnscoped } from '@/lib/db'
import { logger } from '@/lib/logger'
import { executePolicyRun } from '@/lib/loopbrain/policies/executor'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_POLICIES_PER_RUN = 20
const FUNCTION_TIMEOUT_BUFFER_MS = 30_000

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

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  if (!isAuthorized(request)) {
    logger.warn('[CronPolicies] Unauthorized request')
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  let processed = 0
  let succeeded = 0
  let failed = 0
  const errors: string[] = []

  try {
    const duePolicies = await prismaUnscoped.loopbrainPolicy.findMany({
      where: {
        enabled: true,
        triggerType: 'SCHEDULE',
        nextRunAt: { lte: new Date() },
      },
      orderBy: { nextRunAt: 'asc' },
      take: MAX_POLICIES_PER_RUN,
    })

    if (duePolicies.length === 0) {
      return NextResponse.json({
        ok: true,
        processed: 0,
        succeeded: 0,
        failed: 0,
        durationMs: Date.now() - startTime,
      })
    }

    logger.info('[CronPolicies] Processing due policies', {
      count: duePolicies.length,
    })

    for (const policy of duePolicies) {
      const elapsed = Date.now() - startTime
      if (elapsed > (maxDuration * 1000) - FUNCTION_TIMEOUT_BUFFER_MS) {
        logger.warn('[CronPolicies] Approaching timeout, stopping early', {
          processed,
          remaining: duePolicies.length - processed,
        })
        break
      }

      processed++

      try {
        const result = await executePolicyRun(policy, 'cron')
        if (result.status === 'SUCCESS') {
          succeeded++
        } else {
          failed++
          errors.push(`${policy.id}: ${result.error ?? result.status}`)
        }
      } catch (err) {
        failed++
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${policy.id}: ${msg}`)
        logger.error('[CronPolicies] Policy execution failed', {
          policyId: policy.id,
          error: msg,
        })
      }
    }

    const durationMs = Date.now() - startTime
    logger.info('[CronPolicies] Cron job completed', {
      processed,
      succeeded,
      failed,
      durationMs,
    })

    return NextResponse.json({
      ok: failed === 0,
      processed,
      succeeded,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      durationMs,
    })
  } catch (err) {
    logger.error('[CronPolicies] Cron job failed', { error: err })
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        processed,
        succeeded,
        failed,
        durationMs: Date.now() - startTime,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  const pendingCount = await prismaUnscoped.loopbrainPolicy.count({
    where: {
      enabled: true,
      triggerType: 'SCHEDULE',
      nextRunAt: { lte: new Date() },
    },
  })

  const totalEnabled = await prismaUnscoped.loopbrainPolicy.count({
    where: { enabled: true },
  })

  return NextResponse.json({
    ok: true,
    name: 'Loopbrain Policy Scheduler',
    description: 'Executes scheduled policies whose nextRunAt has passed',
    schedule: 'Every 15 minutes',
    pendingPolicies: pendingCount,
    totalEnabledPolicies: totalEnabled,
  })
}
