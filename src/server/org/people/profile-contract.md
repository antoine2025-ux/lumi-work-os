# Person Profile — Canonical Data Contract

This document defines the canonical Person Profile data contract for the Org People system. It ensures consistency between API responses, UI presentation, and Loopbrain queries.

---

## API Contract: GET /api/org/people/{personKey}

The endpoint returns a stable JSON object with these top-level keys:

```typescript
{
  // See sections below for detailed field definitions
  person: PersonIdentity
  orgPlacement: OrgPlacement
  relationships: Relationships
  availability: Availability
  capacity: Capacity | null
  skills: Skills
  ownership: Ownership | null
  health: Health | null
  notes: Notes | null
}
```

---

## 1) Identity (required for every person)

Answers: **"Who is this?"** and enables reliable references.

```typescript
person: {
  personKey: string                 // stable key used in Org UI selection (can be membership id)
  userId: string                    // underlying User id (auth + joins)
  displayName: string               // "Avery Rodriguez"
  preferredName?: string | null     // optional, if you support it later
  avatarUrl?: string | null
  email?: string | null
  personId: string                  // short human-friendly ID, e.g. "CMIX6CZ1"
  pronouns?: string | null
  location?: {
    city?: string | null
    country?: string | null
    timezone?: string | null        // critical for planning/availability
    localTime?: string | null       // computed in UI from timezone
  } | null
}
```

**Rules:**
- `personKey`, `userId`, `displayName`, `personId` MUST always exist (fallbacks allowed).
- `email` optional but usually present.
- `avatarUrl` optional; if missing use initials.

---

## 2) Org Placement

Answers: **"Where do they sit?"** Makes the org legible and supports navigation.

```typescript
orgPlacement: {
  department?: { id: string; name: string } | null
  primaryTeam?: { id: string; name: string } | null
  teams: Array<{ id: string; name: string }>      // can be 0..n
  role?: {
    id?: string | null                 // if roles table exists later
    title: string | null               // "Senior Engineer", "FinCrime QA Team Lead"
    level?: string | null              // optional later
    jobFamily?: string | null          // optional later
  } | null
}
```

**Rules:**
- `primaryTeam` is derived: if `teams[0]` exists, that's primary (until you have explicit `primaryTeamId`).
- `role.title` is the single most important line after name. If missing: `null`.

---

## 3) Reporting & Relationships

Answers: **"Who manages who?"** Supports "ownership coverage", "management load", and "safe to execute change" later.

```typescript
relationships: {
  manager?: { 
    personKey: string
    displayName: string
    title?: string | null
    avatarUrl?: string | null
  } | null
  directReports: Array<{ 
    personKey: string
    displayName: string
    title?: string | null
    avatarUrl?: string | null
  }>
  peers?: Array<{ 
    personKey: string
    displayName: string
    title?: string | null
    avatarUrl?: string | null
  }> | null
  orgChartRef?: {
    nodeId?: string | null             // if you store org graph nodes later
    depth?: number | null
  } | null
}
```

**Rules:**
- `manager` + `directReports` are the minimal graph.
- `peers` is optional (computed, can omit to stay lean).

---

## 4) Availability & Capacity

Answers: **"Who is available now/soon?"** and **"Who has capacity?"**

This is a critical gap. Contract must exist even if values are null.

```typescript
availability: {
  status: "AVAILABLE" | "LIMITED" | "UNAVAILABLE" | "OOO" | "UNKNOWN"
  statusSource?: "MANUAL" | "CALENDAR" | "SYSTEM" | "UNKNOWN" | null
  statusNote?: string | null                 // e.g. "Heads down", "OOO"
  nextChangeAt?: string | null               // ISO datetime (who is available soon)
  lastUpdatedAt?: string | null
}

capacity: {
  horizonDays: 14
  effectiveFte?: number | null               // 0..1 (or >1 if you support)
  allocation?: Array<{ label: string; pct: number }> | null    // optional later
  loadBand?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
  confidence?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"
} | null
```

**Rules:**
- `availability.status` must always exist (default `UNKNOWN`).
- `capacity` can be `null` until you expose the existing DB fields, but the contract should be stable.

---

## 5) Skills & Capabilities

Answers: **"Who can do X?"** Core Loopbrain fuel.

```typescript
skills: {
  items: Array<{
    key: string                      // stable identifier, e.g. "react", "aml-investigations"
    label: string                    // human label "React", "AML Investigations"
    level?: "BASIC" | "WORKING" | "STRONG" | "EXPERT" | null
    evidence?: string | null         // link/text note (optional)
    lastUsedAt?: string | null       // optional later
  }>
  missing?: boolean                  // computed: true if items empty
}
```

**Rules:**
- Skills should be tags, not paragraphs.
- `level`/`evidence` optional, but contract supports upgrade.

---

## 6) Ownership & Coverage

Answers: **"Who owns Y?"** and **"What is unowned?"** Connects to Ownership tab but must be visible at person-level.

```typescript
ownership: {
  items: Array<{
    entityType: "TEAM" | "DOMAIN" | "SYSTEM" | "SERVICE" | "PROCESS"
    entityId: string
    entityName: string
    role: "PRIMARY" | "SECONDARY" | "BACKUP" | "OBSERVER"
    coverageRisk?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN" | null
  }>
  primaryCount: number
} | null
```

**Rules:**
- `ownership` can be `null` if not implemented, but once present it should be stable.

---

## 7) Health Signals

Answers: **"Is org safe to execute change?"** Should be minimal and factual, not vibes.

```typescript
health: {
  flags: Array<{
    key: string                       // "stale-availability", "missing-manager"
    label: string
    severity: "INFO" | "WARN" | "RISK"
    description?: string | null
  }>
  score?: number | null               // 0..100 optional
} | null
```

**Rules:**
- This is computed. Keep it small and explainable.

---

## 8) Notes

Human context, last priority.

```typescript
notes: {
  summary?: string | null             // short, factual
  lastUpdatedAt?: string | null
} | null
```

**Rules:**
- Notes exist but should never become the primary source of truth.

---

# UI Presentation Contract (Slack-style)

The UI MUST render in this order (identity-first):

## 1) Header: Identity

- Avatar, Name, Role Title (single line)
- Team · Department
- Person ID (copy)
- Availability badge (right)
- Overflow menu (Copy email, Copy ID, Edit profile, Open org chart)

## 2) Status & Context

- Availability details: status note, next change, last updated
- Local time, location

## 3) Org Context (People)

- Manager card
- Direct reports (count + list)
- "Open in Org chart" CTA

## 4) Skills

- Skill pills (top 8)
- "View all" if more
- Empty state: "No skills yet" + "Add skills" secondary CTA

## 5) Ownership

- Primary owned entities (top 5)
- Link: "View all ownership"

## 6) Health

- Small flags list (max 3)
- Link: "View details"

## 7) Notes (collapsed by default)

- Show only if present, otherwise hidden behind "Add note"

---

# Edit-by-Exception Rules

Only these are editable from Person Profile (via "Edit profile" page, not inline):

- `role.title`
- `department`
- `teams` (including primary)
- `availability.status` + `statusNote` + `nextChangeAt` (manual override)
- `skills.items`
- `notes.summary`

Everything else is computed or sourced:
- Reporting lines ideally computed from org graph
- Capacity computed
- Ownership comes from ownership system, not typed per-person unless absolutely necessary

---

# Loopbrain Query Mapping

From this contract, Loopbrain can answer:

- **Who can do X?** → `skills.items` (+ `orgPlacement` filters)
- **Who owns Y?** → `ownership.items`
- **Who is available now?** → `availability.status`
- **Who is available soon?** → `availability.nextChangeAt`
- **Who has capacity?** → `capacity.effectiveFte` / `loadBand`
- **Is org safe?** → `health.flags` + missing-manager + stale-availability
- **Where are gaps?** → aggregate missing skills/capacity/ownership across people

