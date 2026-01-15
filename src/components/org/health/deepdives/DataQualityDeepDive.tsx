"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

type Toast = { id: string; title: string; description?: string }

function ToastStack(props: { toasts: Toast[] }) {
  if (!props.toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[60] w-full max-w-sm space-y-2 px-4">
      {props.toasts.map((t) => (
        <div key={t.id} className="rounded-2xl border bg-background p-4 shadow-lg">
          <div className="text-sm font-semibold">{t.title}</div>
          {t.description && <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>}
        </div>
      ))}
    </div>
  )
}

export function DataQualityDeepDive(props: {
  data: {
    headline: string
    summary: string
    stats: Array<{ label: string; value: string | number }>
    recommendations: string[]
    sections: Array<{
      title: string
      subtitle: string
      rows: Array<{ id: string; name: string; note?: string; managerIds?: string[] }>
      empty: string
    }>
  }
}) {
  const { data } = props
  const router = useRouter()
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const [loading, setLoading] = React.useState<Record<string, boolean>>({})
  const [selectedManagers, setSelectedManagers] = React.useState<Record<string, string>>({})

  function pushToast(t: { title: string; description?: string }) {
    const id = String(Date.now())
    setToasts((prev) => [...prev, { id, ...t }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 3000)
  }

  async function bulkRefreshAvailability(section: typeof data.sections[0]) {
    const personIds = section.rows.map((r) => r.id)
    if (!personIds.length) return

    setLoading((prev) => ({ ...prev, [`bulk-${section.title}`]: true }))
    try {
      const res = await fetch("/api/org/data-quality/refresh-availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personIds,
          status: "AVAILABLE",
          reason: "Refreshed via data quality",
        }),
      })
      if (res.ok) {
        pushToast({ title: "Availability refreshed", description: `${personIds.length} people updated.` })
        router.refresh()
      } else {
        pushToast({ title: "Refresh failed", description: "Please try again." })
      }
    } catch {
      pushToast({ title: "Refresh failed", description: "Network error." })
    } finally {
      setLoading((prev) => ({ ...prev, [`bulk-${section.title}`]: false }))
    }
  }

  async function resolveManagerConflict(personId: string, keepManagerId: string) {
    setLoading((prev) => ({ ...prev, [`conflict-${personId}`]: true }))
    try {
      const res = await fetch("/api/org/data-quality/resolve-manager-conflicts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId, keepManagerId }),
      })
      if (res.ok) {
        pushToast({ title: "Conflict resolved", description: "Manager link updated." })
        router.refresh()
      } else {
        pushToast({ title: "Resolution failed", description: "Please try again." })
      }
    } catch {
      pushToast({ title: "Resolution failed", description: "Network error." })
    } finally {
      setLoading((prev) => ({ ...prev, [`conflict-${personId}`]: false }))
    }
  }

  async function normalizeAllocation(personId: string) {
    setLoading((prev) => ({ ...prev, [`alloc-${personId}`]: true }))
    try {
      const res = await fetch("/api/org/data-quality/adjust-allocation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ personId, targetTotalPct: 100 }),
      })
      if (res.ok) {
        pushToast({ title: "Allocation normalized", description: "Allocations adjusted to 100%." })
        router.refresh()
      } else {
        pushToast({ title: "Normalization failed", description: "Please try again." })
      }
    } catch {
      pushToast({ title: "Normalization failed", description: "Network error." })
    } finally {
      setLoading((prev) => ({ ...prev, [`alloc-${personId}`]: false }))
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Premium</div>
            <h1 className="mt-1 text-2xl font-semibold">{data.headline}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{data.summary}</p>
          </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
            onClick={async () => {
              const staleSection = data.sections.find((s) => s.title.startsWith("Stale availability"))
              const personIds = staleSection?.rows.map((r) => r.id) ?? []
              if (!personIds.length) {
                pushToast({ title: "No stale availability", description: "All availability is up to date." })
                return
              }
              pushToast({ title: "Refreshing availability…", description: "Applying weekly freshness update." })
              const res = await fetch("/api/org/data-quality/refresh-availability", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  personIds,
                  status: "AVAILABLE",
                  reason: "Weekly freshness refresh",
                }),
              })
              if (res.ok) pushToast({ title: "Availability refreshed", description: `${personIds.length} people updated.` })
              else pushToast({ title: "Refresh failed", description: "Please try again." })
              router.refresh()
            }}
          >
            Refresh all stale availability
          </button>
          <a
            href="/org/health/setup"
            className="inline-flex w-fit items-center justify-center rounded-2xl border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Back to setup
          </a>
        </div>
      </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-background p-4 shadow-sm">
              <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
              <div className="mt-2 text-2xl font-semibold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm font-semibold">Recommendations</div>
          <div className="mt-4 space-y-2">
            {data.recommendations.map((r, i) => (
              <div key={`${r}_${i}`} className="rounded-xl border px-3 py-2 text-sm text-muted-foreground">
                {r}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {data.sections.map((sec) => (
            <div key={sec.title} className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{sec.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{sec.subtitle}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    {sec.rows.length}
                  </span>
                  {sec.title.startsWith("Stale availability") && sec.rows.length > 0 && (
                    <button
                      className="rounded-xl border px-3 py-2 text-xs font-medium hover:bg-muted"
                      onClick={() => bulkRefreshAvailability(sec)}
                      disabled={loading[`bulk-${sec.title}`]}
                    >
                      {loading[`bulk-${sec.title}`] ? "Refreshing…" : "Bulk refresh"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {sec.rows.length === 0 && (
                  <div className="rounded-2xl border px-4 py-6 text-sm text-muted-foreground">{sec.empty}</div>
                )}
                {sec.rows.map((r) => (
                  <div key={r.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">{r.name}</div>
                        {r.note && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{r.note}</div>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {sec.title.startsWith("Conflicting manager") && r.managerIds && r.managerIds.length > 0 && (
                          <>
                            <select
                              className="rounded-xl border bg-background px-2 py-1 text-xs"
                              value={selectedManagers[r.id] ?? r.managerIds[0]}
                              onChange={(e) => setSelectedManagers((prev) => ({ ...prev, [r.id]: e.target.value }))}
                              disabled={loading[`conflict-${r.id}`]}
                            >
                              {r.managerIds.map((mid) => (
                                <option key={mid} value={mid}>
                                  Manager {mid.slice(0, 8)}
                                </option>
                              ))}
                            </select>
                            <button
                              className="rounded-xl border px-3 py-2 text-xs font-medium hover:bg-muted"
                              onClick={() => resolveManagerConflict(r.id, selectedManagers[r.id] ?? r.managerIds![0])}
                              disabled={loading[`conflict-${r.id}`]}
                            >
                              {loading[`conflict-${r.id}`] ? "Applying…" : "Apply"}
                            </button>
                          </>
                        )}
                        {sec.title.startsWith("Over-allocated") && (
                          <button
                            className="rounded-xl border px-3 py-2 text-xs font-medium hover:bg-muted"
                            onClick={() => normalizeAllocation(r.id)}
                            disabled={loading[`alloc-${r.id}`]}
                          >
                            {loading[`alloc-${r.id}`] ? "Normalizing…" : "Normalize to 100%"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <ToastStack toasts={toasts} />
    </>
  )
}
