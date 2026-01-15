"use client"

import * as React from "react"
import Link from "next/link"
import { Search } from "lucide-react"

type Dept = { id: string; name: string }
type Team = { id: string; name: string; departmentId: string | null }

type PeopleDirectoryHeaderProps = {
  q: string
  setQ: (value: string) => void
  departmentId: string
  setDepartmentId: (value: string) => void
  teamId: string
  setTeamId: (value: string) => void
  availability: string
  setAvailability: (value: string) => void
  sortBy: "name" | "role"
  setSortBy: (value: "name" | "role") => void
  departments: Dept[]
  teams: Team[]
}

export function PeopleDirectoryHeader(props: PeopleDirectoryHeaderProps) {
  const {
    q,
    setQ,
    departmentId,
    setDepartmentId,
    teamId,
    setTeamId,
    availability,
    setAvailability,
    sortBy,
    setSortBy,
    departments,
    teams,
  } = props

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      {/* Title + Subtitle + Add Button */}
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">People</h1>
          <div className="mt-1.5 text-sm text-white/60">
            Everyone in your organization
          </div>
        </div>

        <Link
          href="/org/people/new"
          className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white hover:bg-white/[0.08] transition-colors"
        >
          Add person
        </Link>
      </div>

      {/* Filter Row - Single Inline Control Group */}
      <div className="flex items-center gap-3 flex-nowrap">
        {/* Search - takes 50-60% width */}
        <div className="relative flex-[0_1_50%] min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, or role…"
            className="w-full h-10 rounded-xl border border-white/10 bg-white/[0.02] pl-9 pr-3 text-sm text-white placeholder:text-white/35 outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Department Filter */}
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value)
            setTeamId("")
          }}
          className="h-10 rounded-xl border border-white/10 bg-white/[0.02] px-3 pr-8 text-sm text-white outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all appearance-none cursor-pointer shrink-0 min-w-[140px]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='rgba(255,255,255,0.5)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
          }}
        >
          <option value="" className="bg-[#020617] text-white">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id} className="bg-[#020617] text-white">
              {d.name}
            </option>
          ))}
        </select>

        {/* Team Filter */}
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-white/[0.02] px-3 pr-8 text-sm text-white outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all appearance-none cursor-pointer shrink-0 min-w-[120px]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='rgba(255,255,255,0.5)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
          }}
        >
          <option value="" className="bg-[#020617] text-white">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id} className="bg-[#020617] text-white">
              {t.name}
            </option>
          ))}
        </select>

        {/* Availability Filter */}
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          className="h-10 rounded-xl border border-white/10 bg-white/[0.02] px-3 pr-8 text-sm text-white outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all appearance-none cursor-pointer shrink-0 min-w-[140px]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='rgba(255,255,255,0.5)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
          }}
        >
          <option value="" className="bg-[#020617] text-white">Any availability</option>
          <option value="AVAILABLE" className="bg-[#020617] text-white">Available</option>
          <option value="LIMITED" className="bg-[#020617] text-white">Limited</option>
          <option value="UNAVAILABLE" className="bg-[#020617] text-white">Unavailable</option>
          <option value="OOO" className="bg-[#020617] text-white">Out of Office</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "name" | "role")}
          className="h-10 rounded-xl border border-white/10 bg-white/[0.02] px-3 pr-8 text-sm text-white outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all appearance-none cursor-pointer shrink-0 min-w-[120px]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='rgba(255,255,255,0.5)' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 0.75rem center',
          }}
        >
          <option value="name" className="bg-[#020617] text-white">Name A–Z</option>
          <option value="role" className="bg-[#020617] text-white">Role</option>
        </select>
      </div>
    </div>
  )
}

