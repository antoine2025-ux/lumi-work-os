/**
 * Email template for the daily notification digest.
 *
 * Matches src/lib/email/digest-email.ts and send-invite.ts — inline styles,
 * plain HTML string. Returns { subject, html }.
 */

import { formatDistanceToNow } from 'date-fns'

// =============================================================================
// Types
// =============================================================================

export interface GroupedSummaryItem {
  type: string
  label: string
  count: number
}

export interface TopNotificationItem {
  title: string
  url: string | null
  createdAt: Date
  type: string
}

export interface NotificationDigestParams {
  userName: string
  workspaceName: string
  workspaceSlug: string
  count: number
  groupedSummary: GroupedSummaryItem[]
  topNotifications: TopNotificationItem[]
  baseUrl: string
}

// =============================================================================
// Helpers
// =============================================================================

function renderGroupedSummary(grouped: GroupedSummaryItem[]): string {
  if (grouped.length === 0) return ''
  return grouped.map((g) => `${g.count} ${g.label}`).join(', ')
}

function renderNotificationRows(items: TopNotificationItem[], baseUrl: string, workspaceSlug: string): string {
  if (items.length === 0) {
    return '<tr><td style="padding: 10px 0; color: #6b7280; font-size: 14px;">No notifications to display.</td></tr>'
  }
  return items
    .map((n) => {
      const link = n.url
        ? (n.url.startsWith('http') ? n.url : `${baseUrl}${n.url.startsWith('/') ? '' : '/'}${n.url}`)
        : `${baseUrl}/w/${workspaceSlug}/spaces/home`
      const timeAgo = formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
      const escapedTitle = n.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
          <a href="${link}" style="color: #111827; text-decoration: none; font-size: 14px; font-weight: 500;">
            ${escapedTitle}
          </a>
          <div style="color: #9ca3af; font-size: 12px; margin-top: 2px;">${timeAgo}</div>
        </td>
      </tr>`
    })
    .join('')
}

// =============================================================================
// Main export
// =============================================================================

export function buildNotificationDigestEmail(params: NotificationDigestParams): { subject: string; html: string } {
  const {
    userName,
    workspaceName,
    workspaceSlug,
    count,
    groupedSummary,
    topNotifications,
    baseUrl,
  } = params

  const viewAllUrl = `${baseUrl}/w/${workspaceSlug}/spaces/home`
  const unsubscribeUrl = `${baseUrl}/w/${workspaceSlug}/settings?tab=notifications`
  const summaryLine = renderGroupedSummary(groupedSummary)
  const notificationRows = renderNotificationRows(topNotifications, baseUrl, workspaceSlug)

  const subject = `Loopwell — You have ${count} unread notification${count === 1 ? '' : 's'}`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;">
  <div style="max-width: 580px; margin: 40px auto; padding: 0 16px;">

    <!-- Header -->
    <div style="background-color: #1a1a2e; border-radius: 8px 8px 0 0; padding: 28px 32px;">
      <div style="color: #93c5fd; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px;">
        Daily Digest
      </div>
      <div style="color: #ffffff; font-size: 22px; font-weight: 700;">${workspaceName}</div>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; border-radius: 0 0 8px 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <p style="color: #111827; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
        Good morning, ${userName || 'there'}
      </p>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
        Here&apos;s what happened since your last visit:
      </p>

      ${
        summaryLine
          ? `<p style="color: #374151; font-size: 14px; margin: 0 0 24px 0; font-weight: 500;">
        ${summaryLine}
      </p>`
          : ''
      }

      <!-- Notification list -->
      <div style="margin-bottom: 28px;">
        <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 12px;">
          Recent notifications
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${notificationRows}</tbody>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0 8px;">
        <a href="${viewAllUrl}"
          style="display: inline-block; background-color: #3b82f6; color: #ffffff;
            padding: 13px 28px; border-radius: 6px; text-decoration: none;
            font-weight: 600; font-size: 15px;">
          View all notifications &rarr;
        </a>
      </div>

      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 16px;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        Loopwell Intelligence OÜ &middot;
        <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Manage notification preferences</a>
      </p>

    </div>
  </div>
</body>
</html>`

  return { subject, html }
}
