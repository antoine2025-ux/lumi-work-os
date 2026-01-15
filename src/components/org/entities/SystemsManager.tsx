"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

type SystemEntity = { id: string; name: string; description: string | null }

export function SystemsManager() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<SystemEntity[]>([])
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch("/api/org/systems")
      const json = await res.json()
      setRows(Array.isArray(json.systems) ? json.systems : [])
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Premium</div>
          <h1 className="mt-1 text-2xl font-semibold">Systems</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Define systems so ownership and health signals can cover them.
          </p>
        </div>

        <a
          href="/org/health/setup"
          className="inline-flex w-fit items-center justify-center rounded-2xl border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
        >
          Back to setup
        </a>
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="text-sm font-semibold">Create system</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Name</div>
            <input
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Core Ledger, KYC Pipeline…"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">Description</div>
            <input
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
            disabled={!name.trim()}
            onClick={async () => {
              await fetch("/api/org/systems", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name, description }),
              })
              setName("")
              setDescription("")
              await refresh()
              router.refresh()
            }}
          >
            Create
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Systems</div>
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={refresh}>
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading &&
            rows.map((s) => (
              <div key={s.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    {s.description && <div className="mt-1 text-sm text-muted-foreground">{s.description}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">{s.id}</div>
                  </div>

                  <a
                    className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                    href={`/org/health/ownership?type=SYSTEM&id=${encodeURIComponent(s.id)}`}
                  >
                    Assign owner
                  </a>
                </div>
              </div>
            ))}

          {!loading && rows.length === 0 && (
            <div className="rounded-2xl border px-4 py-6 text-sm text-muted-foreground">
              No systems yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

