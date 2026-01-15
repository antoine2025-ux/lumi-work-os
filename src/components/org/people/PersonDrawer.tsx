"use client"

import * as React from "react"
import Link from "next/link"
import { OrgCard } from "@/components/org/ui/OrgCard"
import { orgTokens } from "@/components/org/ui/tokens"

type PersonDetail = {
  id: string
  name: string | null
  email: string | null
  title?: string | null
  availability?: string | null
  departmentName?: string | null
  teamNames?: string[]
  roles?: string[]
}

async function fetchPerson(id: string): Promise<PersonDetail> {
  const res = await fetch(`/api/org/people/${id}`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load person")
  const data = await res.json()
  return data
}

export function PersonDrawer(props: { personId: string | null }) {
  const [data, setData] = React.useState<PersonDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function run() {
      if (!props.personId) {
        setData(null)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const d = await fetchPerson(props.personId)
        if (!cancelled) setData(d)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load person")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [props.personId])

  if (!props.personId) {
    return (
      <OrgCard title="Select a person" subtitle="Choose someone from the directory to view details.">
        <div className="text-sm text-muted-foreground">No person selected.</div>
      </OrgCard>
    )
  }

  if (loading && !data) {
    return (
      <OrgCard title="Loading…" subtitle="Fetching person details.">
        <div className="text-sm text-muted-foreground">Please wait.</div>
      </OrgCard>
    )
  }

  if (error || !data) {
    return (
      <OrgCard title="Not found" subtitle="This person could not be loaded.">
        <div className="text-sm text-muted-foreground">{error || "Try selecting another person."}</div>
      </OrgCard>
    )
  }

  return (
    <OrgCard
      title={data.name ?? "Unnamed"}
      subtitle={data.title ?? data.email ?? "—"}
      right={
        <Link className={orgTokens.button + " shrink-0"} href={`/org/people/${data.id}/edit`}>
          Edit
        </Link>
      }
    >
      <div className="space-y-4">
        <div className={orgTokens.grid + " grid-cols-2"}>
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-muted-foreground">Availability</div>
            <div className="mt-1 text-sm font-semibold">{data.availability ?? "Unknown"}</div>
          </div>
          <div className="rounded-2xl border p-4">
            <div className="text-xs text-muted-foreground">Department</div>
            <div className="mt-1 text-sm font-semibold">{data.departmentName ?? "—"}</div>
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-muted-foreground">Teams</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(data.teamNames ?? []).length > 0 ? (
              (data.teamNames ?? []).map((t) => (
                <span key={t} className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
                  {t}
                </span>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No teams assigned.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="text-xs text-muted-foreground">Roles</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(data.roles ?? []).length > 0 ? (
              (data.roles ?? []).map((r) => (
                <span key={r} className="rounded-full border px-3 py-1 text-sm text-muted-foreground">
                  {r}
                </span>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No roles assigned.</div>
            )}
          </div>
        </div>
        </div>
    </OrgCard>
  )
}

