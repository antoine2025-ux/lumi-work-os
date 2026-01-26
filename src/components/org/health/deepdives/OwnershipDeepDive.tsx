"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

function AssignOwnerModal(props: {
  open: boolean
  onClose: () => void
  entityType: string
  entityId: string
  entityLabel: string
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [people, setPeople] = React.useState<Array<{ id: string; name: string; email: string | null }>>([])
  const [query, setQuery] = React.useState("")
  const [selected, setSelected] = React.useState<string>("")

  React.useEffect(() => {
    if (!props.open) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/org/people", { method: "GET" })
        if (!res.ok) return
        // Check content-type before parsing JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return;
        }
        const json = await res.json()
        if (cancelled) return
        // Adapt existing API response format
        const peopleList = json.ok && Array.isArray(json.people) ? json.people : []
        setPeople(peopleList.map((p: any) => ({
          id: String(p.id),
          name: String(p.name ?? p.email ?? `Person ${String(p.id).slice(0, 8)}`),
          email: p.email ? String(p.email) : null,
        })))
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [props.open])

  const filtered = people.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium text-muted-foreground">Assign primary owner</div>
            <div className="mt-1 truncate text-lg font-semibold">{props.entityLabel}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {String(props.entityType).toUpperCase()} · {props.entityId.slice(0, 8)}
            </div>
          </div>

          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
            onClick={props.onClose}
            disabled={loading}
          >
            Close
          </button>
        </div>

        <div className="mt-4">
          <div className="text-sm font-semibold">Select a person</div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
          />
        </div>

        <div className="mt-3 max-h-64 overflow-auto rounded-2xl border">
          {filtered.slice(0, 60).map((p) => {
            const active = selected === p.id
            return (
              <button
                key={p.id}
                type="button"
                className={[
                  "flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40",
                  active ? "bg-muted/40" : "",
                ].join(" ")}
                onClick={() => setSelected(p.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  {p.email && <div className="truncate text-xs text-muted-foreground">{p.email}</div>}
                </div>
                {active && (
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                    Selected
                  </span>
                )}
              </button>
            )
          })}

          {filtered.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No people found.
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
            onClick={props.onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
            disabled={!selected || loading}
            onClick={async () => {
              setLoading(true)
              try {
                const res = await fetch("/api/org/ownership/assign", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    entityType: String(props.entityType).toUpperCase(),
                    entityId: props.entityId,
                    entityLabel: props.entityLabel,
                    ownerPersonId: selected,
                  }),
                })
                if (res.ok) {
                  const data = await res.json()
                  // Optimistic update: use scoped response data
                  // Toast notification (if toast available)
                  if (typeof window !== 'undefined' && (window as any).toast) {
                    (window as any).toast({ title: "Ownership assigned", description: "Ownership coverage updated." })
                  }
                  // Refresh to update UI with latest data
                  router.refresh()
                }
              } catch {
                // silent fail
              } finally {
                setLoading(false)
              }
            }}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}

function PeoplePicker(props: {
  open: boolean
  title: string
  onClose: () => void
  onPick: (id: string) => void
}) {
  const [q, setQ] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [people, setPeople] = React.useState<Array<{ id: string; name: string; email: string | null }>>([])

  React.useEffect(() => {
    if (!props.open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/org/people?q=${encodeURIComponent(q)}`)
        // Check content-type before parsing JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          if (cancelled) return;
          setPeople([]);
          setLoading(false);
          return;
        }
        const json = await res.json()
        if (cancelled) return
        setPeople(Array.isArray(json.people) ? json.people : [])
      } catch {
        if (!cancelled) setPeople([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [props.open, q])

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{props.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">Search and select a person.</div>
          </div>
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose}>
            Close
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or email…"
          className="mt-4 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
        />

        <div className="mt-3 max-h-72 overflow-auto rounded-2xl border">
          {loading && <div className="px-3 py-3 text-sm text-muted-foreground">Loading…</div>}
          {!loading &&
            people.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40"
                onClick={() => props.onPick(p.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  {p.email && <div className="truncate text-xs text-muted-foreground">{p.email}</div>}
                </div>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Select</span>
              </button>
            ))}
          {!loading && people.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">No matches.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function BulkAssignOwnerModal(props: {
  open: boolean
  onClose: () => void
  entityType: "TEAM" | "DOMAIN" | "SYSTEM" | "ALL"
}) {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [unowned, setUnowned] = React.useState<Array<{ entityType: string; entityId: string; entityLabel: string }>>([])
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [ownerId, setOwnerId] = React.useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)

  React.useEffect(() => {
    if (!props.open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const type = props.entityType === "ALL" ? "" : props.entityType
        const res = await fetch(`/api/org/ownership/unowned?type=${encodeURIComponent(type)}&take=20`)
        // Check content-type before parsing JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          if (cancelled) return;
          setUnowned([]);
          setLoading(false);
          return;
        }
        const json = await res.json()
        if (cancelled) return
        setUnowned(Array.isArray(json.unowned) ? json.unowned : [])
      } catch {
        if (!cancelled) setUnowned([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [props.open, props.entityType])

  if (!props.open) return null

  const filtered = props.entityType === "ALL" ? unowned : unowned.filter((u) => String(u.entityType).toUpperCase() === props.entityType)

  return (
    <>
      <PeoplePicker
        open={pickerOpen}
        title="Pick owner"
        onClose={() => setPickerOpen(false)}
        onPick={(id) => {
          setOwnerId(id)
          setPickerOpen(false)
        }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
        <div className="w-full max-w-2xl rounded-2xl border bg-background p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Bulk assign owner</div>
              <div className="mt-1 text-sm text-muted-foreground">Select entities and assign a single owner.</div>
            </div>
            <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose}>
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div className="text-sm">
                Owner: <span className="text-muted-foreground">{ownerId ? ownerId.slice(0, 8) : "—"}</span>
              </div>
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                onClick={() => setPickerOpen(true)}
              >
                Pick person
              </button>
            </div>

            <div className="max-h-96 overflow-auto rounded-2xl border">
              {loading && <div className="px-3 py-3 text-sm text-muted-foreground">Loading…</div>}
              {!loading &&
                filtered.map((u) => {
                  const checked = selected.has(u.entityId)
                  return (
                    <label
                      key={u.entityId}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const newSet = new Set(selected)
                          if (e.target.checked) {
                            newSet.add(u.entityId)
                          } else {
                            newSet.delete(u.entityId)
                          }
                          setSelected(newSet)
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{u.entityLabel}</div>
                        <div className="text-xs text-muted-foreground">
                          {String(u.entityType).toUpperCase()} · {u.entityId.slice(0, 8)}
                        </div>
                      </div>
                    </label>
                  )
                })}
              {!loading && filtered.length === 0 && (
                <div className="px-3 py-3 text-sm text-muted-foreground">No unowned entities found.</div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose}>
              Cancel
            </button>
            <button
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
              disabled={!ownerId || selected.size === 0}
              onClick={async () => {
                if (!ownerId || selected.size === 0) return
                const entityIds = Array.from(selected)
                const entityType = filtered[0]?.entityType as "TEAM" | "DOMAIN" | "SYSTEM"
                if (!entityType) return

                setLoading(true)
                try {
                  await fetch("/api/org/ownership/bulk-assign", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ entityType, ownerPersonId: ownerId, entityIds }),
                  })
                  router.refresh()
                  props.onClose()
                } catch {
                  // ignore
                } finally {
                  setLoading(false)
                }
              }}
            >
              Assign {selected.size} {selected.size === 1 ? "entity" : "entities"}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export function OwnershipDeepDive(props: {
  data: {
    headline: string
    summary: string
    stats: Array<{ label: string; value: number }>
    recommendations: string[]
    unowned: Array<{ entityType: string; entityId: string; entityLabel: string }>
  }
  focus?: { type?: string; id?: string }
}) {
  const { data, focus } = props
  const [assign, setAssign] = React.useState<null | { entityType: string; entityId: string; entityLabel: string }>(null)
  const [filter, setFilter] = React.useState<"ALL" | "TEAM" | "DOMAIN" | "SYSTEM">("ALL")
  const [bulkOpen, setBulkOpen] = React.useState(false)

  const grouped = React.useMemo(() => {
    const g = new Map<string, Array<any>>()
    const filtered = filter === "ALL" ? data.unowned : data.unowned.filter((u) => String(u.entityType).toUpperCase() === filter)
    for (const u of filtered) {
      const key = String(u.entityType).toUpperCase()
      g.set(key, [...(g.get(key) ?? []), u])
    }
    return Array.from(g.entries())
  }, [data.unowned, filter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.headline}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{data.summary}</p>
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
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {data.recommendations.map((r, i) => (
            <li key={`${r}_${i}`}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Unowned entities</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Assigns to improve accountability and decision speed.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
              Rows: {data.unowned.length}
            </div>
            <button
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
              onClick={() => setBulkOpen(true)}
            >
              Bulk assign
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="text-xs font-medium text-muted-foreground">Filter:</div>
          <select
            className="rounded-xl border bg-background px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="ALL">All types</option>
            <option value="TEAM">Teams</option>
            <option value="DOMAIN">Domains</option>
            <option value="SYSTEM">Systems</option>
          </select>
        </div>

        <div className="mt-4">
          {data.unowned.length === 0 ? (
            <div className="rounded-2xl border px-4 py-6 text-sm text-muted-foreground">
              No unowned entities detected across teams/domains/systems.
            </div>
          ) : (
            grouped.map(([type, items]) => (
              <div key={type} className="mt-4 rounded-2xl border">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="text-sm font-semibold">{type}</div>
                  <div className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    {items.length}
                  </div>
                </div>
                <div className="h-px w-full bg-border" />
                <div className="p-4 space-y-2">
                  {items.map((x) => {
                    const isFocused =
                      focus?.type &&
                      focus?.id &&
                      String(focus.type).toUpperCase() === String(x.entityType).toUpperCase() &&
                      String(focus.id) === String(x.entityId)

                    return (
                      <div
                        key={`${x.entityType}_${x.entityId}`}
                        className={[
                          "rounded-2xl border p-4",
                          isFocused ? "bg-muted/40" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold">{x.entityLabel}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Primary owner: —
                            </div>
                          </div>

                          {isFocused && (
                            <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                              From signal
                            </span>
                          )}
                        </div>

                        <div className="mt-4 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                            onClick={() =>
                              setAssign({
                                entityType: String(x.entityType),
                                entityId: String(x.entityId),
                                entityLabel: String(x.entityLabel),
                              })
                            }
                          >
                            Assign
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AssignOwnerModal
        open={!!assign}
        onClose={() => setAssign(null)}
        entityType={assign?.entityType ?? ""}
        entityId={assign?.entityId ?? ""}
        entityLabel={assign?.entityLabel ?? ""}
      />

      <BulkAssignOwnerModal open={bulkOpen} onClose={() => setBulkOpen(false)} entityType={filter} />
    </div>
  )
}

