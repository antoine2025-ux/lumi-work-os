/**
 * Email template builder for the weekly org health digest.
 *
 * Mirrors src/lib/email/send-invite.ts — inline styles only (no <style> tags),
 * HTML + plain-text fallback.
 */

import { getAppBaseUrl } from '@/lib/appUrl'

// =============================================================================
// Types — mirror the exact return shape of buildWeeklyDigest() in
// src/server/orgDigest.ts (score, breakdown, topActions, generatedAt).
// topActions items gain an `impact` field from computeOrgGuidance's map().
// =============================================================================

export interface DigestActionItem {
  key: string
  label: string
  description: string
  issueType: string
  count: number
  weight: number
  impact: number
}

export interface DigestData {
  /** Integer 0–100: Math.round(health.score * 100) */
  score: number
  /** Per-dimension scores 0–1: reportingLines, teamsAssigned, rolesAssigned, duplicatesHealth */
  breakdown: Record<string, number>
  /** Up to 3 highest-impact open issues, sorted by count × weight desc */
  topActions: DigestActionItem[]
  /** ISO timestamp of generation */
  generatedAt: string
}

// =============================================================================
// Helpers
// =============================================================================

const BREAKDOWN_LABELS: Record<string, string> = {
  reportingLines: 'Reporting lines',
  teamsAssigned: 'Teams assigned',
  rolesAssigned: 'Roles assigned',
  duplicatesHealth: 'Duplicates health',
}

function scoreColor(pct: number): string {
  if (pct >= 80) return '#16a34a' // green
  if (pct >= 60) return '#d97706' // amber
  return '#dc2626' // red
}

function getWeekRange(generatedAt: string): string {
  const end = new Date(generatedAt)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function renderBreakdownRows(breakdown: Record<string, number>): string {
  return Object.entries(breakdown)
    .map(([key, value]) => {
      const pct = Math.round(value * 100)
      const color = scoreColor(pct)
      const label = BREAKDOWN_LABELS[key] ?? key
      return `
        <tr>
          <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">${label}</td>
          <td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${color}; font-size: 14px;">${pct}%</td>
        </tr>`
    })
    .join('')
}

function renderActionRows(topActions: DigestActionItem[]): string {
  if (topActions.length === 0) {
    return '<tr><td style="padding: 10px 0; color: #6b7280; font-size: 14px;">No priority actions this week.</td></tr>'
  }
  return topActions
    .map(
      (a, i) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="width: 30px; vertical-align: top; padding-top: 1px;">
                <div style="width: 22px; height: 22px; line-height: 22px; text-align: center;
                  background: #eff6ff; color: #3b82f6; border-radius: 50%;
                  font-size: 12px; font-weight: 700;">${i + 1}</div>
              </td>
              <td style="vertical-align: top; padding-left: 8px;">
                <div style="font-weight: 600; color: #111827; font-size: 14px;">
                  ${a.label}${a.count > 0 ? ` <span style="color: #6b7280; font-weight: 400;">(${a.count})</span>` : ''}
                </div>
                <div style="color: #6b7280; font-size: 13px; margin-top: 2px;">${a.description}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join('')
}

// =============================================================================
// Main export
// =============================================================================

export function buildDigestEmail(
  digest: DigestData,
  workspaceName: string,
  workspaceSlug: string
): { subject: string; html: string; text: string } {
  const baseUrl = getAppBaseUrl()
  const reportUrl = `${baseUrl}/w/${workspaceSlug}/org/admin/health`
  const weekRange = getWeekRange(digest.generatedAt)
  const color = scoreColor(digest.score)
  const subject = `Your weekly Loopwell digest — ${workspaceName}`

  const hasBreakdown = Object.keys(digest.breakdown).length > 0

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
        Weekly Digest &middot; ${weekRange}
      </div>
      <div style="color: #ffffff; font-size: 22px; font-weight: 700;">${workspaceName}</div>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; border-radius: 0 0 8px 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">

      <!-- Health score -->
      <div style="text-align: center; padding: 20px 0 24px;">
        <div style="font-size: 12px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;">
          Org Health Score
        </div>
        <div style="font-size: 60px; font-weight: 800; color: ${color}; line-height: 1;">${digest.score}</div>
        <div style="font-size: 16px; color: ${color}; font-weight: 600; margin-top: 2px;">/100</div>
      </div>

      ${
        hasBreakdown
          ? `<!-- Score breakdown -->
      <div style="background: #f9fafb; border-radius: 6px; padding: 16px 20px; margin-bottom: 28px;">
        <div style="font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 10px;">
          Score breakdown
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${renderBreakdownRows(digest.breakdown)}</tbody>
        </table>
      </div>`
          : ''
      }

      <!-- Recommended actions -->
      <div style="margin-bottom: 28px;">
        <div style="font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 12px;">
          Recommended actions
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${renderActionRows(digest.topActions)}</tbody>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0 8px;">
        <a href="${reportUrl}"
          style="display: inline-block; background-color: #3b82f6; color: #ffffff;
            padding: 13px 28px; border-radius: 6px; text-decoration: none;
            font-weight: 600; font-size: 15px;">
          View full report &rarr;
        </a>
      </div>

      <!-- Footer -->
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 16px;" />
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
        Loopwell &mdash; Weekly org health digest &middot;
        <a href="${reportUrl}" style="color: #9ca3af; text-decoration: underline;">View online</a>
      </p>

    </div>
  </div>
</body>
</html>`

  // Plain-text fallback
  const breakdownText = hasBreakdown
    ? Object.entries(digest.breakdown)
        .map(([k, v]) => `  ${BREAKDOWN_LABELS[k] ?? k}: ${Math.round(v * 100)}%`)
        .join('\n')
    : '  (no breakdown available)'

  const actionsText =
    digest.topActions.length === 0
      ? '  No priority actions this week.'
      : digest.topActions
          .map(
            (a, i) =>
              `  ${i + 1}. ${a.label}${a.count > 0 ? ` (${a.count})` : ''} — ${a.description}`
          )
          .join('\n')

  const text = [
    `${workspaceName} — Weekly Loopwell Digest (${weekRange})`,
    '',
    `ORG HEALTH SCORE: ${digest.score}/100`,
    '',
    'Score breakdown:',
    breakdownText,
    '',
    'Recommended actions:',
    actionsText,
    '',
    `View the full report: ${reportUrl}`,
    '',
    '— Loopwell · Weekly org health digest',
  ].join('\n')

  return { subject, html, text }
}
