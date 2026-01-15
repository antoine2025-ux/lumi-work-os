"use client"

import * as React from "react"
import Link from "next/link"
import { OrgCard } from "@/components/org/ui/OrgCard"
import { orgTokens } from "@/components/org/ui/tokens"

type Detail = {
  id: string            // personKey
  userId: string | null
  personId: string | null
  name: string | null
  title: string | null
  email: string | null
  phone: string | null
  location: string | null
  avatarUrl: string | null
  availability: string | null
  department: { id: string; name: string } | null
  teams?: Array<{ id: string; name: string }>
  manager: { id: string; name: string } | null
}

function initials(name: string | null) {
  const n = (name || "").trim()
  if (!n) return "?"
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?"
}

function availabilityLabel(a: string | null) {
  if (!a) return "Availability unknown"
  if (a === "AVAILABLE") return "Available"
  if (a === "LIMITED") return "Limited"
  if (a === "UNAVAILABLE") return "Unavailable"
  return a
}

function dotClass(a: string | null) {
  if (a === "AVAILABLE") return "bg-foreground/40"
  if (a === "LIMITED") return "bg-foreground/25"
  if (a === "UNAVAILABLE") return "bg-foreground/15"
  return "bg-foreground/10"
}

function MetaItem(props: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{props.label}</div>
      <div className="mt-1 text-sm font-semibold truncate">{props.value}</div>
    </div>
  )
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {}
}

export function RoleCard(props: { person: Detail }) {
  const p = props.person
  const displayName = p.name?.trim() || "Unnamed person"
  const primaryTeam = p.teams?.[0]?.name || null
  const dept = p.department?.name || null
  const titleLine = p.title || "Role not set"
  const orgLine = primaryTeam || dept || "Team not set"

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
              {p.email && (
                <button
                  onClick={() => {
                    copyToClipboard(p.email!)
                    setMenuOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/30"
                >
                  Copy email
                </button>
              )}
              {p.personId && (
                <button
                  onClick={() => {
                    copyToClipboard(p.personId!)
                    setMenuOpen(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted/30"
                >
                  Copy person ID
                </button>
              )}
              <Link
                href={`/org/people/${p.id}/edit`}
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
        <div className="h-14 w-14 shrink-0 rounded-2xl border flex items-center justify-center text-sm font-semibold">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt={displayName} className="h-full w-full rounded-2xl object-cover" />
          ) : (
            <span>{initials(displayName)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xl font-semibold tracking-tight truncate">{displayName}</div>
              <div className="mt-1 text-sm text-muted-foreground truncate">
                {titleLine} · {orgLine}
              </div>
            </div>

            <div className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${dotClass(p.availability)}`} />
              {availabilityLabel(p.availability)}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {p.personId && (
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{`ID ${p.personId}`}</span>
            )}
            {dept ? <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{dept}</span> : null}
            {primaryTeam ? <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">{primaryTeam}</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <MetaItem label="Email" value={p.email || "—"} />
        <MetaItem label="Manager" value={p.manager?.name || "—"} />
        <MetaItem label="Location" value={p.location || "—"} />
        <MetaItem label="Phone" value={p.phone || "—"} />
      </div>
    </OrgCard>
  )
}

