/**
 * Cron Job: Weekly Org Health Digest Emails
 *
 * POST /api/cron/digest
 *
 * Sends the weekly org health digest email to configured recipients for each
 * workspace that has the digest enabled and is due for sending (lastSentAt is
 * null or older than 7 days).
 *
 * Schedule: Every Monday at 08:00 UTC (see vercel.json).
 *
 * Auth: Header x-cron-secret or Authorization: Bearer <token> must match
 * LOOPBRAIN_CRON_SECRET (or CRON_SECRET). In non-production, the secret check
 * is bypassed so the endpoint can be called manually.
 *
 * @see src/server/orgDigest.ts
 * @see src/lib/email/digest-email.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { prismaUnscoped } from '@/lib/db'
import { logger } from '@/lib/logger'
import { buildWeeklyDigest } from '@/server/orgDigest'
import { sendEmail } from '@/server/mailer'
import { buildDigestEmail } from '@/lib/email/digest-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes — matches insights cron

// =============================================================================
// Auth (mirrors src/app/api/cron/insights/route.ts)
// =============================================================================

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

// =============================================================================
// Recipient resolution
//
// recipients JSON field is untyped (Json in Prisma schema).
// We handle three possible shapes:
//   { type: 'user', userId: string } → look up user.email from DB
//   { type: 'email', email: string } → use directly
//   string                           → treat as email if it contains '@'
// =============================================================================

type RecipientEntry =
  | { type: 'user'; userId: string }
  | { type: 'email'; email: string }
  | string

async function resolveRecipientEmails(recipients: unknown): Promise<string[]> {
  if (!Array.isArray(recipients) || recipients.length === 0) return []

  const emails: string[] = []
  const userIds: string[] = []

  for (const entry of recipients as RecipientEntry[]) {
    if (typeof entry === 'string') {
      if (entry.includes('@')) emails.push(entry)
    } else if (entry.type === 'email' && entry.email) {
      emails.push(entry.email)
    } else if (entry.type === 'user' && entry.userId) {
      userIds.push(entry.userId)
    }
  }

  if (userIds.length > 0) {
    const users = await prismaUnscoped.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true },
    })
    for (const u of users) {
      if (u.email) emails.push(u.email)
    }
  }

  // Deduplicate
  return [...new Set(emails)]
}

// =============================================================================
// Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  if (!isAuthorized(request)) {
    logger.warn('[CronDigest] Unauthorized request')
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  let processed = 0
  let sent = 0
  let skipped = 0
  const errors: string[] = []

  try {
    // Fetch all workspace digest configs that are enabled and due
    const digestConfigs = await prismaUnscoped.orgHealthDigest.findMany({
      where: {
        enabled: true,
        OR: [
          { lastSentAt: null },
          { lastSentAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        ],
      },
      select: {
        workspaceId: true,
        recipients: true,
      },
    })

    if (digestConfigs.length === 0) {
      logger.info('[CronDigest] No workspaces due for digest')
      return NextResponse.json({
        ok: true,
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: [],
        durationMs: Date.now() - startTime,
      })
    }

    // Batch-load workspace name + slug (OrgHealthDigest has no @relation)
    const workspaceIds = digestConfigs.map((c) => c.workspaceId)
    const workspaces = await prismaUnscoped.workspace.findMany({
      where: { id: { in: workspaceIds } },
      select: { id: true, name: true, slug: true },
    })
    const workspaceMap = new Map(workspaces.map((w) => [w.id, w]))

    logger.info('[CronDigest] Starting digest cron', {
      workspacesFound: digestConfigs.length,
    })

    for (const cfg of digestConfigs) {
      processed++
      const workspace = workspaceMap.get(cfg.workspaceId)

      if (!workspace) {
        // Workspace deleted but digest config remains — skip
        skipped++
        logger.warn('[CronDigest] Workspace not found, skipping', {
          workspaceId: cfg.workspaceId,
        })
        continue
      }

      try {
        const recipientEmails = await resolveRecipientEmails(cfg.recipients)
        if (recipientEmails.length === 0) {
          skipped++
          logger.info('[CronDigest] No recipients configured, skipping', {
            workspaceId: workspace.id,
          })
          continue
        }

        // orgDigest.ts uses `orgId` as param name — pass workspace.id regardless
        const digest = await buildWeeklyDigest(workspace.id)
        const { subject, html } = buildDigestEmail(digest, workspace.name, workspace.slug)

        for (const to of recipientEmails) {
          await sendEmail({ to, subject, html })
        }

        await prismaUnscoped.orgHealthDigest.update({
          where: { workspaceId: workspace.id },
          data: { lastSentAt: new Date() },
        })

        logger.info('[CronDigest] Digest sent', {
          workspaceId: workspace.id,
          recipientCount: recipientEmails.length,
        })
        sent++
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`${workspace.id}: ${msg}`)
        logger.error('[CronDigest] Failed for workspace', {
          workspaceId: workspace.id,
          error,
        })
        // Continue — one failure must not stop others
      }
    }

    const durationMs = Date.now() - startTime
    logger.info('[CronDigest] Cron job completed', {
      processed,
      sent,
      skipped,
      errorCount: errors.length,
      durationMs,
    })

    return NextResponse.json({
      ok: errors.length === 0,
      processed,
      sent,
      skipped,
      errors,
      durationMs,
    })
  } catch (error) {
    logger.error('[CronDigest] Cron job failed', { error })
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processed,
        sent,
        skipped,
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/digest — health check, returns pending workspace count.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 403 })
  }

  const pendingCount = await prismaUnscoped.orgHealthDigest.count({
    where: {
      enabled: true,
      OR: [
        { lastSentAt: null },
        { lastSentAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  })

  return NextResponse.json({
    ok: true,
    name: 'Weekly Org Health Digest',
    description: 'Sends weekly org health digest emails to configured workspace recipients',
    schedule: 'Every Monday at 08:00 UTC',
    pendingWorkspaces: pendingCount,
  })
}
