# Org Module

> Audited 2026-03-09 from live code. 487 files, ~97k lines.

## Purpose

People, teams, departments, capacity planning, decision domains, health scoring, intelligence signals, and organizational issue detection — the core HR/ops data layer.

## Current State

| Feature | Status | Notes |
|---------|--------|-------|
| People CRUD | **LIVE** | Create, archive, profile editing, skills, availability |
| Teams & Departments | **LIVE** | Create, nest, assign owners, reorder |
| OrgChart | **LIVE** | Tree visualization. Department context (hiring/reorg) PLACEHOLDER — `OrgChartClient.tsx:74-79` |
| Positions & Roles | **LIVE** | Position tree, role cards, job descriptions |
| Capacity Planning | **PARTIAL** | Summary/overview live. Per-person capacity issues STUBBED — 6 routes return `[]` for issues |
| Health Scoring | **LIVE** | 5 dimensions: capacity, ownership, balance, management, data quality |
| Intelligence | **LIVE** | Phase S snapshots, 4 resolvers (structure, people, capacity, ownership) |
| Issue Detection | **LIVE** | `deriveIssues.ts` (1,945 lines) covers 6 categories. Allocations data not yet populated. |
| Decision Domains | **LIVE** | Authority mapping, escalation steps |
| Responsibility Profiles | **PARTIAL** | Backend exists. UI is minimal (2 components) |
| Work Requests | **LIVE** | CRUD + feasibility + acknowledge + close |
| Leave Requests | **LIVE** | Approval flow with manager/admin permission checks |
| People Filters | **PARTIAL** | Leaders, Unassigned, New — wired. "Recently Changed" STUBBED (blocked on OrgAuditLog population) |
| Org Duplicates | **LIVE** | Detection, merge, undo, dismiss |
| Import | **LIVE** | CSV preview + apply |
| Member role checking | **STUBBED** | `/api/org/current/route.ts` — `currentMemberRole` hardcoded to null |

## Key Files

### Lib (`src/lib/org/` — 76 files, 33.8k lines)
- `data.server.ts` (1,074L) — Main entry: `getOrgOverviewStats()`, `listOrgPeople()`, `getOrgInsightsSnapshot()`
- `deriveIssues.ts` (1,945L) — Issue pipeline: 6 categories (capacity, ownership, structure, coverage, responsibility, availability)
- `org-context-service.ts` (243L) — Context bundle builder
- `healthService.ts` (202L) — Health scoring (role structure, span of control)
- `intelligence/computeOrgIntelligence.ts` (640L) — Intelligence computation pipeline
- `snapshot/buildOrgSemanticSnapshotV0.ts` (338L) — Loopbrain machine contract builder
- `snapshot/types.ts` (117L) — `OrgSemanticSnapshotV0` type definition
- `reasoning/engine.ts` (281L) — Rule evaluation engine with 4 rule sets

### Server (`src/server/org/` — 62 files, 8.3k lines)
- `people/read.ts` (656L) — People queries (list, search, profile)
- `people/write.ts` (353L) — Create, archive, profile updates
- `health/compute.ts` (642L) — Health snapshot computation
- `leave/process-leave-request.ts` (158L) — Leave approval service
- `contracts/build-org-snapshot-v1.ts` (249L) — Snapshot v1 builder
- `loopbrainContext/` — Loopbrain context building (v1, v2)

### UI (`src/components/org/` — 138 files, 55k lines)
- `api.ts` (1,010L) — React Query hooks for all org endpoints
- `PersonProfileClient.tsx` (1,177L) — Person profile editor
- `PeopleListClient.tsx` (921L) — People list with filters
- `issues/OrgIssuesInboxClient.tsx` (631L) — Issues inbox
- `health/setup/SetupWizard.tsx` (961L) — Health setup wizard
- `OrgContextProvider.tsx` (30L) — Pass-through server component wrapper

### Pages (33 pages under `/org`)
- `/org` → redirects to `/org/profile`
- `/org/people`, `/org/people/[personId]`, `/org/people/new`
- `/org/structure`, `/org/chart`, `/org/intelligence`, `/org/issues`
- `/org/admin/{capacity,decisions,health,responsibility,settings,job-descriptions}`
- `/org/performance/{cycles,reviews}`, `/org/my-team`, `/org/my-department`

## Data Models (~40 Prisma models)

**Core:** Org, OrgDepartment, OrgTeam, OrgPosition, OrgInvitation, OrgCustomRole, OrgAuditLog, OrgSavedView, OrgActivityExport, OrgPersonProfileOverride, JobDescription, RoleCard, Role, RoleResponsibility, OrgRoleTaxonomy

**People:** PersonAvailability, PersonCapacity, PersonSkill, PersonRoleAssignment, PersonManagerLink, PersonRelationship, PersonActivityMetric, PersonAvailabilityHealth, PersonResponsibilityOverride, ManagerProfile, Skill, OrgSkillTaxonomy

**Capacity:** CapacityAllocation, CapacityContract, TeamCapacityPlan, ProjectAllocation, OrgCapacitySettings

**Health/Intelligence:** OrgHealthSnapshot, OrgHealthSignal, OrgPersonIssue, OrgIssueResolution, OrgFixEvent, OrgHealthDigest, OrgIntelligenceSnapshot, OrgIntelligenceSettings

**Decision/Responsibility:** DecisionDomain, DecisionAuthority, DecisionEscalationStep, RoleCoverage, RoleResponsibilityProfile, ResponsibilityTag

**Loopbrain Config:** OrgLoopBrainConfig, OrgLoopBrainRollout, OrgLoopbrainQuery, OrgQnaLog

## API Routes — 211 route.ts files

All verified routes follow: `getUnifiedAuth → assertAccess → setWorkspaceContext`.

| Group | Count | Key Endpoints |
|-------|-------|---------------|
| People | 35 | CRUD, search, profile, skills, availability, manager, team, export |
| Health | 8 | Snapshot, minimal, setup, capacity, management-load, ownership, signals |
| Intelligence | 8 | Landing, settings, snapshots CRUD, recommendations |
| Capacity | 9 | Summary, effective, contracts, people, teams |
| Structure | 8 | Departments CRUD, teams CRUD, owner assignment |
| Issues | 5 | List, summary, preview, sync, apply |
| Work | 8 | Requests CRUD, acknowledge, feasibility, close, impact |
| Invitations | 7 | Create, accept, respond, resend, cancel, revoke |
| Other | 123 | Ownership, decisions, roles, skills, taxonomy, views, etc. |

## Loopbrain Integration — LIVE

**Snapshot contract:** `OrgSemanticSnapshotV0` (`src/lib/org/snapshot/types.ts`)
- Fields: readiness, coverage (ownership/capacity/responsibility/decisions), roles, decisionDomains, capacity, responsibility, work, issues
- Role-based filtering: MEMBER sees aggregates only; ADMIN/OWNER sees full snapshot
- Blockers are append-only enums (semantics never change)

**Context source:** `src/lib/loopbrain/context/getOrgSnapshotContext.ts` (50L) — calls `buildOrgSemanticSnapshotV0()`, applies role filtering, returns blockers-only if not answerable

**Loopbrain org module:** `src/lib/loopbrain/org/` (7 files, 1,498L)
- `buildOrgLoopbrainContextBundle.ts` (887L) — Main context bundler
- `buildOrgPromptSection.ts` (157L) — Prompt composition
- `buildOrgFewShotExamples.ts` (211L) — Few-shot examples
- `isOrgQuestion.ts` (67L) — Intent detection
- Q3 (org structure) and Q4 (org health) pipelines consume this

## Known Gaps

| Gap | Severity | Location |
|-----|----------|----------|
| Capacity issues return `[]` | P1 | 6 routes: `/capacity/contract`, `/allocations`, `/people/[id]/manager`, `/people/[id]/team` |
| `currentMemberRole` hardcoded null | P1 | `/api/org/current/route.ts` — client UI gating broken |
| OrgChart context unpopulated | P1 | `OrgChartClient.tsx:74-79` — hiring/reorg data missing |
| "Recently Changed" filter | P1 | Blocked on OrgAuditLog population |
| Capacity staleness check | P1 | `resolveEffectiveCapacity.ts` — TODO [P1] |
| Allocations data not populated | P1 | `deriveIssues.ts` — PersonAvailability/allocations empty |
| `orgId` fallback in ~69 routes | P2 | Legacy pattern: `const orgId = workspaceId` |
| Intelligence re-exports | P2 | `intelligence/index.ts` — backward-compat to remove post-Phase S |
| Responsibility UI minimal | P2 | Only 2 components in `src/components/org/responsibility/` |

## Dependencies

**Imports from foundation:** `db.ts`, `unified-auth.ts`, `assertAccess.ts`, `assertManagerAccess.ts`, `scopingMiddleware.ts`, `api-errors.ts`, `cache.ts`

**Imports from validations:** `src/lib/validations/org.ts`, `src/lib/validations/common.ts`

**Uses:** Prisma (direct queries), React Query (client), Zustand (client state), Zod (validation)

## Integration Points

| Consumer | How | What |
|----------|-----|------|
| **Loopbrain** | `OrgSemanticSnapshotV0` | Snapshot → Q3/Q4 pipelines, context bundling |
| **Projects** | `ProjectAllocation` | People assigned to projects reference org positions |
| **Goals** | Goal owners | Goals reference org people as owners/stakeholders |
| **Dashboard** | Stats | `getOrgOverviewStats()` feeds dashboard bootstrap |
| **Onboarding** | Setup | Onboarding step 3 creates initial org structure |
| **Policies** | Triggers | Policy engine can trigger on org events |
| **Integrations** | Slack notify | Org events can send Slack notifications |
