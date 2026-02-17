// @ts-nocheck
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

type Item = {
  key: string
  title: string
  description: string
  status: "DONE" | "PARTIAL" | "MISSING"
  score: number
  href: string
}

function statusLabel(s: Item["status"]) {
  if (s === "DONE") return "Done"
  if (s === "PARTIAL") return "Partial"
  return "Missing"
}

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

function EntityPicker(props: {
  open: boolean
  type: "TEAM" | "DOMAIN" | "SYSTEM"
  title: string
  onClose: () => void
  onPick: (entity: { id: string; label: string }) => void
}) {
  const [q, setQ] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [entities, setEntities] = React.useState<Array<{ id: string; label: string }>>([])

  React.useEffect(() => {
    if (!props.open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`/api/org/entities?type=${encodeURIComponent(props.type)}&q=${encodeURIComponent(q)}`)
        const json = await res.json()
        if (cancelled) return
        setEntities(Array.isArray(json.entities) ? json.entities : [])
      } catch {
        if (!cancelled) setEntities([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [props.open, props.type, q])

  if (!props.open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{props.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">Search and select an entity.</div>
          </div>
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose}>
            Close
          </button>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="mt-4 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
        />

        <div className="mt-3 max-h-72 overflow-auto rounded-2xl border">
          {loading && <div className="px-3 py-3 text-sm text-muted-foreground">Loading…</div>}
          {!loading &&
            entities.map((e) => (
              <button
                key={e.id}
                type="button"
                className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/40"
                onClick={() => props.onPick(e)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.label}</div>
                  <div className="truncate text-xs text-muted-foreground">{e.id.slice(0, 10)}</div>
                </div>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">Select</span>
              </button>
            ))}
          {!loading && entities.length === 0 && <div className="px-3 py-3 text-sm text-muted-foreground">No matches.</div>}
        </div>
      </div>
    </div>
  )
}

function QuickAssignOwnerModal(props: {
  open: boolean
  onClose: () => void
  onToast: (t: { title: string; description?: string }) => void
  onDone: () => void
}) {
  const [entityType, setEntityType] = React.useState<"TEAM" | "DOMAIN" | "SYSTEM">("TEAM")
  const [entity, setEntity] = React.useState<null | { id: string; label: string }>(null)
  const [ownerId, setOwnerId] = React.useState<string | null>(null)
  const [peoplePickerOpen, setPeoplePickerOpen] = React.useState(false)
  const [entityPickerOpen, setEntityPickerOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  if (!props.open) return null

  return (
    <>
      <PeoplePicker
        open={peoplePickerOpen}
        title="Pick owner"
        onClose={() => setPeoplePickerOpen(false)}
        onPick={(id) => {
          setOwnerId(id)
          setPeoplePickerOpen(false)
        }}
      />

      <EntityPicker
        open={entityPickerOpen}
        type={entityType}
        title={`Pick ${entityType.toLowerCase()}`}
        onClose={() => setEntityPickerOpen(false)}
        onPick={(e) => {
          setEntity(e)
          setEntityPickerOpen(false)
        }}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
        <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Quick add: Owner</div>
              <div className="mt-1 text-sm text-muted-foreground">Assign a primary owner to an entity.</div>
            </div>
            <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose} disabled={loading}>
              Close
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Entity type</div>
              <select
                className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value as any)
                  setEntity(null)
                }}
              >
                <option value="TEAM">Team</option>
                <option value="DOMAIN">Domain</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div className="min-w-0 text-sm">
                Entity:{" "}
                <span className="truncate text-muted-foreground">
                  {entity ? entity.label : "—"}
                </span>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                onClick={() => setEntityPickerOpen(true)}
                disabled={loading}
              >
                Pick {entityType.toLowerCase()}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div className="text-sm">
                Owner: <span className="text-muted-foreground">{ownerId ? ownerId.slice(0, 8) : "—"}</span>
              </div>
              <button
                type="button"
                className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                onClick={() => setPeoplePickerOpen(true)}
                disabled={loading}
              >
                Pick person
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
              disabled={!entity || !ownerId || loading}
              onClick={async () => {
                setLoading(true)
                try {
                  const res = await fetch("/api/org/ownership/assign", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      entityType,
                      entityId: entity!.id,
                      entityLabel: entity!.label,
                      ownerPersonId: ownerId,
                    }),
                  })
                  if (!res.ok) throw new Error("failed")
                  const data = await res.json()
                  // Optimistic update: show success toast with scoped response info
                  props.onToast({
                    title: "Ownership assigned",
                    description: `${entity!.label} now has a primary owner. Ownership coverage updated.`,
                  })
                  // Note: Use data.issuesVersion for optional revalidation if needed
                  props.onDone()
                } catch {
                  props.onToast({ title: "Failed to assign owner", description: "Please try again." })
                } finally {
                  setLoading(false)
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function QuickManagerLinkModal(props: { open: boolean; onClose: () => void; onToast: (t: { title: string; description?: string }) => void; onDone: () => void }) {
  const [personId, setPersonId] = React.useState<string | null>(null)
  const [managerId, setManagerId] = React.useState<string | null>(null)
  const [picker, setPicker] = React.useState<null | "person" | "manager">(null)
  const [loading, setLoading] = React.useState(false)

  if (!props.open) return null

  return (
    <>
      <PeoplePicker
        open={picker !== null}
        title={picker === "manager" ? "Pick manager" : "Pick person"}
        onClose={() => setPicker(null)}
        onPick={(id) => {
          if (picker === "manager") setManagerId(id)
          else setPersonId(id)
          setPicker(null)
        }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
        <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Quick add: Manager link</div>
              <div className="mt-1 text-sm text-muted-foreground">Assign a manager for a person.</div>
            </div>
            <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose}>
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div className="text-sm">
                Person: <span className="text-muted-foreground">{personId ? personId.slice(0, 8) : "—"}</span>
              </div>
              <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={() => setPicker("person")}>
                Pick person
              </button>
            </div>

            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div className="text-sm">
                Manager: <span className="text-muted-foreground">{managerId ? managerId.slice(0, 8) : "—"}</span>
              </div>
              <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={() => setPicker("manager")}>
                Pick manager
              </button>
            </div>

            <div className="text-xs text-muted-foreground">
              Tip: Keep spans healthy. WATCH ≥ 8, HIGH ≥ 12 direct reports.
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
              disabled={!personId || !managerId || loading || personId === managerId}
              onClick={async () => {
                setLoading(true)
                try {
                  const res = await fetch("/api/org/management/link", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ personId, managerId }),
                  })
                  if (!res.ok) throw new Error("failed")
                  props.onToast({ title: "Manager link created", description: "Manager relationship has been assigned." })
                  props.onDone()
                } catch {
                  props.onToast({ title: "Failed to create manager link", description: "Please try again." })
                } finally {
                  setLoading(false)
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function QuickRoleAssignModal(props: { open: boolean; onClose: () => void }) {
  const [personId, setPersonId] = React.useState<string | null>(null)
  const [role, setRole] = React.useState("Engineer")
  const [percent, setPercent] = React.useState(100)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  if (!props.open) return null

  return (
    <>
      <PeoplePicker
        open={pickerOpen}
        title="Pick person"
        onClose={() => setPickerOpen(false)}
        onPick={(id) => {
          setPersonId(id)
          setPickerOpen(false)
        }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
        <div className="w-full max-w-lg rounded-2xl border bg-background p-5 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Quick add: Role</div>
              <div className="mt-1 text-sm text-muted-foreground">Assign a role to help detect role gaps.</div>
            </div>
            <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose}>
              Close
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border p-3">
              <div className="text-sm">
                Person: <span className="text-muted-foreground">{personId ? personId.slice(0, 8) : "—"}</span>
              </div>
              <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={() => setPickerOpen(true)}>
                Pick person
              </button>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground">Role</div>
              <input
                className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Engineer, PM, Designer, QA…"
              />
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground">Percent</div>
              <input
                type="number"
                className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                min={1}
                max={100}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={props.onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
              disabled={!personId || !role || loading}
              onClick={async () => {
                setLoading(true)
                try {
                  const res = await fetch("/api/org/roles/assign", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ personId, role, percent }),
                  })
                  if (!res.ok) throw new Error("failed")
                  props.onToast({ title: "Role assigned", description: `${role} role has been assigned.` })
                  props.onDone()
                } catch {
                  props.onToast({ title: "Failed to assign role", description: "Please try again." })
                } finally {
                  setLoading(false)
                }
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export function SetupWizard() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [overall, setOverall] = React.useState<number>(0)
  const [items, setItems] = React.useState<Item[]>([])
  const [quick, setQuick] = React.useState<null | "owner" | "manager" | "role">(null)
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const [unownedPreview, setUnownedPreview] = React.useState<Array<{ entityType: string; entityId: string; entityLabel: string }> | null>(null)

  function pushToast(t: { title: string; description?: string }) {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { id, ...t }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, 2400)
  }

  function onDoneClose() {
    setQuick(null)
    router.refresh()
  }

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/org/health/setup", { method: "GET" })
        if (!res.ok) throw new Error("failed")
        const json = await res.json()
        if (cancelled) return
        setOverall(Number(json.overallScore ?? 0))
        setItems(Array.isArray(json.items) ? json.items : [])
      } catch {
        if (cancelled) return
        setOverall(0)
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Premium</div>
          <h1 className="mt-1 text-2xl font-semibold">Org Health setup</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Complete the checklist to unlock accurate signals across capacity, ownership, structure, and management load.
          </p>
        </div>

        <div className="rounded-2xl border bg-background px-4 py-3 shadow-sm">
          <div className="text-xs font-medium text-muted-foreground">Completeness</div>
          <div className="mt-1 text-2xl font-semibold">{loading ? "—" : `${overall}/100`}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {overall >= 85 ? "Strong" : overall >= 60 ? "Getting there" : "Needs setup"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">Checklist</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Each item links you to the right deep dive to fill missing data.
            </div>
          </div>
          <button
            type="button"
            className="rounded-2xl border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            onClick={() => {
              pushToast({ title: "Refreshing…", description: "Updating setup checklist." })
              router.refresh()
            }}
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {items.map((it) => (
            <a
              key={it.key}
              href={it.href}
              className="block rounded-2xl border p-4 hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold">{it.title}</div>
                    <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      {statusLabel(it.status)}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">{it.description}</div>
                  {it.key === "ownership" && it.status !== "DONE" && (
                    <div className="mt-3">
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (expanded[it.key]) {
                            setExpanded((prev) => ({ ...prev, [it.key]: false }))
                            setUnownedPreview(null)
                          } else {
                            setExpanded((prev) => ({ ...prev, [it.key]: true }))
                            ;(async () => {
                              try {
                                const res = await fetch("/api/org/ownership/unowned?take=5")
                                const json = await res.json()
                                setUnownedPreview(Array.isArray(json.unowned) ? json.unowned : [])
                              } catch {
                                setUnownedPreview([])
                              }
                            })()
                          }
                        }}
                      >
                        {expanded[it.key] ? "Hide" : "View"} top unowned
                      </button>
                      {expanded[it.key] && unownedPreview !== null && (
                        <div className="mt-2 rounded-xl border bg-muted/20 p-3">
                          {unownedPreview.length === 0 ? (
                            <div className="text-xs text-muted-foreground">No unowned entities found.</div>
                          ) : (
                            <div className="space-y-1">
                              {unownedPreview.map((u) => (
                                <div key={u.entityId} className="text-xs text-muted-foreground">
                                  {u.entityLabel} ({String(u.entityType).toUpperCase()})
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {it.key === "ownership" && (
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setQuick("owner")
                      }}
                    >
                      Quick add owner
                    </button>
                  )}
                  {it.key === "manager_links" && (
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setQuick("manager")
                      }}
                    >
                      Quick add link
                    </button>
                  )}
                  {it.key === "roles" && (
                    <button
                      type="button"
                      className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setQuick("role")
                      }}
                    >
                      Quick add role
                    </button>
                  )}
                  <div className="text-sm text-muted-foreground">{it.score}/100</div>
                </div>
              </div>

              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, it.score))}%` }}
                />
              </div>
            </a>
          ))}

          {!loading && items.length === 0 && (
            <div className="rounded-2xl border px-4 py-6 text-sm text-muted-foreground">
              Unable to load setup checklist.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="text-sm font-semibold">Import CSV</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Paste CSV and preview validation before applying.
        </div>

        <ImportCsvPanel onToast={pushToast} onDone={onDoneClose} />
      </div>

      <div className="mt-4 rounded-2xl border p-4">
        <div className="text-sm font-semibold">Maintenance</div>
        <div className="mt-1 text-sm text-muted-foreground">
          If you enabled unique constraints and had legacy duplicates, clean them up safely.
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
            onClick={async () => {
              pushToast({ title: "Running cleanup…", description: "Removing duplicate rows." })
              const res = await fetch("/api/org/maintenance/dedup", { method: "POST" })
              if (res.ok) pushToast({ title: "Cleanup complete", description: "Duplicates removed." })
              else pushToast({ title: "Cleanup failed", description: "Please try again." })
              onDoneClose()
            }}
          >
            Clean duplicates
          </button>
        </div>
      </div>

      <QuickAssignOwnerModal open={quick === "owner"} onClose={() => setQuick(null)} onToast={pushToast} onDone={onDoneClose} />
      <QuickManagerLinkModal open={quick === "manager"} onClose={() => setQuick(null)} onToast={pushToast} onDone={onDoneClose} />
      <QuickRoleAssignModal open={quick === "role"} onClose={() => setQuick(null)} onToast={pushToast} onDone={onDoneClose} />

      <ToastStack toasts={toasts} />
    </div>
  )
}

function ImportCsvPanel(props: {
  onToast: (t: { title: string; description?: string }) => void
  onDone: () => void
}) {
  const [entity, setEntity] = React.useState("manager_links")
  const [csv, setCsv] = React.useState("")
  const [preview, setPreview] = React.useState<any | null>(null)
  const [loading, setLoading] = React.useState(false)

  async function runPreview() {
    setLoading(true)
    try {
      const res = await fetch("/api/org/import/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity, csv }),
      })
      const json = await res.json()
      setPreview(json)
      if (!res.ok) props.onToast({ title: "Preview failed", description: "Fix validation errors and try again." })
      else props.onToast({ title: "Preview ready", description: `${json.count ?? 0} rows parsed.` })
    } catch {
      props.onToast({ title: "Preview failed", description: "Network error." })
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  async function apply() {
    setLoading(true)
    try {
      const res = await fetch("/api/org/import/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity, csv }),
      })
      const json = await res.json()
      if (!res.ok) {
        props.onToast({ title: "Import failed", description: "Fix errors and retry." })
        setPreview(json)
      } else {
        props.onToast({ title: "Import applied", description: `${json.applied ?? 0} rows applied.` })
        props.onDone()
      }
    } catch {
      props.onToast({ title: "Import failed", description: "Network error." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="text-xs font-medium text-muted-foreground">Dataset</div>
          <select
            className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            disabled={loading}
          >
            <option value="manager_links">Manager links (personEmail/managerEmail or personId/managerId)</option>
            <option value="roles">Roles (personEmail or personId, role, percent)</option>
            <option value="availability">Availability (personEmail or personId, status, reason)</option>
            <option value="capacity">Capacity (personEmail or personId, fte, shrinkagePct)</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs font-medium text-muted-foreground">CSV</div>
          <textarea
            className="mt-1 h-40 w-full rounded-xl border bg-background px-3 py-2 text-sm"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder="Paste CSV here…"
            disabled={loading}
          />
        </div>
      </div>

      <details className="rounded-2xl border p-3">
        <summary className="cursor-pointer text-sm font-medium">Example CSV formats</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border p-3">
            <div className="text-xs font-medium text-muted-foreground">Manager links</div>
            <textarea
              readOnly
              className="mt-2 h-24 w-full rounded-xl border bg-background px-2 py-2 text-xs"
              value={"personEmail,managerEmail\nalice@acme.com,bob@acme.com\n"}
            />
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs font-medium text-muted-foreground">Roles</div>
            <textarea
              readOnly
              className="mt-2 h-24 w-full rounded-xl border bg-background px-2 py-2 text-xs"
              value={"personEmail,role,percent\nalice@acme.com,Engineer,100\n"}
            />
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs font-medium text-muted-foreground">Availability</div>
            <textarea
              readOnly
              className="mt-2 h-24 w-full rounded-xl border bg-background px-2 py-2 text-xs"
              value={"personEmail,status,reason\nalice@acme.com,LIMITED,On-call\n"}
            />
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs font-medium text-muted-foreground">Capacity</div>
            <textarea
              readOnly
              className="mt-2 h-24 w-full rounded-xl border bg-background px-2 py-2 text-xs"
              value={"personEmail,fte,shrinkagePct\nalice@acme.com,1,20\n"}
            />
          </div>
        </div>
      </details>

      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
          onClick={runPreview}
          disabled={loading || !csv.trim()}
        >
          Preview
        </button>
        <button
          className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
          onClick={apply}
          disabled={loading || !preview?.ok}
        >
          Apply
        </button>
      </div>

      {preview && (
        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Preview</div>
            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
              {preview.ok ? "OK" : "Has errors"} · {preview.count ?? 0} rows
            </span>
          </div>

          {!!preview.sample?.length && (
            <div className="mt-3">
              <div className="text-xs font-medium text-muted-foreground">Sample</div>
              <div className="mt-2 space-y-2">
                {preview.sample.map((s: any, i: number) => (
                  <div key={i} className="rounded-xl border px-3 py-2 text-xs text-muted-foreground">
                    {JSON.stringify(s)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!preview.errors?.length && (
            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground">Errors</div>
              <div className="mt-2 space-y-2">
                {preview.errors.slice(0, 12).map((e: any, i: number) => (
                  <div key={i} className="rounded-xl border px-3 py-2 text-xs text-muted-foreground">
                    Row {e.row}{e.field ? ` · ${e.field}` : ""}: {e.message}
                  </div>
                ))}
                {preview.errors.length > 12 && (
                  <div className="text-xs text-muted-foreground">
                    And {preview.errors.length - 12} more…
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Import supports personEmail/managerEmail (looks up existing people) or personId/managerId directly.
      </div>
    </div>
  )
}

