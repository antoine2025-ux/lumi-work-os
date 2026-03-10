/**
 * Daily notification digest generator.
 *
 * Sends users a summary of unread notifications from the past 24 hours.
 * Respects daily_digest preference and only sends when there are unread items.
 *
 * @see src/lib/email/templates/notification-digest.ts
 * @see src/app/api/internal/email-digest/route.ts
 */

import { prismaUnscoped } from '@/lib/db'
import { getAppBaseUrl } from '@/lib/appUrl'
import { shouldNotify } from '@/lib/notifications/should-notify'
import { sendEmail } from '@/server/mailer'
import { buildNotificationDigestEmail } from '@/lib/email/templates/notification-digest'
import type { GroupedSummaryItem, TopNotificationItem } from '@/lib/email/templates/notification-digest'
import { NOTIFICATION_TYPES } from '@/lib/notifications/types'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

const TYPE_TO_LABEL = new Map<string, string>(
  NOTIFICATION_TYPES.filter((t) => t.key !== 'daily_digest').map((t) => [t.key, t.label])
)

function getTypeLabel(type: string): string {
  return TYPE_TO_LABEL.get(type) ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export interface GenerateAndSendDigestsResult {
  sent: number
  skipped: number
  errors: string[]
}

/**
 * Generate and send daily notification digest emails.
 *
 * @param workspaceId - If provided, process only this workspace. Otherwise process all.
 */
export async function generateAndSendDigests(
  workspaceId?: string
): Promise<GenerateAndSendDigestsResult> {
  const result: GenerateAndSendDigestsResult = { sent: 0, skipped: 0, errors: [] }
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS)
  const baseUrl = getAppBaseUrl()

  let workspaces: { id: string; name: string; slug: string }[]

  if (workspaceId) {
    const ws = await prismaUnscoped.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true },
    })
    workspaces = ws ? [ws] : []
  } else {
    workspaces = await prismaUnscoped.workspace.findMany({
      select: { id: true, name: true, slug: true },
    })
  }

  for (const workspace of workspaces) {
    const members = await prismaUnscoped.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    for (const member of members) {
      const { user } = member
      if (!user?.email) {
        result.skipped++
        continue
      }

      try {
        const wantsDigest = await shouldNotify(user.id, workspace.id, 'daily_digest')
        if (!wantsDigest) {
          result.skipped++
          continue
        }

        const notifications = await prismaUnscoped.notification.findMany({
          where: {
            recipientId: user.id,
            workspaceId: workspace.id,
            read: false,
            createdAt: { gte: since },
          },
          orderBy: { createdAt: 'desc' },
        })

        if (notifications.length === 0) {
          result.skipped++
          continue
        }

        // Group by type for summary
        const typeCounts = new Map<string, number>()
        for (const n of notifications) {
          typeCounts.set(n.type, (typeCounts.get(n.type) ?? 0) + 1)
        }
        const groupedSummary: GroupedSummaryItem[] = Array.from(typeCounts.entries()).map(
          ([type, count]) => ({
            type,
            label: getTypeLabel(type),
            count,
          })
        )

        // Top 10 for detail list
        const topNotifications: TopNotificationItem[] = notifications.slice(0, 10).map((n) => ({
          title: n.title,
          url: n.url,
          createdAt: n.createdAt,
          type: n.type,
        }))

        const { subject, html } = buildNotificationDigestEmail({
          userName: user.name ?? user.email.split('@')[0] ?? 'there',
          workspaceName: workspace.name,
          workspaceSlug: workspace.slug,
          count: notifications.length,
          groupedSummary,
          topNotifications,
          baseUrl,
        })

        await sendEmail({ to: user.email, subject, html })
        result.sent++
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        result.errors.push(`${workspace.id}:${user.id}: ${msg}`)
        result.skipped++
      }
    }
  }

  return result
}
