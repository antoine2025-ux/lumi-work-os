"use client"

import * as React from "react"
import Link from "next/link"
import { AvailabilityStatus, availabilityLabel, availabilityDotClass } from "./availability"

type ProfileHeroProps = {
  person: {
    personKey: string
    userId: string | null
    displayName: string
    avatarUrl?: string | null
    email?: string | null
    personId: string
    location?: { city?: string | null; country?: string | null; timezone?: string | null } | null
  }
  orgPlacement: {
    department?: { id: string; name: string } | null
    primaryTeam?: { id: string; name: string } | null
    teams: Array<{ id: string; name: string }>
    role?: { title: string | null } | null
  }
  availability: {
    status: AvailabilityStatus
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

export function ProfileHero(props: ProfileHeroProps) {
  const { person, orgPlacement, availability } = props
  const name = person.displayName || "Unnamed person"
  const title = orgPlacement.role?.title || null
  const dept = orgPlacement.department?.name || null
  const teams = orgPlacement.teams || []
  const teamNames = teams.map((t) => t.name).join(", ")
  // Format: "Team · Department" or just "Team" or just "Department"
  const orgLine = teamNames && dept
    ? `${teamNames} · ${dept}`
    : teamNames || dept || null

  const locLine = person.location
    ? [person.location.city, person.location.country].filter(Boolean).join(", ") || null
    : null
  const tzLine = person.location?.timezone || null
  const contextLine = [locLine, tzLine].filter(Boolean).join(" · ") || null

  const status: AvailabilityStatus = availability?.status || "UNKNOWN"

  const [menuOpen, setMenuOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [emailCopied, setEmailCopied] = React.useState(false)

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
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex flex-col md:flex-row items-center md:items-center gap-10">
        {/* Hero avatar - Bold, Slack-inspired identity anchor */}
        <div className="size-[200px] md:size-[260px] shrink-0 rounded-3xl border border-white/10 flex items-center justify-center text-6xl md:text-7xl font-semibold bg-white/[0.05] text-foreground">
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt="" className="h-full w-full rounded-3xl object-cover" />
          ) : (
            <span>{initials(name)}</span>
          )}
        </div>

        {/* Identity block */}
        <div className="min-w-0 flex-1 w-full md:w-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {/* Full Name (H1) */}
              <h1 className="text-3xl font-semibold tracking-tight text-foreground truncate">{name}</h1>

              {/* Primary Role Title (H2, muted) */}
              {title ? (
                <h2 className="mt-2 text-lg text-foreground/60 truncate">{title}</h2>
              ) : (
                <h2 className="mt-2 text-lg text-foreground/60">—</h2>
              )}

              {/* Department · Team(s) */}
              {orgLine ? (
                <div className="mt-1 text-sm text-foreground/50 truncate">{orgLine}</div>
              ) : (
                <div className="mt-1 text-sm text-foreground/50">—</div>
              )}

              {/* Location · Timezone */}
              {contextLine ? (
                <div className="mt-2 text-xs text-foreground/50">{contextLine}</div>
              ) : null}

              {/* Work email (subtle, copy on hover) */}
              {person.email ? (
                <div className="mt-3">
                  <button
                    onClick={() => {
                      copy(person.email!)
                      setEmailCopied(true)
                      setTimeout(() => setEmailCopied(false), 2000)
                    }}
                    className="text-xs text-foreground/60 hover:text-foreground/80 transition-colors"
                    title="Click to copy email"
                  >
                    {person.email}
                    {emailCopied && <span className="ml-2 text-xs">✓ Copied</span>}
                  </button>
                </div>
              ) : null}
            </div>

            {/* Availability badge + Overflow menu (top-aligned with avatar) */}
            <div className="shrink-0 flex items-start gap-2">
              {/* Availability badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm">
                <span className={`h-2 w-2 rounded-full ${availabilityDotClass(status)}`} />
                <span className="text-foreground/70">{availabilityLabel(status)}</span>
              </div>

              {/* Overflow menu */}
              <div className="relative" ref={menuRef}>
                <button
                  className="h-9 w-9 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/[0.08] inline-flex items-center justify-center text-sm text-foreground/70 transition-colors"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Profile actions"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-white/10 bg-card shadow-lg overflow-hidden">
                    <Link
                      href={`/org/people/${person.personKey}/edit`}
                      className="block px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Edit profile
                    </Link>
                    {person.email ? (
                      <button
                        onClick={() => {
                          copy(person.email!)
                          setMenuOpen(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
                      >
                        Copy email
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        copy(person.personId)
                        setMenuOpen(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
                    >
                      Copy person ID
                    </button>
                    <div className="border-t border-white/10" />
                    <Link
                      href={`/org/chart?person=${person.personKey}`}
                      className="block px-4 py-2.5 text-sm text-foreground/80 hover:bg-white/10 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Open in Org chart
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

