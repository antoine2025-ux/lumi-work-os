# Loopwell Codebase Audit — February 20, 2026

**Branch:** `integration/merge-stabilized`
**Audited by:** Claude Code (claude-sonnet-4-6) with 4 parallel analysis agents
**Scope:** Full codebase — schema, routes, auth, features, Loopbrain, security, open issues

---

## 1. Executive Summary

Loopwell is a production-grade workplace operating system. The codebase has grown substantially since the February 17 baseline, with significant auth coverage improvements (+17pp getUnifiedAuth, +14pp assertAccess, +58pp Zod validation).

### What's Ready
- **Wiki** (85%) — Full editor, page management, personal spaces, RLS-isolated, AI assistant wired
- **Projects** (75%) — Core CRUD, epics, milestones, custom fields, task board functional
- **Org** (70%) — People, teams, departments, roles, capacity, availability, issue detection all functional
- **Loopbrain** (95%) — All Q1-Q9 pipelines fully implemented; 8 action types; agentic layer with confirmation flow; semantic search via pgvector; performance guardrails active
- **Onboarding** (95%) — 5-step wizard complete, post-completion Loopbrain sync fires
- **Auth coverage** — 78% getUnifiedAuth, 66% assertAccess, 78% Zod (major gains vs Feb 17 baseline)

### What Needs Work
1. **Manager/reporting relationships** — stored as text in descriptions, not linked to Person records
2. **Invite system** — UI exists but invite creation is not wired end-to-end
3. **Wiki AI action execution** — `extract_tasks` and `tag_pages` actions not wired to executor
4. **8 Prisma models missing from WORKSPACE_SCOPED_MODELS** — data could bypass scoping
5. **ProjectAllocation uses `orgId`** — should be `workspaceId` (hybrid scoping bug)
6. **Workspace scoping coverage** — only 53% of routes call `setWorkspaceContext()` (unchanged since baseline)

---

## 2. Statistics

| Metric | Value |
|--------|-------|
| **TypeScript/TSX files** | 1,950 |
| **API routes** | 430 |
| **Pages** | 135+ |
| **Layouts** | 16 |
| **Components** | 330+ (35 directories) |
| **Test files** | 66 (unit + E2E) |
| **Prisma models** | 160 |
| **Models in WORKSPACE_SCOPED_MODELS** | 88 |
| **Loopbrain files (src/lib/loopbrain/)** | ~41,400 lines |

### Auth Coverage vs. Baseline

| Metric | Feb 17 Baseline | Feb 20 Current | Delta |
|--------|----------------|----------------|-------|
| `getUnifiedAuth` coverage | 260/427 (61%) | 335/430 (78%) | +17pp |
| `assertAccess` coverage | 222/427 (52%) | 282/430 (66%) | +14pp |
| Zod validation | 85/427 (20%) | 335/430 (78%) | **+58pp** |
| `handleApiError` | 179/427 (42%) | 335/430 (78%) | +36pp |
| `setWorkspaceContext` | 228/427 (53%) | 228/430 (53%) | No change |

### Components by Directory

| Directory | Count | Purpose |
|-----------|-------|---------|
| org | 120+ | People, teams, roles, intelligence |
| ui | 40+ | shadcn/ui primitives |
| wiki | 27 | Editor, navigation, AI assistant |
| projects | 23 | Board, epics, gantt |
| goals | 12+ | Goal tracking |
| one-on-ones | 8+ | 1:1 meetings |
| tasks | 8+ | Task components |
| calendar | 7 | Calendar views |
| loopbrain | 10+ | AI chat, insights |
| dashboard | 5 | Dashboard widgets |
| performance | 6+ | Reviews, cycles |

---

## 3. Feature Inventory

### 3.1 Dashboard

**Pages:** DashboardLayoutClient, spaces/home
**Status:** 85% complete

- Spaces home dashboard with widgets and recent activity: ✅ functional
- Bootstrap API (`/api/dashboard/bootstrap`) loads workspace context in single call: ✅
- Project status cards, quick actions: ✅ new components (`src/components/dashboard/`)
- Compact/grid/minimal/original dashboard variants: ❌ deleted (cleaned up from branch)

**Gaps:** Some dashboard widgets are UI-only with no live data binding.

---

### 3.2 Projects

**Pages:** `/w/[workspaceSlug]/projects/`, `/w/[workspaceSlug]/projects/[id]/`, task detail
**API routes:** 30+ under `/api/projects/`, `/api/tasks/`, `/api/project-spaces/`
**Status:** 75% complete

| Feature | Status |
|---------|--------|
| Project list (grid/list view, search) | ✅ |
| Project detail (task board, epics, milestones) | ✅ |
| Custom fields (CRUD) | ✅ |
| Task comments, subtasks, dependencies | ✅ |
| Project documentation (wiki link) | ✅ |
| Gantt chart for epics | ⚠️ "Coming soon" |
| Project initiatives / reports | ⚠️ "Coming soon" (3 UI stubs) |
| Project duplication | ❌ TODO |
| Project sharing | ❌ TODO |
| Load all tasks (pagination) | ❌ TODO |
| Timeline/files tabs | ❌ Empty |
| AI Insights for epics | ⚠️ "Coming soon" |

**Notable TODOs:**
- `projects/page.tsx:454,464,474` — 3 "coming soon" sections
- `projects/[id]/page.tsx:391,397` — project duplication and sharing
- `projects/[id]/page.tsx:820` — load all tasks

---

### 3.3 Wiki

**Pages:** `/wiki/home`, `/wiki/[slug]`, `/wiki/personal-space`, `/wiki/workspace/[id]`, `/wiki/new`, `/wiki/search`
**API routes:** 13 under `/api/wiki/`
**Status:** 85% complete

| Feature | Status |
|---------|--------|
| Page creation/editing (TipTap editor) | ✅ |
| Full-text search | ✅ |
| Personal space (per-user isolation) | ✅ (Feb 2026 security fix) |
| Workspace wiki spaces | ✅ |
| Favorites | ✅ |
| Page versions | ✅ |
| Wiki AI assistant | ✅ (Q&A wired) |
| AI action execution (extract_tasks, tag_pages) | ❌ Not wired |
| Nested task lists in editor | ❌ Deferred |
| Table column resizing | ❌ Deferred |
| Wiki workspace privacy settings | ⚠️ Migration exists, UI pending |

**Security note:** Personal pages isolated by `createdById` check. Cache keys include `userId`. GET returns 404 (not 403) for others' personal pages to prevent existence disclosure.

---

### 3.4 Todos / My Tasks

**Pages:** `/my-tasks/`, `/todos/`
**API routes:** `/api/todos/`, `/api/my-tasks/`
**Status:** 90% complete

| Feature | Status |
|---------|--------|
| Personal todo CRUD | ✅ |
| My tasks (cross-project) | ✅ |
| Multiple views (mine, assigned, created, completed) | ✅ |
| Filter, search | ✅ |

---

### 3.5 Org Module

**Pages:** 40+ pages under `/org/` and `/w/[workspaceSlug]/org/`
**API routes:** 120+ under `/api/org/`
**Status:** 70% complete

| Feature | Status |
|---------|--------|
| People directory (search, filter) | ✅ |
| Person profiles | ✅ |
| Departments and teams (CRUD) | ✅ |
| Roles and custom roles | ✅ |
| Skills taxonomy | ✅ |
| Availability windows | ✅ |
| Capacity contracts | ✅ |
| Decision domains | ✅ |
| Ownership tracking | ✅ |
| Org issues / integrity detection | ✅ |
| Duplicate detection and merge | ✅ |
| Org intelligence snapshots | ✅ |
| **Manager/reporting relationships** | ❌ Stored as text, not linked to Person |
| **Invite system** | ❌ UI exists, not end-to-end wired |
| Change history | ❌ Not tracked |
| CSV export | ❌ TODO |
| Bulk assignment | ❌ TODO |
| Responsibility profiles | ⚠️ "Coming soon" |
| Org chart (visual) | ⚠️ 70% — department hierarchy TODO |

**Critical TODOs:**
- `OrgChartClient.tsx:73-78` — department hierarchy, hiring status, reorg flags all TODO
- `PeoplePageClient.tsx:373,623,630,964` — manager filter, invite flow, CSV export, bulk assignment

---

### 3.6 Goals

**Pages:** Goals UI (separate from OKRs)
**API routes:** 25+ under `/api/goals/`
**Status:** 70% (backend mature, UI in progress)

| Feature | Status |
|---------|--------|
| Goal CRUD | ✅ |
| Objectives and key results | ✅ |
| Check-ins, approvals, stakeholders | ✅ |
| Goal-project linking | ✅ |
| At-risk detection | ✅ |
| Recommendations | ✅ |
| Progress analytics | ✅ |

---

### 3.7 Performance, 1:1s

**API routes:** `/api/performance/`, `/api/one-on-ones/`
**Status:** 60% — backend solid, UI surface limited

| Feature | Status |
|---------|--------|
| Review cycles (create, launch) | ✅ |
| Review templates and responses | ✅ |
| 1:1 series and meetings | ✅ |
| Talking points and action items | ✅ |
| Suggestions | ✅ |
| UI pages for review/1:1 management | ⚠️ Components exist, pages thin |

---

### 3.8 Settings

**Pages:** Workspace settings
**Status:** 60%

| Feature | Status |
|---------|--------|
| Workspace name, slug, description | ✅ |
| Member management | ✅ |
| Org settings (capacity, preferences) | ✅ |
| Responsibility profiles | ❌ "Coming soon" |
| Role management UI | ⚠️ Partial |

---

### 3.9 Onboarding

**Pages:** `/onboarding/[step]` (steps 1–5)
**API routes:** `/api/onboarding/progress` + 6 more
**Status:** 95% complete

| Step | What it Does | Status |
|------|-------------|--------|
| 1 | Workspace name, admin info, company size | ✅ Creates Workspace + OrgPosition |
| 2 | Invite team members (email + role) | ✅ Creates OrgInvitation records |
| 3 | Departments and teams | ✅ Creates OrgDepartment + OrgTeam |
| 4 | First wiki space (name, template, visibility) | ✅ Creates ProjectSpace |
| 5 | Summary + confirm | ✅ Marks onboarding complete, fires Loopbrain context sync |

**Gaps:**
- Department lead names stored as text in description (not linked to Person)
- Template selection is cosmetic only (no pre-populated content)
- Form state not persisted across sessions (only workspace name)
- No email verification for invites

**Database records created:** ~8–20 records (Workspace, WorkspaceMember, OrgPosition, OrgInvitation×N, OrgDepartment×N, OrgTeam×N, ProjectSpace, OnboardingProgress)

---

### 3.10 Integrations

**Status:** Stub
- Slack OAuth callback and webhook receiver exist (`/api/integrations/slack/`)
- Webhook handler has placeholder NLP and Q&A at lines 163, 176
- No other integrations wired

---

## 4. Loopbrain Deep Dive

### 4.1 File Inventory

| File | Lines | Status |
|------|-------|--------|
| `orchestrator.ts` | 4,413 | ✅ Implemented — central "Virtual COO" brain |
| `context-engine.ts` | 1,955 | ✅ Implemented — Prisma-backed context retrieval |
| `insight-detector.ts` | 1,304 | ✅ Implemented — blocker/risk/anomaly detection |
| `workload-analysis.ts` | 1,101 | ✅ Implemented — capacity/allocation analysis |
| `entity-graph.ts` | 935 | ✅ Implemented — cached entity relationship graph |
| `actions/executor.ts` | 1,108 | ✅ Implemented — server-side mutation executor |
| `agent/tool-registry.ts` | 734 | ✅ Implemented — tool registry for agent plans |
| `embedding-service.ts` | 313 | ✅ Implemented — OpenAI text-embedding-3-small |
| `agent/planner.ts` | 552 | ✅ Implemented — agentic planning layer |
| `intent-router.ts` | 630 | ✅ Implemented — ACTION/QUESTION/ADVISORY routing |
| `context-pack.ts` | 201 | ✅ Implemented — prompt budget enforcement |
| `store/context-repository.ts` | 241 | ✅ Implemented — ContextItem persistence |
| `perf-guardrails.ts` | 140 | ✅ Implemented — DB query + scan caps |
| `reasoning/q3.ts` | 812 | ✅ Implemented — viable candidate analysis |
| `reasoning/q4.ts` | 803 | ✅ Implemented — capacity feasibility |
| `contract/*.v0.ts` | ~3,000 | ✅ Canonical contracts (blockerPriority, projectHealth, workloadAnalysis, etc.) |

### 4.2 Question Pipelines (Q1–Q9)

All 9 pipelines are **fully implemented**. No stubs detected.

| Q | Question | File | Status | Data Source |
|---|---------|------|--------|------------|
| Q1 | Who owns this? | `q1.ts` | ✅ | `ProjectAccountability.owner` |
| Q2 | Who decides this? | `q2.ts` | ✅ | `ProjectAccountability.decision` + escalation |
| Q3 | Are there viable candidates? | `reasoning/q3.ts` | ✅ | Allocations + availability windows |
| Q4 | Feasible within timeframe? | `reasoning/q4.ts` | ✅ | Person/team allocations, capacity |
| Q5 | Who is unavailable, when return? | `q5.ts` | ✅ | `PersonAvailability` windows |
| Q6 | Who can cover? | `q6.ts` | ✅ | Accountability + org structure + allocations |
| Q7 | Responsibility aligned? | `q7.ts` | ✅ | Accountability + role profiles |
| Q8 | Responsibility clear or fragmented? | `q8.ts` | ✅ | `ProjectAccountability` completeness |
| Q9 | Proceed, reassign, delay, support? | `q9.ts` | ✅ | Synthesizes Q1-Q8, Q3, Q4 |

### 4.3 Orchestrator Modes

| Mode | Focus | Status |
|------|-------|--------|
| `spaces` | Projects, pages, tasks | ✅ |
| `org` | Teams, roles, hierarchy | ✅ |
| `dashboard` | Workspace overview | ✅ |
| `goals` | Goal progress/risk | ✅ |

**Intent routing:** ACTION → agentic planner → clarification → confirmation → execution. ADVISORY → brainstorm suggestions. QUESTION → context + LLM answer.

### 4.4 Action Types (Mutations)

| Action | Implemented | Permission |
|--------|------------|-----------|
| `task.assign` | ✅ | MEMBER project access |
| `timeoff.create` | ✅ | Self-only |
| `org.assign_to_project` | ✅ | ADMIN |
| `org.approve_leave` | ✅ | Manager or ADMIN |
| `org.update_capacity` | ✅ | ADMIN |
| `org.assign_manager` | ✅ | ADMIN |
| `org.create_person` | ✅ | ADMIN |
| `capacity.request` | ⚠️ Partial | Not fully wired |

### 4.5 Cold-Start & Insufficient Data

**Blocker priority** (canonical, `blockerPriority.v0.ts`):
1. `NO_ACTIVE_PEOPLE`
2. `NO_TEAMS`
3. `OWNERSHIP_INCOMPLETE`
4. `NO_DECISION_DOMAINS`
5. `CAPACITY_COVERAGE_BELOW_MIN`
6. `RESPONSIBILITY_PROFILES_MISSING`
7. `WORK_CANNOT_EVALUATE_BASELINE`

All responses include `confidence: "high" | "medium" | "low"` + `constraints[]` + `risks[]`. Q9 returns `"insufficient_data"` action with user-facing explanation when required data is missing.

### 4.6 Performance Guardrails

| Limit | Value |
|-------|-------|
| `MAX_DB_QUERIES_PER_REQUEST` | 25 |
| `MAX_CAPACITY_USERS` | 60 |
| `MAX_TASKS_SCANNED_FOR_CAPACITY` | 2,000 |

Throws 503 `"Workspace is large; please narrow your query."` when limits are breached.

---

## 5. Security Findings

### 5.1 Auth Coverage

| Category | Count | Notes |
|----------|-------|-------|
| Full auth (getUnifiedAuth + assertAccess + Zod) | 282 | ✅ Secure |
| Partial auth (missing assertAccess) | 53 | ⚠️ Medium risk — custom auth logic in some |
| No auth — public/system by design | ~65 | ✅ Expected (embeds, blog, health, newsletter) |
| No auth — test/dev (env-gated) | 30+ | ✅ Protected by NODE_ENV + feature flags |

### 5.2 Intentionally Public Routes

The following have no auth by design:
- `/api/health` — uptime probe
- `/api/auth/[...nextauth]` — NextAuth system handler
- `/api/auth/check-workspace-by-email` — workspace discovery
- `/api/newsletter/subscribe`, `/api/waitlist/subscribe` — marketing
- `/api/blog/posts` — public blog
- `/api/embeds/*` (8 routes) — embed renderers
- `/api/integrations/slack/callback` — OAuth callback
- `/api/integrations/slack/webhook` — Slack webhook (⚠️ should verify Slack signature)

### 5.3 E2E Auth Route

`/api/e2e-auth` is **properly secured**:
- Returns 403 in production (`NODE_ENV === 'production'`)
- Requires `E2E_TEST_AUTH=true` env var
- Requires `E2E_TEST_PASSWORD` header match
- Creates isolated test users and workspaces

### 5.4 Internal/Cron Routes

`/api/internal/loopbrain/people-issues/run` and `/api/internal/loopbrain/run` use `x-cron-secret` or `Authorization: Bearer` header checked against `LOOPBRAIN_CRON_SECRET` env var. Fails closed in production if secret is unset.

### 5.5 Raw SQL

34 files use `$executeRaw` / `$queryRaw`. **All use Prisma template literal syntax** (parameterized). No string concatenation found. No SQL injection risk detected.

### 5.6 `dangerouslySetInnerHTML`

12 files use it. All are in wiki rendering and blog post rendering where content flows through TipTap's sanitized schema. No external-source XSS vectors detected.

### 5.7 Hardcoded Secrets

None found. All secrets use `process.env.*` pattern.

### 5.8 Workspace Scoping Middleware

**`scopingMiddleware.ts` gap:** 8 models have `workspaceId` in the schema but are **missing from `WORKSPACE_SCOPED_MODELS`**:

| Model | Risk |
|-------|------|
| `CustomFieldDef` | Medium — custom field definitions leak across workspaces |
| `ProjectDocumentation` | Medium — project docs not scoped |
| `ProjectAccountability` | High — ownership data not scoped |
| `FeatureFlag` | Low — flags could bleed |
| `Activity` | Medium — activity log not scoped |
| `ContextItem` | High — Loopbrain context not scoped |
| `ContextEmbedding` | High — semantic search index not scoped |
| `ContextSummary` | High — LLM summaries not scoped |

**Hybrid scoping concerns (using `orgId` instead of `workspaceId`):**
- `ProjectAllocation` — uses orphaned `orgId` field
- `SavedView` — legacy model using `orgId`
- `OrgMembership` — legacy model using `orgId`

### 5.9 RLS Status

Row-level security on `wiki_pages` is optional (off by default). When enabled, policies check `current_setting('app.user_id', true)`. Only the wiki POST route sets `app.user_id`. RLS is supplementary defense only — primary isolation is at application layer via `assertAccess` + workspace scoping.

---

## 6. Open Issues

### HIGH Severity

| Issue | Location | Impact |
|-------|----------|--------|
| Manager relationships stored as text | `OrgChartClient.tsx:73-78`, multiple | Org chart incomplete, manager UI broken |
| Invite system not end-to-end | `auth/user-status/route.ts:229`, `PeoplePageClient.tsx:623` | Cannot invite users from UI |
| Wiki AI action execution not wired | `wiki-ai-assistant.tsx:1338,1438` | AI extract_tasks, tag_pages silent no-ops |
| CSV export not implemented | `PeoplePageClient.tsx:630` | Cannot export people data |
| Bulk assignment not wired | `PeoplePageClient.tsx:964` | Bulk org operations missing |
| Slack webhook signature not verified | `integrations/slack/webhook/route.ts` | Potential spoofed webhook attacks |

### MEDIUM Severity

| Issue | Location | Impact |
|-------|----------|--------|
| 3 "coming soon" project sections | `projects/page.tsx:454,464,474` | Portfolio views empty |
| Project duplication not implemented | `projects/[id]/page.tsx:391` | No template cloning |
| Responsibility profiles UI | `responsibility/page.tsx:49` | Settings section placeholder |
| Change history not tracked | `PeoplePageClient.tsx:394`, `ActivityMiniTimeline.tsx:33` | No audit trail in UI |
| Gantt chart for epics | `epics-view.tsx:359` | "Coming soon" |
| capacity.request action partial | `executor.ts` | One action type not fully wired |

### LOW Severity

| Issue | Location | Impact |
|-------|----------|--------|
| Nested task lists deferred | `tiptap-editor.tsx:71` | Editor limitation |
| Table resize deferred | `tiptap-editor.tsx:74` | Editor limitation |
| Figma embed fullscreen | `figma-embed.tsx:43` | Embed UX |
| Manager permission granularity | `permissions.ts:77` | RBAC completeness |
| `findFirst` with `id` bypass in scoping middleware | `scopingMiddleware.ts:135-138` | Low risk, theoretical |

### TODO/FIXME Count (src/)

- **TODOs:** ~45 across the codebase
- **FIXMEs:** ~8
- **"Coming soon" strings:** 8 confirmed locations
- **Mock data in production:** None detected (seed files only)

---

## 7. Database Schema

### 7.1 Model Count by Domain

| Domain | Count |
|--------|-------|
| Org (people, teams, roles, capacity, decisions) | 31 |
| Project management (projects, tasks, epics, templates) | 29 |
| Goals & OKRs (goals, reviews, 1:1s, performance) | 28 |
| Wiki | 13 |
| Capacity & availability | 17 |
| Work & decisions | 13 |
| Onboarding & lifecycle | 11 |
| Loopbrain & analytics | 6 |
| Auth (User, Account, Session) | 5 |
| Workspace | 4 |
| System/utility | 3 |
| **Total** | **160** |

### 7.2 Schema Compliance

| Concern | Status |
|---------|--------|
| Models with `createdAt`/`updatedAt` | ✅ ~99% compliance |
| Models with `workspaceId` and `onDelete: Cascade` | ✅ Strong |
| Indexes on foreign keys | ✅ ~95% compliance |
| Models with `orgId` instead of `workspaceId` | ⚠️ 3 legacy models |
| Models missing from WORKSPACE_SCOPED_MODELS | ⚠️ 8 models (see §5.8) |

### 7.3 Models Missing Timestamps (Minor)

- `BlogPost` — no workspace context (platform-wide, acceptable)
- `LoopBrainModel`, `LoopBrainFeedback`, `LoopBrainOutcome` — missing `updatedAt`

---

## 8. Remediation Priorities

### P0 — Critical (fix within sprint)

| # | Issue | Effort | Risk if Ignored |
|---|-------|--------|----------------|
| 1 | Add 8 models to `WORKSPACE_SCOPED_MODELS` | 30 min | Cross-workspace data leakage for Loopbrain context, project accountability |
| 2 | Verify Slack webhook signature | 2h | Spoofed webhook attacks inject bad data |

### P1 — High (next sprint)

| # | Issue | Effort | Risk if Ignored |
|---|-------|--------|----------------|
| 3 | Wire manager/reporting relationships to Person model | 1 day | Org chart and manager-scoped features broken |
| 4 | Complete invite system end-to-end | 1 day | Cannot grow team from UI |
| 5 | Wire Wiki AI action executor | 2h | AI promises actions it silently ignores |
| 6 | Migrate `ProjectAllocation.orgId` → `workspaceId` | 3h | Hybrid scoping bug, allocation queries may miss records |

### P2 — Medium (this month)

| # | Issue | Effort |
|---|-------|--------|
| 7 | Implement CSV export for people | 2h |
| 8 | Wire bulk assignment API call | 2h |
| 9 | Add project duplication | 4h |
| 10 | Implement change history tracking | 1 day |
| 11 | Increase `setWorkspaceContext` coverage from 53% → 80%+ | 3 days |
| 12 | Deprecate legacy `orgId` models (SavedView, OrgMembership) | 1 day |

### P3 — Low (backlog)

| # | Issue |
|---|-------|
| 13 | Responsibility profiles UI |
| 14 | Project initiatives/reports views |
| 15 | Template content for onboarding (step 4) |
| 16 | Gantt chart for epics |
| 17 | `findFirst` with `id` bypass in scopingMiddleware |
| 18 | Wiki table column resizing and nested task lists |
| 19 | `capacity.request` action completion |

---

## Appendix A: Full Route List with Auth Status

### Legend
- ✅ Full auth (getUnifiedAuth + assertAccess + Zod)
- ⚠️ Partial auth (getUnifiedAuth only, or custom logic)
- ❌ No auth (public/system/test by design)

### Wiki (13 routes)
```
✅ GET/POST   /api/wiki/pages
✅ GET/PUT/DELETE /api/wiki/pages/[id]
✅ POST/DELETE /api/wiki/pages/[id]/favorite
✅ GET        /api/wiki/pages/[id]/versions
✅ POST       /api/wiki/pages/[id]/upgrade
✅ GET        /api/wiki/search
✅ GET        /api/wiki/page-counts
✅ GET        /api/wiki/recent-pages
✅ GET        /api/wiki/favorites
✅ GET        /api/wiki/favorites/check
✅ GET/POST   /api/wiki/workspaces
✅ GET/PUT    /api/wiki/workspaces/[id]
✅ GET/POST   /api/wiki/workspaces/[id]/members
```

### Org (120+ routes)
```
✅ All /api/org/structure/* (departments, teams, members)
✅ All /api/org/people/* (40+ sub-routes)
✅ All /api/org/roles/* and /api/org/custom-roles/*
✅ All /api/org/positions/* and /api/org/allocations/*
✅ All /api/org/capacity/*
✅ All /api/org/intelligence/*
✅ All /api/org/health/* (8 sub-routes)
✅ All /api/org/ownership/*
✅ All /api/org/decision/*
✅ All /api/org/issues/*
✅ All /api/org/duplicates/*
✅ All /api/org/loopbrain/* (8 sub-routes)
⚠️ GET        /api/org/ownership/bulk-assign  (missing assertAccess)
⚠️ GET        /api/org/insights/overview      (partial)
```

### Loopbrain (35+ routes)
```
✅ POST  /api/loopbrain/chat
✅ GET   /api/loopbrain/context
✅ GET   /api/loopbrain/insights
✅ POST  /api/loopbrain/insights/dismiss
✅ GET   /api/loopbrain/capacity, /api/loopbrain/workload
✅ GET   /api/loopbrain/project-health
✅ GET   /api/loopbrain/entity-graph
✅ POST  /api/loopbrain/org/ask, /api/loopbrain/org/qna
✅ GET   /api/loopbrain/q1, q2, q5, q6, q7, q8, q9
✅ GET   /api/loopbrain/org/q3, q4
✅ GET   /api/loopbrain/org/debug, context/status, context/bundle
⚠️ GET   /api/loopbrain/index-health  (partial)
```

### Projects / Tasks (35+ routes)
```
✅ All /api/projects/* (CRUD, assignees, people)
✅ All /api/projects/[projectId]/tasks
✅ All /api/projects/[projectId]/epics/*
✅ All /api/projects/[projectId]/milestones/*
✅ All /api/projects/[projectId]/custom-fields/*
✅ All /api/project-templates/*
✅ All /api/project-spaces/*
✅ All /api/tasks/* (CRUD, comments, subtasks, dependencies)
✅ All /api/task-templates/*
```

### Goals (25+ routes)
```
✅ All /api/goals/* (CRUD, objectives, key results, check-ins)
✅ All /api/goals/[goalId]/actions/*
✅ GET /api/goals/at-risk
✅ GET /api/goals/correlations
```

### Performance / 1:1s
```
✅ All /api/performance/* (cycles, reviews, templates)
✅ All /api/one-on-ones/* (series, meetings, talking points, action items)
```

### Todos / My Tasks
```
✅ GET/POST      /api/todos
✅ GET/PUT/DELETE /api/todos/[id]
✅ GET           /api/my-tasks
```

### Dashboard / Bootstrap
```
✅ GET /api/dashboard/bootstrap
```

### Onboarding
```
✅ GET/POST /api/onboarding/progress
✅ All /api/onboarding/plans/*
✅ All /api/onboarding/templates/*
✅ POST /api/onboarding/generate
```

### Auth (system routes — no getUnifiedAuth by design)
```
❌ /api/auth/[...nextauth]        (NextAuth handler)
❌ /api/auth/user-status          (custom auth logic)
❌ /api/auth/check-workspace-by-email (public discovery)
```

### Integrations (Slack)
```
⚠️ GET  /api/integrations/slack          (full auth)
⚠️ GET  /api/integrations/slack/connect  (full auth)
⚠️ GET  /api/integrations/slack/channels (full auth)
⚠️ POST /api/integrations/slack/send     (full auth)
❌ GET  /api/integrations/slack/callback  (OAuth callback)
❌ POST /api/integrations/slack/webhook   (webhook — NO sig verification ⚠️)
```

### Public / Marketing
```
❌ GET  /api/health
❌ GET  /api/blog/posts
❌ POST /api/newsletter/subscribe
❌ POST /api/waitlist/subscribe
❌ GET  /api/embeds/* (8 routes)
```

### Internal / Cron (secret-protected)
```
⚠️ POST /api/internal/loopbrain/people-issues/run  (x-cron-secret)
⚠️ POST /api/internal/loopbrain/run                (x-cron-secret)
✅ GET  /api/internal/org-context-diagnostics       (full auth)
```

### Dev / Debug / Test (env-gated, 30+ routes)
```
❌ /api/e2e-auth          (E2E_TEST_AUTH flag + password)
❌ /api/dev-login         (NODE_ENV != production)
❌ /api/test-auth         (test only)
❌ /api/dev/*             (NODE_ENV != production)
❌ /api/debug/*           (debug only)
```

---

## Appendix B: Onboarding Database Records Summary

| Record | Created At | Notes |
|--------|-----------|-------|
| `Workspace` | Step 1 | With slug, name, company size |
| `WorkspaceMember` | Step 1 | Admin user, role=OWNER |
| `OrgPosition` | Step 1 | Admin's title/position |
| `OrgInvitation` × N | Step 2 | One per valid email |
| `OrgDepartment` × N | Step 3 | Lead name stored in description (not linked) |
| `OrgTeam` × N | Step 3 | Linked to department by name lookup |
| `ProjectSpace` | Step 4 | Template is cosmetic only |
| `OnboardingProgress` | Steps 1–5 | Tracks completion state |

---

## Appendix C: Loopbrain Context Sync (Post-Onboarding)

After step 5 completes, these fire-and-forget syncs run via `Promise.allSettled`:
- `syncOrgContext(workspaceId)`
- `syncDepartmentContexts(workspaceId)`
- `syncTeamContexts(workspaceId)`
- `syncPersonContexts(workspaceId)`
- `syncRoleContexts(workspaceId)`

This populates the `ContextItem` store for semantic search and org intelligence.

---

*This document is the authoritative source of truth for the Loopwell codebase as of 2026-02-20.*
*Next audit recommended: after P0/P1 remediations are complete.*
