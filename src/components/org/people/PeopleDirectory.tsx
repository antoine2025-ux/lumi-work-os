"use client"

import * as React from "react"
import Link from "next/link"
import { OrgEmpty } from "@/components/org/ui/OrgEmpty"
import { AvailabilityStatus, availabilityLabel, availabilityDotClass } from "@/components/org/people/profile/availability"
import { PeopleDirectoryHeader } from "./PeopleDirectoryHeader"

type Dept = { id: string; name: string }
type Team = { id: string; name: string; departmentId: string | null }
type PersonRow = {
  personKey: string
  userId: string
  name: string | null
  email: string | null
  role: string | null
  availability: string | null
  department: { id: string; name: string } | null
  team: { id: string; name: string } | null
}

type Payload = {
  departments: Dept[]
  teams: Team[]
  people: PersonRow[]
  meta: { totalPeople: number; visiblePeople: number }
}

function initials(name: string | null) {
  const n = (name || "").trim()
  if (!n) return "?"
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?"
}

async function fetchDirectory(params: {
  q?: string
  teamId?: string
  departmentId?: string
  availability?: string
}): Promise<Payload> {
  try {
    const sp = new URLSearchParams()
    if (params.q) sp.set("q", params.q)
    if (params.teamId) sp.set("teamId", params.teamId)
    if (params.departmentId) sp.set("departmentId", params.departmentId)
    if (params.availability) sp.set("availability", params.availability)
    const res = await fetch(`/api/org/people/directory?${sp.toString()}`, { cache: "no-store" })
    
    if (!res.ok) {
      throw new Error(`Failed to load directory: ${res.status}`)
    }
    
    const json = await res.json().catch((e) => {
      throw new Error(`Failed to parse directory response: ${e.message}`)
    })
    
    return json
  } catch (error: unknown) {
    throw new Error(`Network error loading directory: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export function PeopleDirectory() {
  const [q, setQ] = React.useState("")
  const [departmentId, setDepartmentId] = React.useState<string>("")
  const [teamId, setTeamId] = React.useState<string>("")
  const [availability, setAvailability] = React.useState<string>("")
  const [sortBy, setSortBy] = React.useState<"name" | "role">("name")

  const [data, setData] = React.useState<Payload | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setError(null)
      try {
        const payload = await fetchDirectory({
          q,
          departmentId: departmentId || undefined,
          teamId: teamId || undefined,
          availability: availability || undefined,
        })
        if (!cancelled) setData(payload)
      } catch (error: unknown) {
        console.error("Failed to load directory:", error)
        if (!cancelled) {
          setError(error instanceof Error ? error.message : "Failed to load directory")
          setData({
            departments: [],
            teams: [],
            people: [],
            meta: { totalPeople: 0, visiblePeople: 0 },
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [q, departmentId, teamId, availability])

  const departments = data?.departments ?? []
  const teams = (data?.teams ?? []).filter((t) => (departmentId ? t.departmentId === departmentId : true))
  let people = data?.people ?? []

  // Apply sorting
  people = [...people].sort((a, b) => {
    if (sortBy === "name") {
      const aName = (a.name || "").toLowerCase()
      const bName = (b.name || "").toLowerCase()
      return aName.localeCompare(bName)
    } else {
      const aRole = (a.role || "").toLowerCase()
      const bRole = (b.role || "").toLowerCase()
      return aRole.localeCompare(bRole)
    }
  })

  const hasFilters = q || departmentId || teamId || availability
  const showEmpty = !loading && (!people.length || (hasFilters && people.length === 0))

  return (
    <div className="space-y-6">
      {/* Unified Header Surface */}
      <PeopleDirectoryHeader
        q={q}
        setQ={setQ}
        departmentId={departmentId}
        setDepartmentId={setDepartmentId}
        teamId={teamId}
        setTeamId={setTeamId}
        availability={availability}
        setAvailability={setAvailability}
        sortBy={sortBy}
        setSortBy={setSortBy}
        departments={departments}
        teams={teams}
      />

      {/* People List */}
      {showEmpty ? (
        <OrgEmpty
          title={hasFilters ? "No people match these filters" : "No people yet"}
          description={hasFilters ? "Try adjusting your search or filters." : "Add people to start building your directory."}
        />
      ) : (
        <div className="space-y-4">
          {people.map((p) => {
            if (!p.personKey) return null

            const availabilityStatus: AvailabilityStatus = (p.availability as AvailabilityStatus) || "UNKNOWN"
            const dotClass = availabilityDotClass(availabilityStatus)
            const availabilityText = availabilityLabel(availabilityStatus)

            // Status indicators (missing data badges)
            const missingRole = !p.role
            const missingTeam = !p.team
            const orgLine = p.department?.name && p.team?.name
              ? `${p.team.name} · ${p.department.name}`
              : p.team?.name || p.department?.name || null

            return (
              <Link
                key={p.personKey}
                href={`/org/people/${encodeURIComponent(p.personKey)}?from=people`}
                className="block rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-12 w-12 shrink-0 rounded-full border border-white/10 bg-white/[0.05] flex items-center justify-center text-base font-semibold text-foreground">
                    {initials(p.name)}
                  </div>

                  {/* Identity Block */}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-foreground truncate">{p.name ?? "Unnamed"}</div>
                    {p.role && (
                      <div className="mt-0.5 text-sm text-foreground/60 truncate">{p.role}</div>
                    )}
                    {orgLine && (
                      <div className="mt-0.5 text-xs text-foreground/50 truncate">{orgLine}</div>
                    )}
                  </div>

                  {/* Status Indicators (Right-aligned) */}
                  <div className="shrink-0 flex items-center gap-2">
                    {/* Availability Badge */}
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
                      <span className="text-foreground/70">{availabilityText}</span>
                    </div>

                    {/* Optional Warning Badges */}
                    {(missingRole || missingTeam) && (
                      <div className="flex items-center gap-1.5">
                        {missingRole && (
                          <span className="inline-flex items-center rounded-full border border-yellow-600/30 bg-yellow-900/20 px-2 py-0.5 text-xs text-yellow-300">
                            Missing role
                          </span>
                        )}
                        {missingTeam && (
                          <span className="inline-flex items-center rounded-full border border-yellow-600/30 bg-yellow-900/20 px-2 py-0.5 text-xs text-yellow-300">
                            Missing team
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {loading && (
        <div className="py-8 text-center text-sm text-foreground/60">Loading…</div>
      )}

      {error && (
        <div className="py-8 text-center">
          <div className="text-sm text-foreground/60">{error}</div>
        </div>
      )}
    </div>
  )
}
