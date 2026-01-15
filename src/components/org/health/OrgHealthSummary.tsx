/**
 * Org Health Summary - Derived Signals Only
 * 
 * MVP: Health signals are DERIVED data, shown on Overview with deep links.
 * 
 * Each signal deep-links to:
 * - People (filtered by the issue)
 * - Structure (for structural issues)
 * - Ownership (for ownership gaps)
 * 
 * This component replaces the standalone Health page in MVP.
 */

import Link from "next/link"
import { getOrgOverviewSummary } from "@/server/org/overview/summary"
import { OrgCard } from "@/components/org/ui/OrgCard"

export async function OrgHealthSummary(props: { orgId: string }) {
  const summary = await getOrgOverviewSummary(props.orgId)

  // Extract health signals that can be deep-linked
  const signals = summary.topSignals || []
  const hasIssues = signals.length > 0 || summary.trustScore < 100

  return (
    <OrgCard 
      title="Org readiness" 
      subtitle={
        hasIssues 
          ? "Complete these items so Loopbrain can answer: who owns what, who reports to whom, and who's available."
          : "Your org data is ready. Loopbrain can answer questions about your organization."
      }
    >
      <div className="space-y-4">
        {/* Basic stats */}
        <div className="grid gap-3 md:grid-cols-3">
          <Link href="/org/people" className="block rounded-xl border p-4 hover:bg-muted/40 transition-colors">
            <div className="text-xs font-medium text-muted-foreground">People</div>
            <div className="mt-1 text-lg font-semibold">{summary.peopleCount}</div>
          </Link>
          <Link href="/org/chart" className="block rounded-xl border p-4 hover:bg-muted/40 transition-colors">
            <div className="text-xs font-medium text-muted-foreground">Teams</div>
            <div className="mt-1 text-lg font-semibold">{summary.teamCount}</div>
          </Link>
          <Link href="/org/ownership" className="block rounded-xl border p-4 hover:bg-muted/40 transition-colors">
            <div className="text-xs font-medium text-muted-foreground">Ownership coverage</div>
            <div className="mt-1 text-lg font-semibold">
              {summary.trustScore}%
            </div>
          </Link>
        </div>

        {/* Health signals with deep links */}
        {hasIssues && (
          <div className="rounded-xl border border-yellow-900/30 bg-yellow-950/20 p-4">
            <div className="text-xs font-medium text-muted-foreground mb-3">Items needing attention</div>
            <div className="space-y-2">
              {signals.slice(0, 3).map((signal: any) => {
                // Map signal keys to deep links
                let href = "/org/people"
                let label = signal.title || signal.key
                
                if (signal.key?.includes("ownership") || signal.key?.includes("unowned")) {
                  href = "/org/ownership"
                } else if (signal.key?.includes("team") || signal.key?.includes("department") || signal.key?.includes("structure")) {
                  href = "/org/chart"
                } else if (signal.key?.includes("people") || signal.key?.includes("manager")) {
                  href = "/org/people"
                }

                return (
                  <Link
                    key={signal.key}
                    href={href}
                    className="flex items-center justify-between rounded-lg border border-yellow-900/20 bg-yellow-950/10 p-3 hover:bg-yellow-950/20 transition-colors group"
                  >
                    <span className="text-sm text-yellow-100">{label}</span>
                    <span className="text-xs text-yellow-200/60 group-hover:text-yellow-200">→</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Status indicator */}
        {!hasIssues && (
          <div className="rounded-xl border border-green-900/30 bg-green-950/20 p-4 text-center">
            <div className="text-sm font-medium text-green-100">✓ All systems ready</div>
          </div>
        )}
      </div>
    </OrgCard>
  )
}
