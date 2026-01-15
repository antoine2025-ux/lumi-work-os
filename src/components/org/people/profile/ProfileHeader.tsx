"use client"

import * as React from "react"
import Link from "next/link"
import { OrgCard } from "@/components/org/ui/OrgCard"
import { orgTokens } from "@/components/org/ui/tokens"
import { AvailabilityStatus, availabilityLabel, availabilityDotClass } from "./availability"

type PersonProfile = {
  person: {
    personKey: string
    userId: string | null
    displayName: string
    avatarUrl?: string | null
    email?: string | null
    personId: string
    location?: { city?: string | null; country?: string | null; timezone?: string | null; localTime?: string | null } | null
  }
  orgPlacement: {
    department?: { id: string; name: string } | null
    primaryTeam?: { id: string; name: string } | null
    teams: Array<{ id: string; name: string }>
    role?: { title: string | null } | null
  }
  availability: {
    status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE" | "OOO" | "UNKNOWN"
    statusNote?: string | null
    nextChangeAt?: string | null
    lastUpdatedAt?: string | null
  }
}

function initials(name: string) {
  const n = (name || "").trim()
  if (!n) return "?"
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?"
}


async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {}
}

export function ProfileHeader(props: { data: PersonProfile }) {
  const { data } = props
  const name = data.person.displayName || "Unnamed person"
  const title = data.orgPlacement.role?.title || "Role not set"
  const dept = data.orgPlacement.department?.name || null
  const team = data.orgPlacement.primaryTeam?.name || data.orgPlacement.teams[0]?.name || null

  const subline = [team, dept].filter(Boolean).join(" · ") || "Team not set"
  const status: AvailabilityStatus = (data.availability?.status ?? "UNKNOWN") as AvailabilityStatus

  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [menuOpen])

  return (
    <OrgCard
      title="Profile"
      actions={
        <div className="relative" ref={menuRef}>
          <button
            className={orgTokens.iconButton}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Profile actions"
          >
            ⋯
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border bg-background shadow-sm overflow-hidden">
              {data.person.email ? (
                <button
                  onClick={() => {
                    copy(data.person.email!)
                    setMenuOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/30"
                >
                  Copy email
                </button>
              ) : null}
              <button
                onClick={() => {
                  copy(data.person.personId)
                  setMenuOpen(false)
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-muted/30"
              >
                Copy person ID
              </button>
              <div className="border-t" />
              <Link
                href={`/org/people/${data.person.personKey}/edit`}
                className="block px-4 py-2 text-sm hover:bg-muted/30"
                onClick={() => setMenuOpen(false)}
              >
                Edit profile
              </Link>
              <Link
                href={`/org/chart`}
                className="block px-4 py-2 text-sm hover:bg-muted/30"
                onClick={() => setMenuOpen(false)}
              >
                Open in Org chart
              </Link>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-2xl border flex items-center justify-center text-sm font-semibold bg-background">
          {data.person.avatarUrl ? (
            <img src={data.person.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
          ) : (
            <span>{initials(name)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-2xl font-semibold tracking-tight truncate">{name}</div>
              <div className="mt-1 text-sm text-muted-foreground truncate">
                {title} · {subline}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  ID {data.person.personId}
                </span>
                {data.person.email ? (
                  <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    {data.person.email}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${availabilityDotClass(status)}`} />
              {availabilityLabel(status)}
            </div>
          </div>

          {(data.availability?.statusNote || data.availability?.nextChangeAt) ? (
            <div className="mt-3 text-sm text-muted-foreground">
              {data.availability.statusNote ? <span>{data.availability.statusNote}</span> : null}
              {data.availability.statusNote && data.availability.nextChangeAt ? <span> · </span> : null}
              {data.availability.nextChangeAt ? (
                <span>Next change: {new Date(data.availability.nextChangeAt).toLocaleString()}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </OrgCard>
  )
}

