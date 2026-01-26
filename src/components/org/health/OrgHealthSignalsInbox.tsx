function meta(sev: string) {
  const s = String(sev).toUpperCase()
  if (s === "CRITICAL") return { label: "Critical", badge: "CRITICAL" }
  if (s === "WARNING") return { label: "Warning", badge: "WARNING" }
  return { label: "Info", badge: "INFO" }
}

function typeLabel(t: string) {
  const x = String(t).toUpperCase()
  if (x === "CAPACITY") return "Capacity"
  if (x === "OWNERSHIP") return "Ownership"
  if (x === "STRUCTURE") return "Structure"
  if (x === "MANAGEMENT_LOAD") return "Management load"
  if (x === "DATA_QUALITY") return "Data quality"
  return x
}

function hrefForSignal(s: { href?: string | null; type: string }) {
  if (s.href) return s.href
  const t = String(s.type).toUpperCase()
  if (t === "CAPACITY") return "/org/health/capacity"
  if (t === "OWNERSHIP") return "/org/health/ownership"
  if (t === "MANAGEMENT_LOAD") return "/org/health/management-load"
  if (t === "STRUCTURE") return "/org/health/structure"
  if (t === "DATA_QUALITY") return "/org/health/data-quality"
  return "/org/health"
}

export function OrgHealthSignalsInbox(props: {
  signals: Array<{
    id: string
    type: string
    severity: string
    title: string
    description: string
    createdAt: Date
    contextLabel?: string | null
    href?: string | null
  }>
}) {
  const { signals } = props

  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Signal inbox</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Triage what's open. Resolution/dismissal comes next.
          </div>
        </div>

        <div className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          Showing {Math.min(50, signals.length)}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {signals.slice(0, 50).map((s) => {
          const m = meta(s.severity)
          return (
            <a
              key={s.id}
              href={hrefForSignal(s as any)}
              className="block rounded-2xl border p-4 hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      {typeLabel(s.type)}
                    </span>
                    <div className="truncate text-sm font-semibold">{s.title}</div>
                    {s.title.toLowerCase().includes("role coverage") && (
                      <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        Role gap
                      </span>
                    )}
                    {s.contextLabel && (
                      <span className="truncate text-xs text-muted-foreground">
                        · {s.contextLabel}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.description}</div>
                  {s.type === "OWNERSHIP" && s.contextLabel && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Entity: {String(s.contextType ?? "ENTITY")} · {s.contextLabel}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    Opened {new Date(s.createdAt).toLocaleString()}
                  </div>
                </div>

                <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                  {m.label}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      await fetch(`/api/org/health/signals/${s.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ action: "resolve" }),
                      })
                      window.location.reload()
                    } catch {
                      // silent fail
                    }
                  }}
                >
                  Resolve
                </button>
                <button
                  type="button"
                  className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                  onClick={async (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    try {
                      await fetch(`/api/org/health/signals/${s.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ action: "dismiss" }),
                      })
                      window.location.reload()
                    } catch {
                      // silent fail
                    }
                  }}
                >
                  Dismiss
                </button>
              </div>
            </a>
          )
        })}

        {signals.length === 0 && (
          <div className="rounded-2xl border px-4 py-6 text-sm text-muted-foreground">
            No open signals. Refresh to recompute and keep monitoring.
          </div>
        )}
      </div>
    </div>
  )
}

