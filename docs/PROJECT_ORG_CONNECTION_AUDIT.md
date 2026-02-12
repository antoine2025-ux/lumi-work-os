# Project-Org Connection Audit

**Generated:** 2026-02-10
**Branch:** `integration/merge-stabilized`
**Scope:** Architectural discovery — how Projects connect (or should connect) to Org People

---

## Table of Contents

1. [Phase 1: Project-Person Current State](#phase-1-project-person-current-state)
2. [Phase 2: Org Person Identity](#phase-2-org-person-identity)
3. [Phase 3: Cross-Feature Patterns](#phase-3-cross-feature-patterns)
4. [Phase 4: Loopbrain Context](#phase-4-loopbrain-context)
5. [Phase 5: Events & Data Flow](#phase-5-events--data-flow)
6. [Integration Points Map](#integration-points-map)
7. [Loopbrain Impact Assessment](#loopbrain-impact-assessment)
8. [Risk Assessment](#risk-assessment)

---

## Phase 1: Project-Person Current State

### Summary

Projects reference people exclusively via `userId` (NextAuth User.id). There are three join tables — `ProjectMember`, `ProjectAssignee`, `ProjectWatcher` — all keyed by `userId`, **never** by `orgPositionId` or `personId`. The Project model also has `ownerId` (userId FK) and `createdById` (userId FK). An optional `teamId` FK bridges to `OrgTeam`, but this is the only org connection on the Project model itself.

### Code Evidence

**Project Model** (`prisma/schema.prisma`):
```
Project {
  ownerId       String    → User.id (FK)
  createdById   String    → User.id (FK)
  teamId        String?   → OrgTeam.id (FK, onDelete: SetNull)
  orgId         String?   → legacy field, not consistently used
  members       ProjectMember[]
  assignees     ProjectAssignee[]
  watchers      ProjectWatcher[]
}
```

**ProjectMember** (`prisma/schema.prisma`):
```
ProjectMember {
  userId      String    → User.id (FK)
  projectId   String    → Project.id (FK)
  role        String    @default("MEMBER")
  // NO orgPositionId, NO personId
}
```

**ProjectAssignee** (`prisma/schema.prisma`):
```
ProjectAssignee {
  userId      String    → User.id (FK)
  projectId   String    → Project.id (FK)
  role        String    @default("MEMBER")
  // NO orgPositionId, NO personId
}
```

**ProjectAccountability** (`prisma/schema.prisma`):
```
ProjectAccountability {
  ownerPersonId      String   // plain string, NO FK
  decisionPersonId   String   // plain string, NO FK
  escalationPersonId String   // plain string, NO FK
}
```

**Routes:**
- `src/app/api/projects/route.ts` — POST creates project with `ownerId`, optional `teamId`, fire-and-forget `upsertProjectContext(project.id)`
- `src/app/api/projects/[projectId]/route.ts` — GET includes `orgTeam: { select: { id, name } }`
- `src/app/api/projects/[projectId]/assignees/route.ts` — GET returns eligible assignees from workspace members

### Relationship Diagram

```
┌──────────────┐         userId FK          ┌──────────────┐
│   Project     │◄──────────────────────────│ProjectMember  │
│               │                           │  userId ──────┼──► User
│  ownerId ─────┼──► User                  └──────────────┘
│  createdById──┼──► User                  ┌──────────────┐
│  teamId ──────┼──► OrgTeam (optional)    │ProjectAssignee│
│  orgId ───────┼──► ??? (legacy, no FK)   │  userId ──────┼──► User
│               │                           └──────────────┘
│               │                           ┌──────────────┐
│               │◄──────────────────────────│ProjectWatcher │
│               │                           │  userId ──────┼──► User
│               │                           └──────────────┘
│               │                           ┌───────────────────┐
│               │◄──────────────────────────│ProjectAccountability│
│               │                           │  ownerPersonId     │ (no FK)
│               │                           │  decisionPersonId  │ (no FK)
│               │                           │  escalationPersonId│ (no FK)
└──────────────┘                           └───────────────────┘
```

### Gaps Identified

1. **No org-level person references** — All project-person joins use `userId`, not `orgPositionId` or a unified person identifier
2. **ProjectAccountability has no FKs** — `ownerPersonId`, `decisionPersonId`, `escalationPersonId` are plain strings with no referential integrity
3. **No project creation → org record creation** — Creating a project does not create any org records
4. **`orgId` field on Project is legacy** — Not consistently used, no clear migration path
5. **No project membership → capacity binding** — Assigning someone to a project does not create an allocation record

### Existing Patterns

- `userId` is the universal person identifier in project-related joins
- `teamId` on Project provides a weak bridge to org structure
- Fire-and-forget `upsertProjectContext()` is the only Loopbrain integration point

---

## Phase 2: Org Person Identity

### Summary

In the org model, a "Person" is the combination of a `User` + `OrgPosition`. The `OrgPosition` model holds org-specific attributes (title, team, department, manager hierarchy). The canonical person DTO is `OrgPersonDTO` which flattens this into `{ id, fullName, email, title, department, team, manager, directReports, availabilityStatus }`. Person lookup is done via `prisma.orgPosition.findMany({ where: { workspaceId, isActive: true, userId: { not: null } } })`.

### Code Evidence

**OrgPosition Model** (`prisma/schema.prisma`):
```
OrgPosition {
  id            String    @id @default(uuid())
  workspaceId   String
  userId        String?   → User.id
  title         String?
  teamId        String?   → OrgTeam.id
  departmentId  String?   → OrgDepartment.id
  managerId     String?   → OrgPosition.id (self-reference)
  isActive      Boolean   @default(true)
}
```

**OrgPersonDTO** (`src/server/org/dto.ts`):
```typescript
interface OrgPersonDTO {
  id: string                    // OrgPosition.id
  fullName: string              // User.name
  email: string                 // User.email
  title: string | null          // OrgPosition.title
  department: string | null     // OrgDepartment.name
  team: string | null           // OrgTeam.name
  manager: { id, name } | null  // Manager OrgPosition
  directReports: { id, name }[] // Reports
  availabilityStatus: string
  availabilityUpdatedAt: Date | null
  availabilityStale: boolean
}
```

**Person Lookup** (`src/lib/org/data.server.ts`):
```typescript
const positions = await prisma.orgPosition.findMany({
  where: { workspaceId, isActive: true, userId: { not: null } },
  include: { user: true, team: true, department: true }
})
```

### Relationship Diagram

```
┌──────────────┐         userId          ┌──────────────┐
│    User       │◄──────────────────────│  OrgPosition   │
│  id           │                       │  title          │
│  name         │                       │  teamId ────────┼──► OrgTeam
│  email        │                       │  departmentId ──┼──► OrgDepartment
└──────────────┘                       │  managerId ─────┼──► OrgPosition (self)
                                        │  isActive       │
                                        └────────────────┘
                                                │
                                        OrgPersonDTO (flattened)
                                        ┌────────────────┐
                                        │ id (positionId) │
                                        │ fullName        │
                                        │ email           │
                                        │ title           │
                                        │ department      │
                                        │ team            │
                                        │ manager         │
                                        │ directReports   │
                                        │ availability    │
                                        └────────────────┘
```

### Gaps Identified

1. **Dual identity problem** — Projects use `userId`, org uses `OrgPosition.id` as person identifier. No canonical bridge
2. **User can have multiple positions** — `OrgPosition` is many-to-one with `User`, but project membership assumes one person = one user
3. **No reverse lookup** — No efficient way to get "all projects for this OrgPosition"
4. **Availability not projected to project context** — OrgPerson availability is not visible in project assignments

### Existing Patterns

- `OrgPosition` is the canonical org identity
- `userId` links User to OrgPosition(s)
- `OrgPersonDTO` is the canonical person type for org features
- Person lookup uses `orgPosition.findMany` with user join

---

## Phase 3: Cross-Feature Patterns

### Summary

Several cross-feature bridging patterns exist, but they use different scoping models (`workspaceId` vs `orgId`) and different entity linking strategies (direct FK vs polymorphic anchor). The capacity system uses `WorkAllocation` with `contextType: "PROJECT"` to link capacity to projects, but this is disconnected from `ProjectMember`/`ProjectAssignee`. The Todo system uses anchor patterns (`anchorType`/`anchorId`) for polymorphic links.

### Code Evidence

**WorkAllocation** (`prisma/schema.prisma`):
```
WorkAllocation {
  personId         String
  contextType      AllocationContextType  // TEAM, PROJECT, ROLE, OTHER
  contextId        String?
  contextLabel     String?
  allocationPercent Float
}
```

**ProjectAllocation** (`prisma/schema.prisma`) — LEGACY:
```
ProjectAllocation {
  orgId            String    // NOT workspaceId — older scoping model
  projectId        String
  personId         String
  allocationPercent Float
}
```

**Todo Anchor Pattern** (`prisma/schema.prisma`):
```
Todo {
  anchorType   AnchorType  // NONE, PROJECT, TASK, PAGE
  anchorId     String?
}
```

**Capacity Resolution** (`src/lib/org/capacity/resolveEffectiveCapacity.ts`):
```typescript
effectiveAvailableHours = contractedHours × availabilityFactor − allocatedHours
```

**Allocation Reading** (`src/lib/org/allocations/read.ts`):
```typescript
function getWorkAllocations(workspaceId, personId, timeWindow) {
  // Returns WorkAllocation[] with contextType, contextId, allocationPercent
}
```

### Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCOPING SYSTEMS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  NEWER (workspaceId-based):                                       │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐         │
│  │  Project   │    │WorkAllocation │    │    Todo       │         │
│  │workspaceId│    │workspaceId    │    │workspaceId    │         │
│  │           │◄───│contextType:   │    │anchorType:    │         │
│  │           │    │  PROJECT      │    │  PROJECT      │         │
│  │           │    │contextId ─────┼───►│anchorId ──────┼──►      │
│  └──────────┘    └──────────────┘    └──────────────┘         │
│                                                                   │
│  OLDER (orgId-based):                                             │
│  ┌──────────┐     ┌──────────────────┐                            │
│  │  Project   │◄──│ProjectAllocation  │                            │
│  │  orgId     │   │  orgId (NOT       │                            │
│  │           │    │  workspaceId)     │                            │
│  └──────────┘    └──────────────────┘                            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Gaps Identified

1. **Dual scoping** — `ProjectAllocation` uses `orgId` while `WorkAllocation` uses `workspaceId`. Unclear which is canonical
2. **No auto-allocation on assignment** — Adding a `ProjectAssignee` does not create a `WorkAllocation`
3. **No auto-org-record on project creation** — Creating a project does not create org records
4. **Capacity formula ignores project membership** — `resolveEffectiveCapacity` reads `WorkAllocation` but not `ProjectMember`/`ProjectAssignee`
5. **Todo anchors have no referential integrity** — `anchorId` is a plain string, not a FK

### Existing Patterns

- `WorkAllocation` with `contextType: "PROJECT"` is the newer capacity-to-project bridge
- `ProjectAllocation` with `orgId` is legacy and should probably be deprecated
- Todo anchor pattern (`anchorType`/`anchorId`) for polymorphic entity linking
- Capacity formula: `contractedHours × availabilityFactor − allocatedHours`

---

## Phase 4: Loopbrain Context

### Summary

Loopbrain maintains separate context graphs for org and spaces (projects). The org context bundle includes person-team-department-role relations but **no project data**. Project context includes only the owner (single user) — **no team members, no assignees, no allocations**. The capacity snapshot builder (`buildUnifiedCapacity`) computes per-person project allocation breakdowns but this data is never used by project context builders. Q3 reasoning ("who should work on this?") fetches project allocations independently but ignores `ProjectMember` data.

### Code Evidence

**Org Context Bundle** (`src/lib/loopbrain/org/buildOrgLoopbrainContextBundle.ts`):
```
Relations built:
  - has_department, has_team, has_role, has_person (org-level)
  - member_of_team, has_member (person-team bidirectional)
  - member_of_department, has_member (person-department bidirectional)
  - reports_to, manages (manager-report bidirectional)
  - owns, owned_by (person-role bidirectional)

NOT built:
  - No person→project relations
  - No project data loaded at all
```

**Project Context Upsert** (`src/lib/loopbrain/context-engine.ts:997-1076`):
```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    owner: { select: { id, name, email } },        // ONLY owner
    documentationLinks: { include: { wikiPage } },
    _count: { select: { tasks: true } }
  }
  // NO: members, assignees, allocations, team
})
```

**ProjectContext Interface** (`src/lib/loopbrain/context-types.ts`):
```typescript
interface ProjectContext {
  name, description, status, priority,
  startDate, endDate,
  department, team,
  epics, tasks, recentActivity
  // NO: members, assignees, owner, people, capacity
}
```

**Capacity Snapshot** (`src/lib/loopbrain/context-sources/capacity.ts`):
```typescript
interface UnifiedCapacitySnapshotV0 {
  personId: string
  allocations: {
    totalAllocationPct: number
    projectCount: number
    byProject: Array<{ projectId, projectName, allocationPct }>  // EXISTS!
  }
  effectiveCapacity: { effectivePct, hasCapacity }
}
// This builder EXISTS but is NOT called by project context builders
```

**Q3 Reasoning** (`src/lib/loopbrain/reasoning/q3.ts:87-91`):
```typescript
const [project, people, roles] = await Promise.all([
  fetchProjectWithAccountability(projectId, workspaceId),
  fetchPeopleWithCapacity(workspaceId),    // All workspace people
  fetchRolesWithResponsibilities(workspaceId),
])
// Uses ProjectAllocation, NOT ProjectMember
```

**Loopbrain Questions** (`src/lib/loopbrain/contract/questions.v0.ts`):
- 6 questions defined, **ALL workspace/org-scoped, ZERO project-scoped**

### Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                  LOOPBRAIN CONTEXT GRAPH                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ORG MODE:                        SPACES MODE:                     │
│  ┌─────────┐                      ┌──────────┐                    │
│  │   Org    │                      │ Project  │                    │
│  └────┬────┘                      │ (name,   │                    │
│       │ has_department              │  status, │                    │
│  ┌────▼────┐                      │  owner)  │                    │
│  │Department│                      └────┬────┘                    │
│  └────┬────┘                           │                           │
│       │ has_team                        │ has_epic                  │
│  ┌────▼────┐                      ┌────▼────┐                    │
│  │  Team   │                      │  Epic    │                    │
│  └────┬────┘                      └────┬────┘                    │
│       │ has_member                      │ has_task                  │
│  ┌────▼────┐                      ┌────▼────┐                    │
│  │ Person  │     ╳ NO EDGE ╳      │  Task    │                    │
│  │(org pos)│◄═══════════════════►│(assignee)│                    │
│  └────────┘                      └─────────┘                    │
│                                                                    │
│  MISSING: person↔project edges                                     │
│  MISSING: capacity in project context                              │
│  MISSING: project data in org context                              │
└──────────────────────────────────────────────────────────────────┘
```

### Gaps Identified

1. **No person↔project edges in context graph** — Org graph has person→team→department; spaces graph has project→epics→tasks. No bidirectional person↔project relations
2. **Project context never includes members/assignees** — `upsertProjectContext` only loads owner
3. **Org context never includes project data** — `buildOrgLoopbrainContextBundle` loads org/teams/people/roles only
4. **Capacity snapshot builder exists but is unused** — `buildUnifiedCapacity()` computes project allocations per person but project context builders never call it
5. **No project-scoped Loopbrain questions** — All 6 defined questions are workspace/org level
6. **Q3 reasoning bypasses ProjectMember** — Uses generic workspace people + allocations, cannot answer "who is assigned to this project"
7. **ProjectContext interface missing people fields** — No members, assignees, owner, capacity data

### Existing Patterns

- Fire-and-forget `upsertProjectContext()` / `upsertTaskContext()` called after mutations
- `buildUnifiedCapacity()` has project-by-project allocation breakdown (infrastructure exists)
- Q3 reasoning uses `fetchPeopleWithCapacity()` for candidate selection
- Context graph uses typed nodes and edges for traversal

---

## Phase 5: Events & Data Flow

### Summary

Event infrastructure exists (generic pub/sub bus, Socket.IO, org events, activity events) but is **underutilized for project→org flows**. Project mutations emit NO events — no OrgAuditLog entries, no Activity records, no Socket.IO emissions for project-level changes. Only Epic and Milestone routes emit Socket.IO events. Capacity issue detection (`deriveCapacityIssues`) is pull-based (on-demand), not event-driven. Loopbrain actions (task.assign, timeoff.create, capacity.request) index entities but never trigger capacity recalculation or org context updates.

### Code Evidence

**Event Bus** (`src/lib/events/emit.ts`):
- Simple `Map<string, Set<EventHandler>>` pub/sub
- Non-blocking, fire-and-forget

**Org Events** (`src/lib/events/orgEvents.ts`):
```typescript
// Types defined: DEPARTMENT_CREATED, DEPARTMENT_UPDATED,
// TEAM_CREATED, TEAM_UPDATED, POSITION_CREATED, POSITION_UPDATED, PERSON_UPDATED
// NO project-related event types
```

**PM Events** (`src/lib/pm/events.ts`):
```typescript
// Socket.IO events: epicCreated, epicUpdated, epicDeleted,
// milestoneCreated/Updated/Deleted, taskEpicAssigned, etc.
// Emits to project:${projectId} room
// NO capacity/allocation events
```

**Project Route Event Coverage:**

| Route | Method | OrgAuditLog | Activity | emitProjectEvent | upsertContext |
|-------|--------|-------------|----------|------------------|---------------|
| `/api/projects` | POST | -- | -- | -- | Yes |
| `/api/projects/[id]` | PUT | -- | -- | -- | Yes |
| `/api/projects/[id]` | DELETE | -- | -- | -- | -- |
| `/api/projects/[id]/assignees` | GET | -- | -- | -- | -- |
| `/api/projects/[id]/epics` | POST | -- | -- | Yes | Yes |
| `/api/projects/[id]/milestones` | POST | -- | -- | Yes | -- |

**Loopbrain Action Executor** (`src/lib/loopbrain/actions/executor.ts`):
```typescript
// task.assign: Updates task.assigneeId → indexes task + person
//   NO capacity check, NO allocation update
// timeoff.create: Creates TimeOff → indexes time_off + person
//   NO capacity recalculation, NO org availability update
// capacity.request: Creates task in "Requests" project → indexes project + task + team
//   NO org capacity context updated
```

**Capacity Issue Detection** (`src/lib/org/deriveIssues.ts`):
```typescript
// Pull-based, NOT triggered by project mutations
// Issues: OVERALLOCATED_PERSON, LOW_EFFECTIVE_CAPACITY,
// SINGLE_POINT_OF_FAILURE, NO_AVAILABLE_COVER, etc.
```

### Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT EVENT FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  PROJECT MUTATIONS:                                               │
│  ┌──────────┐     upsertContext    ┌────────────────┐            │
│  │ Project   │────────────────────►│ Loopbrain Index │            │
│  │ POST/PUT  │     (fire & forget) └────────────────┘            │
│  └──────────┘                                                    │
│       │                                                           │
│       ╳ NO audit log                                              │
│       ╳ NO activity record                                        │
│       ╳ NO socket event                                           │
│       ╳ NO capacity update                                        │
│       ╳ NO org notification                                       │
│                                                                   │
│  EPIC/MILESTONE MUTATIONS:                                        │
│  ┌──────────┐     emitProjectEvent  ┌──────────┐                 │
│  │Epic/Mile  │──────────────────────►│Socket.IO │                 │
│  │ POST/PUT  │                       │ project: │                 │
│  └──────────┘                       │ ${id}    │                 │
│                                      └──────────┘                 │
│  TASK MUTATIONS (via Socket.IO):                                  │
│  ┌──────────┐     emitEvent         ┌──────────────┐             │
│  │ Socket   │──────────────────────►│ActivityEvents │             │
│  │ Handler  │                       │TASK_CREATED   │             │
│  └──────────┘                       │TASK_COMPLETED │             │
│                                      └──────────────┘             │
│                                                                   │
│  ORG MUTATIONS:                                                   │
│  ┌──────────┐     OrgAuditLog       ┌──────────────┐             │
│  │ Org API  │──────────────────────►│ orgAudit.ts  │             │
│  │ Routes   │                       └──────────────┘             │
│  └──────────┘                                                    │
│                                                                   │
│  MISSING FLOWS (╳):                                               │
│  Project assign → Capacity update                                 │
│  Task assign → Allocation check                                   │
│  Org capacity change → Project notification                       │
│  Time off → Project impact alert                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Gaps Identified

1. **No project mutation events** — Project create/update/delete emit NO events (no OrgAuditLog, no Activity, no Socket.IO)
2. **No audit trail for project member assignments** — `ProjectAssignee.createMany` fires nothing
3. **Capacity issue detection is pull-based only** — `deriveCapacityIssues()` is not triggered by project/task mutations
4. **No bidirectional event flow** — Project→org events don't exist; org→project events don't exist
5. **Loopbrain actions don't trigger capacity recalculation** — task.assign, timeoff.create, capacity.request all index only
6. **No Activity records for project changes** — Activity model exists but is not used for project mutations
7. **Socket.IO events only for epics/milestones** — Project-level and assignee changes have no real-time propagation

### Existing Patterns

- Generic event bus at `src/lib/events/emit.ts` — infrastructure is ready
- `emitProjectEvent` pattern in epic/milestone routes — can be extended
- `OrgAuditLog` pattern in org routes — can be replicated for projects
- Fire-and-forget `upsertContext` after mutations — consistent pattern
- Activity events defined for tasks — can be extended to project-level

---

## Integration Points Map

### Current Integration Points (Working)

| From | To | Mechanism | Status |
|------|----|-----------|--------|
| Project creation | Loopbrain index | `upsertProjectContext()` fire-and-forget | Working |
| Project update | Loopbrain index | `upsertProjectContext()` fire-and-forget | Working |
| Task creation | Loopbrain index | `upsertTaskContext()` fire-and-forget | Working |
| Task mutation | Activity events | `emitEvent(TASK_CREATED/COMPLETED)` | Working |
| Epic/Milestone mutation | Socket.IO | `emitProjectEvent()` | Working |
| Project.teamId | OrgTeam | FK relation, optional | Working |
| WorkAllocation.contextType=PROJECT | Capacity | Allocation data exists | Working |
| Q3 reasoning | People + Allocations | Parallel fetch | Working |

### Missing Integration Points (Required)

| From | To | Recommended Mechanism | Priority |
|------|----|----------------------|----------|
| ProjectAssignee creation | WorkAllocation | Auto-create allocation record | **P0** |
| ProjectMember data | Project context | Include in `upsertProjectContext()` | **P0** |
| Person data | Org context bundle | Add person→project edges | **P1** |
| Project mutations | OrgAuditLog | Create audit entries | **P1** |
| Project mutations | Activity | Create activity records | **P1** |
| Capacity changes | Project notifications | Event-driven propagation | **P2** |
| Time off creation | Project impact | Check project assignments | **P2** |
| Task assignment | Capacity check | Pre-assignment validation | **P2** |
| Org structure changes | Project context | Invalidate/rebuild | **P3** |
| Project-scoped questions | Loopbrain | Define project-scoped Q types | **P3** |

### Canonical ID Mapping Required

```
┌──────────────┐       userId        ┌──────────────┐
│    User       │◄──────────────────│  OrgPosition   │
│  id           │                   │  id (personId)  │
└──────┬───────┘                   └───────┬────────┘
       │                                    │
       │ used by:                           │ used by:
       │ - ProjectMember                    │ - OrgPersonDTO
       │ - ProjectAssignee                  │ - WorkAllocation
       │ - ProjectWatcher                   │ - PersonAvailability
       │ - Project.ownerId                  │ - CapacityContract
       │                                    │ - PersonActivityMetric
       │                                    │ - PersonRelationship
       ▼                                    ▼
  PROJECT DOMAIN                      ORG DOMAIN
  (uses userId)                    (uses orgPositionId)
```

**Resolution:** A canonical `personId` resolution layer is needed that maps between `userId` (project domain) and `orgPositionId` (org domain).

---

## Loopbrain Impact Assessment

### What Loopbrain CAN Answer Today

| Question | Data Available | Accuracy |
|----------|----------------|----------|
| "What's this project about?" | Name, description, status, owner, docs | Good |
| "What epics does this project have?" | Epics loaded in spaces context | Good |
| "Can we take on new work?" | Workspace capacity + allocations | Moderate |
| "Who should work on this?" (Q3) | People + allocations + roles | Moderate |
| "Where are we structurally overloaded?" | Capacity issues derived | Good |

### What Loopbrain CANNOT Answer Today

| Question | Missing Data | Impact |
|----------|-------------|--------|
| "Who is on this project's team?" | ProjectMember/Assignee data not in context | **Critical** |
| "Is this person overallocated across projects?" | Person→project edges missing from context | **High** |
| "What's this project's team capacity?" | No project-scoped capacity snapshot | **High** |
| "What projects does this team own?" | No project data in org context | **High** |
| "Should we assign this person given their workload?" | No pre-assignment capacity check | **Medium** |
| "What happened on this project today?" | No project Activity records | **Medium** |
| "Who approved this project change?" | No project audit log | **Low** |

### Infrastructure That Exists But Is Disconnected

1. **`buildUnifiedCapacity()`** — Computes per-person project allocation breakdown. Ready to use, never called by project context builders
2. **`WorkAllocation` with `contextType: PROJECT`** — Allocation data exists. Not created when `ProjectAssignee` is created
3. **`ProjectAccountability`** — Owner/decision/escalation roles exist. Not included in project context
4. **`OrgAuditLog`** — Audit infrastructure exists. Not used for project mutations
5. **Activity events** — Event types defined. Not emitted for project-level changes
6. **Generic event bus** — Ready for new event types. No project→org events defined

---

## Risk Assessment

### Risk 1: Dual Identity System
**Severity:** High
**Description:** Projects use `userId` while org uses `OrgPosition.id`. No canonical mapping layer exists. A user could have multiple org positions, creating ambiguity in "who is assigned."
**Mitigation:** Build a `resolvePersonId(userId, workspaceId)` utility that maps userId → primary OrgPosition.id within a workspace.

### Risk 2: Silent Data Islands
**Severity:** High
**Description:** Project assignments, org capacity, and Loopbrain context are three disconnected data islands. Changes in one don't propagate to others.
**Mitigation:** Implement event-driven propagation: ProjectAssignee creation → WorkAllocation creation → Loopbrain context rebuild.

### Risk 3: Legacy ProjectAllocation Model
**Severity:** Medium
**Description:** `ProjectAllocation` uses `orgId` (older scoping model) while `WorkAllocation` uses `workspaceId`. Both represent capacity allocation to projects, creating confusion.
**Mitigation:** Deprecate `ProjectAllocation` in favor of `WorkAllocation` with `contextType: PROJECT`. Migration path needed.

### Risk 4: No Referential Integrity on Accountability
**Severity:** Medium
**Description:** `ProjectAccountability` stores `ownerPersonId`, `decisionPersonId`, `escalationPersonId` as plain strings with no FKs. Data integrity relies entirely on application code.
**Mitigation:** Add FK constraints or validate via API-level checks. Consider using `orgPositionId` with proper FK.

### Risk 5: Pull-Based Capacity Detection
**Severity:** Medium
**Description:** Capacity issues (`deriveCapacityIssues`) are only detected on-demand, not in real-time. A user could be overallocated across 5 projects with no warning until someone manually checks.
**Mitigation:** Add event-driven capacity recalculation triggered by allocation changes. Cache results and invalidate on mutation.

### Risk 6: No Project Audit Trail
**Severity:** Low (currently), High (at scale)
**Description:** Project mutations leave no audit trail. No `OrgAuditLog`, no `Activity`, no event emissions. For compliance and debugging, this becomes critical as the org scales.
**Mitigation:** Extend `OrgAuditLog` pattern to project mutations. Create `Activity` records for project-level changes.

---

## Summary Matrix

| Dimension | Current State | Target State | Gap Size |
|-----------|--------------|-------------|----------|
| Person identity | userId (projects) vs orgPositionId (org) | Unified personId resolution | Large |
| Project→Org data flow | Fire-and-forget context index only | Event-driven with audit + capacity | Large |
| Org→Project data flow | None | Capacity alerts, availability propagation | Large |
| Loopbrain project context | Owner only, no people data | Full team + capacity + allocations | Large |
| Loopbrain org context | No project data | Person→project edges, team→project mapping | Medium |
| Event infrastructure | Exists, underutilized | Project events, capacity events | Medium |
| Capacity binding | WorkAllocation exists, not auto-created | Auto-allocation on assignment | Medium |
| Audit trail | Org-only | Org + Project | Medium |

---

*End of Project-Org Connection Audit*
