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
function adaptData(data: any): PersonProfileData {
  // If data already matches contract, return as-is
  if (data.person && data.orgPlacement && data.relationships) {
    return data as PersonProfileData
  }

  // Otherwise, adapt from current API shape
  return {
    person: {
      personKey: data.id || data.personKey || "",
      userId: data.userId || "",
      displayName: data.name || "Unnamed",
      email: data.email || null,
      personId: data.personId || data.id?.slice(0, 8).toUpperCase() || "UNKNOWN",
      avatarUrl: data.avatarUrl || null,
      location: data.location
        ? {
            city: data.location.city || null,
            country: data.location.country || null,
            timezone: data.location.timezone || null,
            localTime: data.location.localTime || null,
          }
        : null,
    },
    orgPlacement: {
      department: data.department || null,
      primaryTeam: data.teams?.[0] || null,
      teams: data.teams || [],
      role: data.title ? { title: data.title, id: null } : null,
    },
    relationships: {
      manager: data.manager ? {
        personKey: data.manager.id,
        displayName: data.manager.name,
        title: null,
        avatarUrl: null,
      } : null,
      directReports: [],
      peers: null,
    },
    availability: {
      status: (data.availability?.status || data.availability || "UNKNOWN") as Availability["status"],
      statusSource: data.availability?.statusSource || "UNKNOWN",
      statusNote: data.availability?.statusNote || null,
      nextChangeAt: data.availability?.nextChangeAt || null,
      lastUpdatedAt: data.availability?.lastUpdatedAt || null,
    },
    capacity: null,
    skills: {
      items: Array.isArray(data.skills?.items)
        ? data.skills.items
        : Array.isArray(data.skills)
        ? data.skills.map((s: string) => ({ key: s.toLowerCase().replace(/\s+/g, "-"), label: s }))
        : [],
      missing: !data.skills || (Array.isArray(data.skills?.items) ? data.skills.items.length === 0 : Array.isArray(data.skills) ? data.skills.length === 0 : true),
    },
    ownership: null,
    health: null,
    notes: data.notes ? { summary: data.notes, lastUpdatedAt: null } : null,
  }
}

export function PersonProfile(props: { data: any }) {
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
        domains={null} // TODO: wire up domains when available
        systems={null} // TODO: wire up systems when available
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

