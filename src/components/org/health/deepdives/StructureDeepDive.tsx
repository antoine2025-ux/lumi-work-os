export function StructureDeepDive(props: {
  data: {
    headline: string
    summary: string
    stats: Array<{ label: string; value: string | number }>
    recommendations: string[]
    table: Array<{ id: string; name: string; note?: string | null }>
    orgDesign: null | { maxDepth: number; avgDepth: number; roots: number; missingLinks: number }
  }
}) {
  const { data } = props

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Premium</div>
          <h1 className="mt-1 text-2xl font-semibold">{data.headline}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{data.summary}</p>
        </div>

        <a
          href="/org/health"
          className="inline-flex w-fit items-center justify-center rounded-2xl border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to Org health
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {data.stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-background p-4 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      {data.orgDesign && (
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="text-sm font-semibold">Org design signals</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Layer and graph metrics help detect org design risks (v1).
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border p-4">
              <div className="text-xs text-muted-foreground">Max depth</div>
              <div className="mt-2 text-xl font-semibold">{data.orgDesign.maxDepth}</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-xs text-muted-foreground">Avg depth</div>
              <div className="mt-2 text-xl font-semibold">{data.orgDesign.avgDepth}</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-xs text-muted-foreground">Roots</div>
              <div className="mt-2 text-xl font-semibold">{data.orgDesign.roots}</div>
            </div>
            <div className="rounded-2xl border p-4">
              <div className="text-xs text-muted-foreground">Missing links</div>
              <div className="mt-2 text-xl font-semibold">{data.orgDesign.missingLinks}</div>
            </div>
          </div>
        </div>
      )}

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

      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="text-sm font-semibold">Details</div>
        <div className="mt-3 space-y-2">
          {data.table.map((row) => (
            <div key={row.id} className="rounded-2xl border p-4">
              <div className="text-sm font-semibold">{row.name}</div>
              {row.note && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

