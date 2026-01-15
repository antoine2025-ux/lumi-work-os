"use client"

import * as React from "react"
import type { OrgHealthSignal, OrgHealthSnapshot } from "@/lib/org-health/types"
import { HEALTH_SCORE_LABELS } from "@/lib/org-health/constants"

function clampScore(v?: number) {
  if (typeof v !== "number" || Number.isNaN(v)) return null
  return Math.max(0, Math.min(100, Math.round(v)))
}

function severityMeta(sev: OrgHealthSignal["severity"]) {
  switch (sev) {
    case "CRITICAL":
      return { label: "Critical", dot: "●" }
    case "WARNING":
      return { label: "Warning", dot: "●" }
    default:
      return { label: "Info", dot: "●" }
  }
}

function scoreTone(score: number | null) {
  if (score === null) return "neutral"
  if (score >= 80) return "good"
  if (score >= 55) return "ok"
  return "risk"
}

export function OrgHealthCard(props: {
  snapshot: OrgHealthSnapshot
  signals: OrgHealthSignal[]
  title?: string
}) {
  const { snapshot, signals, title = "Org health" } = props

  const items = React.useMemo(() => {
    const rows: Array<{ key: keyof typeof HEALTH_SCORE_LABELS; label: string; score: number | null }> = [
      { key: "capacityScore", label: HEALTH_SCORE_LABELS.capacityScore, score: clampScore(snapshot.capacityScore) },
      { key: "ownershipScore", label: HEALTH_SCORE_LABELS.ownershipScore, score: clampScore(snapshot.ownershipScore) },
      { key: "balanceScore", label: HEALTH_SCORE_LABELS.balanceScore, score: clampScore(snapshot.balanceScore) },
    ]
    const mgmtScore = clampScore((snapshot as any).managementScore)
    if (mgmtScore !== null) {
      rows.push({ key: "managementScore", label: HEALTH_SCORE_LABELS.managementScore, score: mgmtScore })
    }
    const dqScore = clampScore((snapshot as any).dataQualityScore)
    if (dqScore !== null) {
      rows.push({ key: "dataQualityScore", label: HEALTH_SCORE_LABELS.dataQualityScore, score: dqScore })
    }
    return rows
  }, [snapshot])

  return (
    <div className="rounded-2xl border bg-background shadow-sm">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="text-sm font-medium text-muted-foreground">Premium</div>
          <h3 className="mt-1 truncate text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A quick read on capacity coverage, ownership clarity, and structural balance.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            Signals: {signals.length}
          </span>
        </div>
      </div>

      <div className="grid gap-3 px-5 pb-5 md:grid-cols-5">
        {items.map((it) => {
          const tone = scoreTone(it.score)
          return (
            <div key={String(it.key)} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{it.label}</div>
                <div className="text-sm text-muted-foreground">{it.score === null ? "—" : `${it.score}/100`}</div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={[
                    "h-2 rounded-full transition-all",
                    tone === "good" ? "bg-emerald-500" : "",
                    tone === "ok" ? "bg-blue-500" : "",
                    tone === "risk" ? "bg-amber-500" : "",
                    tone === "neutral" ? "bg-muted-foreground" : "",
                  ].join(" ")}
                  style={{
                    width: it.score !== null ? `${it.score}%` : "15%",
                  }}
                />
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {tone === "good" && "Healthy"}
                {tone === "ok" && "Watchlist"}
                {tone === "risk" && "Risk"}
                {tone === "neutral" && "Unknown"}
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Signals</div>
          <div className="text-xs text-muted-foreground">Latest</div>
        </div>

        <div className="mt-3 space-y-2">
          {signals.slice(0, 4).map((s) => {
            const meta = severityMeta(s.severity)
            return (
              <div key={s.id} className="rounded-xl border px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{meta.dot}</span>
                      <div className="truncate text-sm font-medium">{s.title}</div>
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.description}</div>
                  </div>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    {meta.label}
                  </span>
                </div>
              </div>
            )
          })}

          {signals.length === 0 && (
            <div className="rounded-xl border px-3 py-3 text-sm text-muted-foreground">
              No signals yet.
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={async () => {
                try {
                  await fetch("/api/org/health", { method: "POST" })
                  window.location.reload()
                } catch {
                  // silent fail; keep premium calm
                }
              }}
            >
              Refresh
            </button>

            <button
              type="button"
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => {
                window.location.href = "/org/health"
              }}
            >
              View details
            </button>
          </div>

          <div className="text-xs text-muted-foreground">
            Updated {new Date(snapshot.capturedAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  )
}

