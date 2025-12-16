# Org → ContextObject Mapping

Loopwell Org ↔ Loopbrain Context Layer  
Version: v1 (L2 – Step 21)

## Purpose

This document defines how Org entities in the main Loopwell app map to the
Loopbrain ContextObject standard used by the Org Intelligence engine:

- Departments
- Teams
- Positions
- People (Users)

The goal is to keep this mapping **stable, explicit, and AI-friendly**, so the
Loopbrain layer can generate accurate, context-aware insights.

---

## Canonical ContextObject schema

Loopbrain expects ContextObjects in this canonical form:

```ts
type ContextObject = {
  id: string;
  type: "org" | "department" | "team" | "role" | "person" | "project" | "task" | "page" | "note";
  title: string;
  summary: string;
  tags: string[];
  relations: {
    type: string;
    sourceId: string;
    targetId: string;
    label: string;
  }[];
  owner: string | null; // personId or null
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  updatedAt: string; // ISO8601
};
```

This document defines **how to populate these fields** from Prisma models:

- `OrgDepartment`
- `OrgTeam`
- `OrgPosition`
- `User` (as Org Person in context of a workspace)

---

## Entity → ContextObject mapping

### 1) OrgDepartment → ContextObject

**Source model:** `OrgDepartment`  
**Context type:** `department`  
**ID format:** `department:{id}`

**Fields:**

- `id` → `"department:" + orgDepartment.id`
- `type` → `"department"`
- `title` → `orgDepartment.name`
- `summary` → short description:
  - First line: department name
  - Second line: optional description or "Department in workspace org structure."
- `tags` (examples):
  - `"org:department"`
  - `"department:" + slugifiedName`
  - `"workspace:" + workspaceId`
  - `"teams:" + <teamCount>`
- `relations` (examples):
  - `has_team` from department to its teams:
    - `{ type: "has_team", sourceId: "department:{id}", targetId: "team:{teamId}", label: "contains team" }`
- `owner` → `null` (owner is not a single person)
- `status`:
  - `"ACTIVE"` if `isActive === true`
  - `"INACTIVE"` otherwise
- `updatedAt` → `orgDepartment.updatedAt.toISOString()`

---

### 2) OrgTeam → ContextObject

**Source model:** `OrgTeam`  
**Context type:** `team`  
**ID format:** `team:{id}`

**Fields:**

- `id` → `"team:" + orgTeam.id`
- `type` → `"team"`
- `title` → `orgTeam.name`
- `summary`:
  - 1–3 lines describing team, department, and purpose:
    - `"{teamName} in {departmentName} department."`
- `tags` (examples):
  - `"org:team"`
  - `"team:" + slugifiedName`
  - `"departmentId:" + departmentId`
  - `"workspace:" + workspaceId`
- `relations` (examples):
  - `member_of_department`:
    - `{ type: "member_of_department", sourceId: "team:{id}", targetId: "department:{departmentId}", label: "belongs to department" }`
  - `has_person` for each active position with assigned user:
    - `{ type: "has_person", sourceId: "team:{id}", targetId: "person:{userId}", label: "team member" }`
- `owner` → optional team lead:
  - For v1: `null` (we can upgrade later when we designate leads)
- `status`:
  - `"ACTIVE"` if `isActive === true`
  - `"INACTIVE"` otherwise
- `updatedAt` → `orgTeam.updatedAt.toISOString()`

---

### 3) OrgPosition → ContextObject (role)

**Source model:** `OrgPosition`  
**Context type:** `role`  
**ID format:** `role:{id}`

**Fields:**

- `id` → `"role:" + orgPosition.id`
- `type` → `"role"`
- `title` → `orgPosition.title`
- `summary`:
  - 2–4 lines:
    - role name, level, team, department, brief responsibility summary
- `tags` (examples):
  - `"org:role"`
  - `"role:" + slugifiedTitle`
  - `"level:L" + level` (if present)
  - `"teamId:" + teamId` (if present)
- `relations` (examples):
  - `member_of_team`:
    - `{ type: "member_of_team", sourceId: "role:{id}", targetId: "team:{teamId}", label: "role in team" }`
  - `responsible_for` (future: projects/areas):
    - left as a placeholder in v1
  - If assigned `userId`:
    - `{ type: "has_person", sourceId: "role:{id}", targetId: "person:{userId}", label: "current holder" }`
- `owner`:
  - `person:{userId}` if position is filled
  - `null` otherwise
- `status`:
  - `"ACTIVE"` if `isActive === true`
  - `"INACTIVE"` otherwise
- `updatedAt` → `orgPosition.updatedAt.toISOString()`

---

### 4) User (workspace member) → ContextObject (person)

**Source model:** `User` + `OrgPosition` (and team/department via team)  
**Context type:** `person`  
**ID format:** `person:{userId}`

**Fields:**

- `id` → `"person:" + user.id`
- `type` → `"person"`
- `title` → `user.name ?? user.email`
- `summary`:
  - role title, team, department, high-level responsibilities (if available)
- `tags` (examples):
  - `"org:person"`
  - `"email:" + user.email`
  - `"teamId:" + teamId` (if assigned)
  - `"departmentId:" + departmentId` (if assigned)
- `relations` (examples):
  - `member_of_team`:
    - from person to team
  - `member_of_department`:
    - from person to department
  - `has_role`:
    - from person to their `role:{positionId}`
- `owner` → `person:{userId}` (self)
- `status`:
  - `"ACTIVE"` (for now; later we can wire to employee status if needed)
- `updatedAt` → `user.updatedAt.toISOString()`

---

## Relationship rules (v1)

We will use the following canonical relation types:

- `member_of_department`
- `member_of_team`
- `has_person`
- `has_team`
- `has_role`
- `responsible_for` (future)
- `owns` (future)
- `reports_to` / `manages` (future when we add manager chains)

The graph must be **directional** and **acyclic** for reporting lines (when added).

---

## Implementation plan (next milestones)

- L3: Implement mappers in a dedicated module, e.g. `lib/loopbrain/orgContextMapper.ts`.
- L3: Add functions like:
  - `mapDepartmentToContextObject(orgDepartment, stats)`
  - `mapTeamToContextObject(orgTeam, members)`
  - `mapPositionToContextObject(orgPosition)`
  - `mapUserToContextObject(user, primaryPosition)`
- L3+: Hook these into:
  - Org ContextItem upserts (ContextItem / ContextEmbedding / ContextSummary).
  - Org-aware Loopbrain Q&A entrypoints.

This document is the **single source of truth** for Org → ContextObject mapping.
Any divergence in code should be reconciled back to this spec.

---

## Implementation location (L3)

Org → ContextObject mapping is implemented in:

- `src/lib/loopbrain/contextTypes.ts`
- `src/lib/loopbrain/orgIds.ts`
- `src/lib/loopbrain/orgContextMapper.ts`
- `src/lib/loopbrain/orgContextBuilder.ts`

These modules must follow this document as the canonical specification.

---

## Dev preview

To inspect Org → ContextObject mapping in JSON, use:

- `GET /api/dev/org-context-preview` (non-production only)

This endpoint calls:

- `buildOrgContextBundleForCurrentWorkspace()` from `src/lib/loopbrain/orgContextBuilder.ts`

Returns a JSON payload with:

- `ok`: boolean indicating success
- `bundle`: object containing arrays of ContextObjects:
  - `departments`: ContextObject[]
  - `teams`: ContextObject[]
  - `positions`: ContextObject[]
  - `people`: ContextObject[]
- `meta`: metadata including `generatedAt` timestamp

