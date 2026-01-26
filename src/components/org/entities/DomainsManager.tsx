"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

type Domain = { id: string; name: string; description: string | null }

export function DomainsManager() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<Domain[]>([])
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch("/api/org/domains")
      const json = await res.json()
      setRows(Array.isArray(json.domains) ? json.domains : [])
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
          <h1 className="mt-1 text-2xl font-semibold">Domains</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Define domains so ownership and health signals can cover them.
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
        <div className="text-sm font-semibold">Create domain</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Name</div>
            <input
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Payments, Compliance, Growth…"
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
              await fetch("/api/org/domains", {
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
          <div className="text-sm font-semibold">Domains</div>
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={refresh}>
            Refresh
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading &&
            rows.map((d) => (
              <div key={d.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{d.name}</div>
                    {d.description && <div className="mt-1 text-sm text-muted-foreground">{d.description}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">{d.id}</div>
                  </div>

                  <a
                    className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted"
                    href={`/org/health/ownership?type=DOMAIN&id=${encodeURIComponent(d.id)}`}
                  >
                    Assign
                  </a>
                </div>
              </div>
            ))}

          {!loading && rows.length === 0 && (
            <div className="rounded-2xl border px-4 py-6 text-sm text-muted-foreground">
              No domains yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

