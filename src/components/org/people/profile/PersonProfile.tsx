"use client"

import * as React from "react"
import { ProfileHero } from "./ProfileHero"
import { ContextStrip } from "./ContextStrip"
import { WorkCapabilities } from "./WorkCapabilities"

// Type definitions matching the Person Profile contract
type PersonIdentity = {
  personKey: string
  userId: string
  displayName: string
  preferredName?: string | null
  avatarUrl?: string | null
  email?: string | null
  personId: string
  pronouns?: string | null
  location?: {
    city?: string | null
    country?: string | null
    timezone?: string | null
    localTime?: string | null
  } | null
}

type OrgPlacement = {
  department?: { id: string; name: string } | null
  primaryTeam?: { id: string; name: string } | null
  teams: Array<{ id: string; name: string }>
  role?: {
    id?: string | null
    title: string | null
    level?: string | null
    jobFamily?: string | null
  } | null
}

type Relationships = {
  manager?: { personKey: string; displayName: string; title?: string | null; avatarUrl?: string | null } | null
  directReports: Array<{ personKey: string; displayName: string; title?: string | null; avatarUrl?: string | null }>
  peers?: Array<{ personKey: string; displayName: string; title?: string | null; avatarUrl?: string | null }> | null
}

type Availability = {
  status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE" | "OOO" | "UNKNOWN"
  statusSource?: "MANUAL" | "CALENDAR" | "SYSTEM" | "UNKNOWN" | null
  statusNote?: string | null
  nextChangeAt?: string | null
  lastUpdatedAt?: string | null
}

type Capacity = {
  horizonDays: number
  effectiveFte?: number | null
  allocation?: Array<{ label: string; pct: number }> | null
  loadBand?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
  confidence?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
} | null

type Skills = {
  items: Array<{
    key: string
    label: string
    level?: "BASIC" | "WORKING" | "STRONG" | "EXPERT" | null
    evidence?: string | null
    lastUsedAt?: string | null
  }>
  missing?: boolean
}

type Ownership = {
  items: Array<{
    entityType: "TEAM" | "DOMAIN" | "SYSTEM" | "SERVICE" | "PROCESS"
    entityId: string
    entityName: string
    role: "PRIMARY" | "SECONDARY" | "BACKUP" | "OBSERVER"
    coverageRisk?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN" | null
  }>
  primaryCount: number
} | null

type Health = {
  flags: Array<{
    key: string
    label: string
    severity: "INFO" | "WARN" | "RISK"
    description?: string | null
  }>
  score?: number | null
} | null

type Notes = {
  summary?: string | null
  lastUpdatedAt?: string | null
} | null

// Expected API response shape (contract-compliant)
type PersonProfileData = {
  person: PersonIdentity
  orgPlacement: OrgPlacement
  relationships: Relationships
  availability: Availability
  capacity: Capacity
  skills: Skills
  ownership: Ownership
  health: Health
  notes: Notes
}

// Temporary adapter: current API might not return full contract shape yet
// This allows graceful degradation
// Loose shape for raw API data that may not match the contract
type RawProfileData = Record<string, unknown> & {
  person?: unknown
  orgPlacement?: unknown
  relationships?: unknown
}

function adaptData(data: RawProfileData): PersonProfileData {
  // If data already matches contract, return as-is
  if (data.person && data.orgPlacement && data.relationships) {
    return data as unknown as PersonProfileData
  }

  // Use a loose accessor for nested properties
  const d = data as Record<string, Record<string, unknown> | unknown[] | string | null | undefined>
  const loc = d.location as Record<string, string | null> | null | undefined
  const mgr = d.manager as Record<string, string> | null | undefined
  const avail = d.availability as Record<string, string | null> | string | null | undefined
  const rawSkills = d.skills as Record<string, unknown> | string[] | null | undefined
  const rawTeams = d.teams as Array<{ id: string; name: string }> | null | undefined
  const rawId = d.id as string | undefined
  const rawNotes = d.notes as string | null | undefined

  // Otherwise, adapt from current API shape
  return {
    person: {
      personKey: rawId || (d.personKey as string) || "",
      userId: (d.userId as string) || "",
      displayName: (d.name as string) || "Unnamed",
      email: (d.email as string) || null,
      personId: (d.personId as string) || rawId?.slice(0, 8).toUpperCase() || "UNKNOWN",
      avatarUrl: (d.avatarUrl as string) || null,
      location: loc
        ? {
            city: loc.city || null,
            country: loc.country || null,
            timezone: loc.timezone || null,
            localTime: loc.localTime || null,
          }
        : null,
    },
    orgPlacement: {
      department: (d.department as { id: string; name: string }) || null,
      primaryTeam: rawTeams?.[0] || null,
      teams: rawTeams || [],
      role: d.title ? { title: d.title as string, id: null } : null,
    },
    relationships: {
      manager: mgr ? {
        personKey: mgr.id,
        displayName: mgr.name,
        title: null,
        avatarUrl: null,
      } : null,
      directReports: [],
      peers: null,
    },
    availability: {
      status: (typeof avail === 'object' && avail !== null ? avail.status || "UNKNOWN" : avail || "UNKNOWN") as Availability["status"],
      statusSource: ((typeof avail === 'object' && avail !== null ? avail.statusSource : null) || "UNKNOWN") as "UNKNOWN" | "MANUAL" | "CALENDAR" | "SYSTEM",
      statusNote: (typeof avail === 'object' && avail !== null ? avail.statusNote : null) || null,
      nextChangeAt: (typeof avail === 'object' && avail !== null ? avail.nextChangeAt : null) || null,
      lastUpdatedAt: (typeof avail === 'object' && avail !== null ? avail.lastUpdatedAt : null) || null,
    },
    capacity: null,
    skills: {
      items: rawSkills && typeof rawSkills === 'object' && !Array.isArray(rawSkills) && Array.isArray((rawSkills as Record<string, unknown>).items)
        ? (rawSkills as Record<string, unknown>).items as Skills['items']
        : Array.isArray(rawSkills)
        ? (rawSkills as string[]).map((s: string) => ({ key: s.toLowerCase().replace(/\s+/g, "-"), label: s }))
        : [],
      missing: !rawSkills || (typeof rawSkills === 'object' && !Array.isArray(rawSkills) && Array.isArray((rawSkills as Record<string, unknown>).items) ? ((rawSkills as Record<string, unknown>).items as unknown[]).length === 0 : Array.isArray(rawSkills) ? rawSkills.length === 0 : true),
    },
    ownership: null,
    health: null,
    notes: rawNotes ? { summary: rawNotes, lastUpdatedAt: null } : null,
  }
}

export function PersonProfile(props: { data: RawProfileData }) {
  const profile = adaptData(props.data)

  return (
    <div className="space-y-4">
      {/* A) Hero Section */}
      <ProfileHero
        person={profile.person}
        orgPlacement={profile.orgPlacement}
        availability={profile.availability}
      />

      {/* B) Context Strip */}
      <ContextStrip
        personKey={profile.person.personKey}
        manager={profile.relationships.manager}
        directReports={profile.relationships.directReports}
        ownerships={profile.ownership?.items?.map(item => ({
          entityType: item.entityType,
          entityName: item.entityName,
          role: item.role,
        })) || null}
        capacity={profile.capacity}
      />

      {/* C) Work & Capabilities */}
      <WorkCapabilities
        personKey={profile.person.personKey}
        skills={profile.skills}
        domains={null} // TODO [BACKLOG]: Wire up decision domains from OrgDecisionDomain
        systems={null} // TODO [BACKLOG]: Wire up systems from responsibility profiles
      />

      {/* D) Optional Metadata (collapsed by default) */}
      {profile.notes?.summary && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
          <h3 className="text-sm font-semibold mb-3">Notes</h3>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.notes.summary}</div>
        </div>
      )}
    </div>
  )
}

