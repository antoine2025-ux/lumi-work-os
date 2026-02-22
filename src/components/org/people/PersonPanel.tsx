"use client"

import * as React from "react"
import Link from "next/link"
import { OrgCard } from "@/components/org/ui/OrgCard"
import { orgTokens } from "@/components/org/ui/tokens"
import { RoleCard } from "@/components/org/people/RoleCard"

type Detail = {
  id: string // personKey (canonical identifier)
  userId: string | null // Reference to user table (null for error responses)
  personId: string | null // Display ID (null for error responses)
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
  skills?: string[]
  notes: string | null
}

async function fetchPerson(id: string): Promise<Detail> {
  const res = await fetch(`/api/org/people/${id}`, { cache: "no-store" })
  const json = await res.json().catch(() => null)

  // If response is not ok, check if it has a stable shape with id field (from 404 handler)
  // This allows UI to handle "not found" gracefully without crashing
  if (!res.ok) {
    // If response has id field (stable error shape), process it normally
    if (json?.id) {
      // Continue processing - it's a stable error response
    } else {
      // True error - no stable shape
      let msg = `HTTP ${res.status}`
      if (json?.error) {
        if (typeof json.error === "string") {
          msg = json.error
        } else if (json.error?.message && typeof json.error.message === "string") {
          msg = json.error.message
        } else if (json.error && typeof json.error === "object" && "message" in json.error && typeof json.error.message === "string") {
          msg = json.error.message
        }
      }
      throw new Error(msg)
    }
  }

  if (!json || typeof json !== "object") {
    throw new Error("Invalid response format")
  }

  const raw = json as any

  // Normalize payload - prioritize id (personKey) and userId from payload
  // Treat `id` as personKey (canonical identifier)
  const resolvedId = raw.id ?? raw.userId ?? raw.data?.id ?? null
  const resolvedUserId = raw.userId ?? raw.id ?? raw.data?.userId ?? null
  const normalized: Detail = {
    id: resolvedId ?? "", // personKey (canonical identifier)
    userId: resolvedUserId ?? null, // Reference to user table (null for error responses)
    personId: raw.personId ?? (resolvedUserId ? String(resolvedUserId).slice(0, 8).toUpperCase() : null),
    name: raw.name ?? raw.data?.name ?? null,
    title: raw.title ?? raw.role ?? null,
    email: raw.email ?? raw.data?.email ?? null,
    phone: raw.phone ?? null,
    location: raw.location ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    availability: raw.availability ?? null,
    department: raw.department ?? null,
    teams: raw.teams ?? [],
    manager: raw.manager ?? null,
    skills: raw.skills ?? [],
    notes: raw.notes ?? null,
  }

  // Validate required fields: id (personKey) must exist
  if (!normalized.id) {
    const errorMsg = raw.error || "Invalid response format: missing field 'id'"
    const devDebugLink = process.env.NODE_ENV === "development" 
      ? ` Check raw response: /api/dev/org/people-raw/${id}`
      : ""
    throw new Error(`${errorMsg}${devDebugLink}`)
  }

  // If userId is missing (error response with stable shape), allow it but mark personId as null
  if (!normalized.userId) {
    // This is an error response (e.g., 404) with stable shape - allow it through
    normalized.personId = normalized.personId || null
  } else {
    // Normal response - ensure personId is derived from userId
    if (!normalized.personId && normalized.userId) {
      normalized.personId = normalized.userId.slice(0, 8).toUpperCase()
    }
  }

  return normalized
}

function pill(_text: string) {
  return "inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground"
}


export function PersonPanel(props: { personId: string | null }) {
  const [data, setData] = React.useState<Detail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  // Helper to safely extract error message
  const extractErrorMessage = React.useCallback((e: any): string => {
    try {
      if (typeof e === "string") return e
      if (e?.message && typeof e.message === "string") return e.message
      if (e && typeof e === "object") {
        if ("message" in e && typeof e.message === "string") {
          return e.message
        }
        // If it's an error object with code/message, extract message
        if ("code" in e && "message" in e && typeof e.message === "string") {
          return e.message
        }
        // Fallback: try to stringify safely
        try {
          const str = JSON.stringify(e)
          return str.length > 100 ? str.slice(0, 100) + "..." : str
        } catch {
          return "Failed to load person"
        }
      }
      return "Failed to load person"
    } catch {
      return "Failed to load person"
    }
  }, [])

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
        if (!cancelled) {
          setData(d)
          setError(null)
        }
      } catch (e: any) {
        if (!cancelled) {
          const errorMessage = extractErrorMessage(e)
          // Ensure we always set a string, never an object
          setError(typeof errorMessage === "string" ? errorMessage : "Failed to load person")
          setData(null)
        }
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
      <OrgCard title="Select a person" subtitle="Pick someone from the directory to view their profile.">
        <div className="text-sm text-muted-foreground">
          Tip: search by name or email. Use Fix mode to complete missing profiles.
        </div>
      </OrgCard>
    )
  }

  if (loading && !data) {
    return (
      <OrgCard title="Loading…" subtitle="Fetching profile.">
        <div className="text-sm text-muted-foreground">Please wait.</div>
      </OrgCard>
    )
  }

  // Safe fallback if data is missing or invalid (never hard-fail)
  if (!data?.id) {
    return (
      <OrgCard title="Profile unavailable">
        <p className="text-sm text-muted-foreground">
          This profile exists but could not be fully loaded.
        </p>
        {process.env.NODE_ENV === "development" && (
          <div className="mt-3 space-y-2 rounded-lg border border-dashed p-3">
            <div className="text-xs font-semibold text-muted-foreground">Debug info:</div>
            <div className="text-xs font-mono text-muted-foreground break-all">
              <div><strong>Selected personKey:</strong> {props.personId || "(none)"}</div>
              <div className="mt-1"><strong>Endpoint:</strong> /api/org/people/{props.personId || "(none)"}</div>
              {props.personId && (
                <div className="mt-1 space-x-2">
                  <a 
                    href={`/api/dev/org/people-raw/${props.personId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View raw response →
                  </a>
                  <a 
                    href={`/api/dev/org/people-resolve/${props.personId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Test resolution →
                  </a>
                </div>
              )}
              {error && (
                <div className="mt-1"><strong>Error:</strong> {typeof error === "string" ? error : JSON.stringify(error)}</div>
              )}
            </div>
          </div>
        )}
      </OrgCard>
    )
  }

  return (
    <div className="space-y-4">
      <RoleCard person={data} />

      {/* Skills */}
      <OrgCard
        title="Skills"
        actions={
          <Link className={orgTokens.buttonSecondary} href={`/org/people/${data.userId || data.id}/edit?focus=skills`}>
            Edit
          </Link>
        }
      >
        {(data.skills?.length ?? 0) > 0 ? (
          <div className="flex flex-wrap gap-2">
            {data.skills!.map((s) => (
              <span key={s} className={pill(s)}>{s}</span>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">No skills yet.</div>
            <Link className={orgTokens.buttonSecondary} href={`/org/people/${data.userId || data.id}/edit?focus=skills`}>
              Add skills
            </Link>
          </div>
        )}
      </OrgCard>

      {/* Notes */}
      <OrgCard
        title="Notes"
        actions={
          <Link className={orgTokens.buttonSecondary} href={`/org/people/${data.userId || data.id}/edit?focus=notes`}>
            Edit
          </Link>
        }
      >
        {data.notes ? (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{data.notes}</div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">No notes.</div>
            <Link className={orgTokens.buttonSecondary} href={`/org/people/${data.userId || data.id}/edit?focus=notes`}>
              Add notes
            </Link>
          </div>
        )}
      </OrgCard>
    </div>
  )
}
