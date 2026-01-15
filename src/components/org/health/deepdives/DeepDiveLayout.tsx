type Stat = { label: string; value: string | number }

export function DeepDiveLayout(props: {
  title: string
  summary: string
  stats: Stat[]
  recommendations: string[]
  tableTitle?: string
  tableSubtitle?: string
  tableRows?: Array<{ id: string; name: string; note?: string }>
}) {
  const { title, summary, stats, recommendations, tableTitle, tableSubtitle, tableRows } = props

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Premium</div>
          <h1 className="mt-1 text-2xl font-semibold">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{summary}</p>
        </div>

        <a
          href="/org/health"
          className="inline-flex w-fit items-center justify-center rounded-2xl border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to Org health
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-background p-4 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="text-sm font-semibold">Recommendations</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Concrete actions to improve the signal over time (v0).
        </div>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {recommendations.map((r, i) => (
            <li key={`${r}_${i}`}>{r}</li>
          ))}
        </ul>
      </div>

      {tableRows && (
        <div className="rounded-2xl border bg-background p-5 shadow-sm">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{tableTitle ?? "Details"}</div>
              {tableSubtitle ? (
                <div className="mt-1 text-sm text-muted-foreground">{tableSubtitle}</div>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">v0 drill-down table.</div>
              )}
            </div>
            <div className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
              Rows: {tableRows.length}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {tableRows.slice(0, 50).map((row) => (
              <div key={row.id} className="rounded-2xl border p-4">
                <div className="text-sm font-semibold">{row.name}</div>
                {row.note && <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.note}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

