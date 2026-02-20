# Level 4 Architecture & Roadmap — Loopwell

**Updated:** 2026-02-20 | **Source:** `CODEBASE_AUDIT_2026-02-20.md`

This document describes the target architecture and phased roadmap for completing Loopwell. It is organized by risk tier, not chronology.

---

## Current State Summary

| Layer | Completion | Key Gap |
|-------|-----------|---------|
| Auth & RBAC | 78% auth, 66% RBAC | 53 routes missing assertAccess |
| Workspace scoping | 53% | 202 routes not calling setWorkspaceContext |
| Data isolation | Strong but 8 models unscoped | See P0 below |
| Loopbrain AI | 95% | capacity.request action incomplete; Wiki actions not wired |
| Org features | 70% | Manager links, invites, CSV export |
| Projects | 75% | Duplication, sharing, reports, gantt |
| Wiki | 85% | AI action executor, privacy UI |
| Goals | 70% | UI surfaces thin, backend solid |
| Performance/1:1s | 60% | Backend solid, UI pages thin |
| Onboarding | 95% | Dept lead not linked, template content cosmetic |

---

## Tier 0 — Security Foundations (Do First)

These are non-negotiable before any public traffic scales.

### T0.1 — WORKSPACE_SCOPED_MODELS Completeness

**File:** `src/lib/prisma/scopingMiddleware.ts`
**Effort:** 30 minutes

Add to the `WORKSPACE_SCOPED_MODELS` array:
```typescript
'CustomFieldDef',
'ProjectDocumentation',
'ProjectAccountability',
'FeatureFlag',
'Activity',
'ContextItem',
'ContextEmbedding',
'ContextSummary',
```

**Why:** These models have `workspaceId` in schema but bypass automatic scoping. A Loopbrain context query or project accountability lookup could theoretically return another workspace's records.

### T0.2 — Slack Webhook Signature Verification

**File:** `src/app/api/integrations/slack/webhook/route.ts`
**Effort:** 2 hours

Verify the `X-Slack-Signature` header using HMAC-SHA256 before processing any webhook payload. Reject requests where signature does not match. Use Slack's standard verification algorithm.

### T0.3 — Migrate ProjectAllocation.orgId → workspaceId

**File:** `prisma/schema.prisma` + migration
**Effort:** 3 hours

`ProjectAllocation` uses an orphaned `orgId` field instead of `workspaceId`. This breaks workspace-scoped queries for allocation data.

```sql
-- Migration steps:
ALTER TABLE "project_allocations" ADD COLUMN "workspaceId" TEXT;
UPDATE "project_allocations" SET "workspaceId" = (
  SELECT "workspaceId" FROM "projects" WHERE "projects"."id" = "project_allocations"."projectId"
);
ALTER TABLE "project_allocations" DROP COLUMN "orgId";
```

---

## Tier 1 — Core Feature Completion (This Sprint)

### T1.1 — Manager Relationship Wiring

**Problem:** Department lead names stored as plain text in `OrgDepartment.description`. Manager relationships not linked to `OrgPosition.parentId`.

**Files to change:**
- `prisma/schema.prisma` — confirm `OrgPosition.parentId` is the canonical manager link
- `src/app/onboarding/api/progress/route.ts` — after Step 3, assign lead's OrgPosition as department owner
- `src/components/org/people/ReportingChain.tsx` — implement chain traversal using `parentId`
- `src/app/org/chart/OrgChartClient.tsx:73-78` — populate from real department hierarchy

**Effort:** 1 day

### T1.2 — Invite System End-to-End

**Problem:** `OrgInvitation` records are created during onboarding, but the UI invite flow (`PeoplePageClient.tsx:623`) is stubbed.

**Files to change:**
- `src/app/org/people/PeoplePageClient.tsx` — wire invite button to `/api/org/invitations` POST
- Email sending — confirm `OrgInvitation` creation triggers email (check if email provider is configured)
- `src/app/api/auth/user-status/route.ts:229` — implement pending invite lookup

**Effort:** 1 day

### T1.3 — Wiki AI Action Execution

**Problem:** `wiki-ai-assistant.tsx:1338` — action executor not called. `wiki-ai-assistant.tsx:1438` — `extract_tasks` and `tag_pages` cases are no-ops.

**Target:**
```typescript
// Wire to: src/lib/loopbrain/actions/executor.ts → executeAction()
case 'extract_tasks': await executeAction({ type: 'task.create', ... }, workspaceId, userId)
case 'tag_pages':     await executeAction({ type: 'wiki.tag', ... }, workspaceId, userId)
```

**Effort:** 2–4 hours

### T1.4 — assertAccess Gap Closure (53 routes)

**Problem:** 53 routes call `getUnifiedAuth` but skip `assertAccess`. Some have custom auth logic, but several are unprotected by accident.

**Audit approach:**
1. Run `grep -rn "getUnifiedAuth" src/app/api/ | grep -v "assertAccess"` to enumerate gaps
2. For each: verify custom auth logic is equivalent to assertAccess, or add assertAccess
3. `/api/org/ownership/bulk-assign` is the clearest gap — add `assertAccess({ requireRole: ['ADMIN'] })`

**Effort:** 1 day

---

## Tier 2 — Feature Gaps (Next Sprint)

### T2.1 — setWorkspaceContext Coverage

**Current:** 228/430 routes (53%)
**Target:** 350+/430 routes (80%+)

**Approach:** Automated sweep. Routes that call `getUnifiedAuth` and make Prisma queries but skip `setWorkspaceContext` should be updated. Many `assertAccess`-covered routes were written before scoping middleware was added.

**Effort:** 3 days (can be parallelized — routes are independent)

### T2.2 — CSV Export (People)

**File:** `src/app/org/people/PeoplePageClient.tsx:630`
**API endpoint:** `/api/org/people/export` already exists (returns data)

Wire export button to call `/api/org/people/export`, convert response to CSV, trigger browser download.

**Effort:** 2 hours

### T2.3 — Bulk Assignment

**File:** `src/app/org/people/PeoplePageClient.tsx:964`
**Target:** POST to `/api/org/ownership/bulk-assign`

**Effort:** 2 hours

### T2.4 — Project Duplication

**File:** `src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/page.tsx:391`
**New API needed:** `POST /api/projects/[projectId]/duplicate`

Should copy: project metadata, task structure, epic structure, custom field definitions. Should NOT copy: members, assignments, actual task data.

**Effort:** 4 hours

### T2.5 — Change History Tracking

**Problem:** No audit trail in UI for org structure changes. `ActivityMiniTimeline.tsx:33` shows placeholder.

**Architecture:**
- `AuditLogEntry` model exists — wire org mutations to emit audit log entries
- `src/lib/audit.ts` is already in the codebase — check if it's being called from org write paths
- `src/server/org/ownership/write.ts` should emit on ownership changes

**Effort:** 1 day

### T2.6 — Performance / 1:1 UI Surfaces

Performance review and 1:1 API backends are solid (8+ routes each). UI pages need building:
- Review cycle list and launch UI
- 1:1 meeting view with talking points and action items
- Review response form

**Effort:** 3 days

---

## Tier 3 — Polish & Completion (This Month)

### T3.1 — Onboarding Template Content

Step 4 template selection is cosmetic. Add starter content (2–3 wiki pages per template):
- Engineering: Sprint planning, Bug tracker, Roadmap
- Marketing: Campaign brief, Content calendar
- Operations: SOP template, Meeting notes
- HR: Onboarding checklist, Leave policy

**Effort:** 1 day

### T3.2 — Project Reports & Initiatives Views

3 "coming soon" sections in projects list page. Implement:
- Team-wide initiatives view (cross-project epics)
- Project analytics/velocity report
- Milestone burndown

**Effort:** 2 days

### T3.3 — Gantt Chart for Epics

`epics-view.tsx:359` — "AI Insights" and gantt coming soon.

Component `src/components/projects/gantt-chart.tsx` already exists. Wire it into the epic view.

**Effort:** 1 day

### T3.4 — Responsibility Profiles UI

`src/app/(dashboard)/w/[workspaceSlug]/org/admin/responsibility/page.tsx:49` — "coming soon".

Backend: `/api/org/responsibility/profiles/*` is implemented. Wire to UI with CRUD form.

**Effort:** 1 day

### T3.5 — Wiki Workspace Privacy UI

Migration `20260219000000_add_wiki_workspace_privacy` exists. UI toggle not built.

Wire to `PUT /api/wiki/workspaces/[id]` with a privacy toggle in workspace settings.

**Effort:** 2 hours

### T3.6 — Deprecate Legacy orgId Models

`SavedView`, `OrgMembership`, `Org` (legacy) use `orgId`. These are frozen Phase D models.

1. Verify no active code paths write to them
2. Add migration to drop columns
3. Remove model from schema if unused

**Effort:** 1 day per model (verify first)

---

## Tier 4 — Architectural Improvements

### T4.1 — Loopbrain Context Items in WORKSPACE_SCOPED_MODELS

After T0.1, validate that `ContextItem` / `ContextEmbedding` scoping works correctly with the semantic search queries in `embedding-service.ts`. The cosine similarity search uses raw SQL — ensure it also filters by `workspaceId`.

### T4.2 — RLS Strategy Decision

Current state: RLS on `wiki_pages` is optional, only active when `set_config('app.user_id')` is called.

Options:
1. **Enable everywhere** — Add `set_config` to all wiki routes, make RLS mandatory
2. **Remove RLS** — Trust application-layer auth entirely (simpler, already robust)
3. **Status quo** — Keep as defense-in-depth (current approach)

Recommendation: Option 2 or 3. RLS adds complexity with marginal gain given strong application-layer auth.

### T4.3 — Socket.io Completion

`/api/socketio` is a stub. Real-time features (task updates, wiki collaboration, presence) require this.

1. Complete the Socket.io server initialization
2. Define event types for workspace activity
3. Wire to wiki editor for collaborative presence indicator

### T4.4 — Loopbrain capacity.request Action

The `capacity.request` action type is defined but not fully wired in `executor.ts`. Complete:
- What does a capacity request create? (`WorkAllocation`? `CapacityContract`?)
- Who receives it? (ADMIN notification)
- Wire the executor case

---

## Architecture Invariants (Never Break)

1. **All API routes must call `getUnifiedAuth(request)`** — no exceptions for authenticated routes
2. **Workspace-scoped models must be in `WORKSPACE_SCOPED_MODELS`** — verify on every new model
3. **Loopbrain canonical contracts** — never duplicate `blockerPriority.v0.ts`, `questions.v0.ts`, `answer-envelope.v0.ts`
4. **Zod at every API boundary** — parse or safeParse before touching DB
5. **`OrgSemanticSnapshotV0` is a machine contract** — UI reads it, never extends it for display convenience
6. **`prismaUnscoped` for auth only** — all other DB access uses workspace-scoped prisma
7. **No `any` types** — use `unknown` and narrow, or define the type properly

---

## Dependency Map for Remaining Work

```
T0.1 (scoping array)
  └─ unblocks T4.1 (validate scoped Loopbrain queries)

T0.3 (orgId migration)
  └─ unblocks capacity planning accuracy

T1.1 (manager wiring)
  └─ unblocks org chart, ReportingChain, assertManagerOrAdmin accuracy
  └─ unblocks T1.2 (invite assigns to team via manager)

T1.2 (invite system)
  └─ unblocks T3.1 (invites during onboarding become real)

T1.3 (wiki AI actions)
  └─ unblocks wiki AI assistant fully automated workflows

T1.4 (assertAccess gaps)
  └─ unblocks RBAC completeness claim

T2.1 (setWorkspaceContext coverage)
  └─ unblocks data isolation completeness claim

T4.3 (Socket.io)
  └─ unblocks real-time collaboration and presence
```

---

## Feature Completion Targets

| Feature | Current | Target (end of sprint) | Target (this month) |
|---------|---------|------------------------|---------------------|
| Auth coverage (getUnifiedAuth) | 78% | 85% | 95% |
| RBAC (assertAccess) | 66% | 80% | 90% |
| Workspace scoping | 53% | 65% | 80% |
| Zod validation | 78% | 85% | 90% |
| Manager relationships | 0% | 80% | 100% |
| Invite system | 30% | 100% | 100% |
| Wiki AI actions | 60% | 100% | 100% |
| Projects | 75% | 80% | 90% |
| Org module | 70% | 80% | 85% |
| Performance/1:1s | 60% | 70% | 80% |

---

*This document tracks architectural intent. Update after each sprint's P0/P1 remediations.*
*Reference: `CODEBASE_AUDIT_2026-02-20.md` for full findings.*
