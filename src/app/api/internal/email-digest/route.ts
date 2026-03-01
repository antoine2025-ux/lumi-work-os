/**
 * Cron Job: Daily Notification Digest Emails
 *
 * POST /api/internal/email-digest
 *
 * Sends a daily summary of unread notifications from the past 24 hours to users
 * who have opted in (daily_digest preference enabled) and have unread items.
 *
 * Auth: Header x-cron-secret or Authorization: Bearer <token> must match
 * LOOPBRAIN_CRON_SECRET (or CRON_SECRET). In non-production, the secret check
 * is bypassed so the endpoint can be called manually.
 *
 * Body (optional): { workspaceId?: string } — limit to a single workspace
 *
 * @see src/lib/email/digest.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateAndSendDigests } from '@/lib/email/digest'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

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
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let workspaceId: string | undefined
  try {
    const body = await request.json().catch(() => ({}))
    workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId : undefined
  } catch {
    // No body or invalid JSON — process all workspaces
  }

  const result = await generateAndSendDigests(workspaceId)
  return NextResponse.json(result)
}
