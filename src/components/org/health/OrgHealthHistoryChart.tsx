function toNumber(v: number | null) {
  if (typeof v !== "number") return null
  return Math.max(0, Math.min(100, Math.round(v)))
}

function normalize(history: Array<{ capturedAt: Date; v: number | null }>) {
  // Oldest -> newest
  const points = [...history].reverse().map((p) => ({
    t: new Date(p.capturedAt).toLocaleDateString(),
    v: toNumber(p.v),
  }))
  return points
}

function linePath(values: Array<number | null>, w: number, h: number, pad: number) {
  const defined = values.map((v, i) => ({ v, i })).filter((x) => typeof x.v === "number") as Array<{ v: number; i: number }>
  if (defined.length < 2) return ""

  const minX = 0
  const maxX = Math.max(1, values.length - 1)

  const scaleX = (i: number) => pad + (i - minX) * ((w - pad * 2) / (maxX - minX))
  const scaleY = (v: number) => pad + (100 - v) * ((h - pad * 2) / 100)

  let d = ""
  for (let idx = 0; idx < defined.length; idx++) {
    const p = defined[idx]
    const x = scaleX(p.i)
    const y = scaleY(p.v)
    d += idx === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
  }
  return d
}

function SeriesCard(props: {
  title: string
  points: Array<{ t: string; v: number | null }>
}) {
  const { title, points } = props
  const last = points.length ? points[points.length - 1]?.v : null
  const values = points.map((p) => p.v)

  const w = 420
  const h = 96
  const pad = 10
  const path = linePath(values, w, h, pad)

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{last === null ? "—" : `${last}/100`}</div>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border bg-background">
        <svg viewBox={`0 0 ${w} ${h}`} className="block w-full">
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.9" />
          <path d={`M 0 ${h - 1} L ${w} ${h - 1}`} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.08" />
          <path d={`M 0 ${pad} L ${w} ${pad}`} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.06" />
          <path d={`M 0 ${h / 2} L ${w} ${h / 2}`} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.06" />
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{points[0]?.t ?? "—"}</span>
        <span>{points[points.length - 1]?.t ?? "—"}</span>
      </div>
    </div>
  )
}

export function OrgHealthHistoryChart(props: {
  history: Array<{
    capturedAt: Date
    capacityScore: number | null
    ownershipScore: number | null
    balanceScore: number | null
  }>
}) {
  const { history } = props

  const cap = normalize(history.map((h) => ({ capturedAt: h.capturedAt, v: h.capacityScore })))
  const own = normalize(history.map((h) => ({ capturedAt: h.capturedAt, v: h.ownershipScore })))
  const bal = normalize(history.map((h) => ({ capturedAt: h.capturedAt, v: h.balanceScore })))

  return (
    <div className="rounded-2xl border bg-background p-5 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">History</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Last {Math.min(30, history.length)} refreshes.
          </div>
        </div>

        <div className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
          Snapshots: {history.length}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SeriesCard title="Capacity" points={cap} />
        <SeriesCard title="Ownership" points={own} />
        <SeriesCard title="Balance" points={bal} />
      </div>

      <div className="mt-4 rounded-2xl border p-4">
        <div className="text-sm font-semibold">Latest snapshots</div>
        <div className="mt-3 space-y-2">
          {history.slice(0, 8).map((h) => (
            <div key={String(h.capturedAt)} className="flex items-center justify-between rounded-xl border px-3 py-2">
              <div className="text-sm">{new Date(h.capturedAt).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                C {toNumber(h.capacityScore) ?? "—"} · O {toNumber(h.ownershipScore) ?? "—"} · B {toNumber(h.balanceScore) ?? "—"}
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="rounded-xl border px-3 py-3 text-sm text-muted-foreground">
              No snapshots yet. Click &quot;Refresh now&quot; to create the first snapshot.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
