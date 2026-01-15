import { OrgHealthHistoryChart } from "@/components/org/health/OrgHealthHistoryChart"
import { OrgHealthSignalsInbox } from "@/components/org/health/OrgHealthSignalsInbox"

type Latest = {
  snapshot: {
    capacityScore: number | null
    ownershipScore: number | null
    balanceScore: number | null
    managementScore?: number | null
    dataQualityScore?: number | null
    phaseCVersion?: string | null
    capturedAt: Date
  }
  signals: Array<{
    id: string
    type: string
    severity: string
    title: string
    description: string
    createdAt: Date
    resolvedAt: Date | null
  }>
} | null

export function OrgHealthDetails(props: {
  latest: Latest
  history: Array<{
    id: string
    capturedAt: Date
    capacityScore: number | null
    ownershipScore: number | null
    balanceScore: number | null
  }>
  openSignals: Array<{
    id: string
    type: string
    severity: string
    title: string
    description: string
    createdAt: Date
    resolvedAt: Date | null
  }>
  completeness: { overallScore: number }
}) {
  const { latest, history, openSignals, completeness } = props

  const lastUpdated =
    latest?.snapshot?.capturedAt
      ? new Date(latest.snapshot.capturedAt).toLocaleString()
      : "Not yet computed"

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Premium</div>
          <h1 className="mt-1 text-2xl font-semibold">Org health</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Track capacity coverage, ownership clarity, and structural balance over time. Triage signals and keep the org operating cleanly.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl border bg-background px-3 py-2 text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </div>

          <form action="/api/org/health" method="post">
            <button
              type="submit"
              className="rounded-2xl border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Refresh now
            </button>
          </form>
        </div>
      </div>

      {completeness.overallScore < 70 && (
        <a
          href="/org/health/setup"
          className="block rounded-2xl border bg-background p-4 hover:bg-muted/40"
        >
          <div className="text-sm font-semibold">Finish Org Health setup</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Complete setup (currently {completeness.overallScore}/100) to unlock more accurate signals.
          </div>
        </a>
      )}

      {props.openSignals.some((s) => s.title === "Weekly freshness check") && (
        <a
          href="/org/health/data-quality"
          className="block rounded-2xl border bg-background p-4 hover:bg-muted/40"
        >
          <div className="text-sm font-semibold">Weekly freshness check</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Keep Org Health accurate by refreshing availability for people who haven't updated recently.
          </div>
        </a>
      )}

      {typeof latest?.snapshot?.dataQualityScore === "number" && latest.snapshot.dataQualityScore < 80 && (
        <a href="/org/health/data-quality" className="block rounded-2xl border bg-background p-4 hover:bg-muted/40">
          <div className="text-sm font-semibold">Keep Org Health fresh</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Data quality score is {Math.round(latest.snapshot.dataQualityScore)}/100. Refresh stale availability and resolve conflicts to improve accuracy.
          </div>
        </a>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OrgHealthHistoryChart history={history} />
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl border bg-background p-5 shadow-sm">
            <div className="text-sm font-semibold">Open signals</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Active items that need attention. Resolve support arrives in a later step.
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-3xl font-semibold">{openSignals.length}</div>
              <div className="text-xs text-muted-foreground">currently open</div>
            </div>

            <div className="mt-4 h-px w-full bg-border" />

            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground">What's next</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Resolve/dismiss signals and keep an audit trail</li>
                <li>Deep dives: capacity, ownership coverage, management load</li>
                <li>Smart recommendations for rebalancing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <OrgHealthSignalsInbox signals={openSignals} />

      {props.latest?.snapshot?.phaseCVersion && (
        <div className="mt-6 text-xs text-muted-foreground">
          Org Phase C complete · {props.latest.snapshot.phaseCVersion}
        </div>
      )}
    </div>
  )
}

