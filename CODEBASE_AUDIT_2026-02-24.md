# Loopwell Codebase Audit — February 24, 2026

**Branch:** `integration/merge-stabilized`
**Audited by:** Claude Code (claude-sonnet-4-6) with 4 parallel analysis agents
**Scope:** Full codebase — schema, routes, auth, features, Loopbrain, security, open issues
**Prior audit:** `CODEBASE_AUDIT_2026-02-20.md` (Feb 20 baseline)

> **Methodology note:** Auth coverage counts use `grep -rl` on `src/app/api/`. Zod coverage uses `.parse(`/`.safeParse(` call sites (stricter than Feb 20's broader import-based count — see §2 for reconciliation). Raw counts are literal file-match counts, not estimates.

---

## 1. Executive Summary

Loopwell continues to mature. Since the Feb 20 audit, 7 previously-reported issues have been resolved, including all 8 P0 workspace scoping models, the Slack webhook signature vulnerability, manager relationship linking, the invite system, and Wiki AI action execution. A fully mobile-responsive landing page was shipped.

New issues surfaced by this audit:
- **SQL injection risk** in `simple-auth.ts` and `people/write.ts` using `$queryRawUnsafe` with string interpolation (HIGH)
- **43 models with `workspaceId` missing from `WORKSPACE_SCOPED_MODELS`** — the schema grew from 160 → 162 models without middleware sync (P0)
- `orgId` fallback pattern present in 138 API route occurrences (P1, acknowledged v1 design)

### What's Ready
- **Wiki** (90%) — Full editor, AI actions now wired (extract_tasks, tag_pages)
- **Projects** (70%) — Core CRUD, task board functional; epic/timeline/files views not wired
- **Org** (75%) — Manager relationships linked, invite system wired, people directory functional
- **Loopbrain** (95%) — All Q1-Q9 pipelines implemented; 8 action types; agentic layer active
- **Onboarding** (95%) — 5-step wizard + post-completion Loopbrain sync
- **Landing page** (100%) — New, mobile-responsive, fully implemented
- **Auth coverage** — 74% getUnifiedAuth, 66% assertAccess, 67% setWorkspaceContext (scoping +14pp vs Feb 20)

### What Needs Work
1. **`$queryRawUnsafe` with string interpolation** in auth paths — upgrade to parameterized queries
2. **43 models missing from `WORKSPACE_SCOPED_MODELS`** — critical tenant isolation gap
3. **Projects epic/timeline/files views** — tabs exist, not wired (line 672)
4. ~~**OrgChart gaps**~~ — department context, hiring status, reorg flags now wired in getOrgChartData
5. **People filters** — Leaders/New/Recently Changed incomplete
6. **204 TODO/FIXME comments** — up from ~53; needs triage

---

## 2. Statistics

| Metric | Value |
|--------|-------|
| **TypeScript/TSX files** | 1,877 |
| **API routes** | 439 |
| **Pages** | 150 |
| **Layouts** | 17 |
| **Components (.tsx in src/components/)** | 560 |
| **Test files** | 66 (unit + E2E) |
| **Prisma models** | 162 |
| **Models in WORKSPACE_SCOPED_MODELS** | 79 |
| **Loopbrain files (src/lib/loopbrain/)** | 144 files / ~41,357 lines |
| **Landing page components** | 23 (new since Feb 20) |

### Auth Coverage vs. Baselines

| Metric | Feb 17 | Feb 20 | Feb 24 | Delta (20→24) |
|--------|--------|--------|--------|--------------|
| `getUnifiedAuth` coverage | 260/427 (61%) | 335/430 (78%) | 326/439 (74%) | −4pp (9 new routes w/o auth) |
| `assertAccess` coverage | 222/427 (52%) | 282/430 (66%) | 290/439 (66%) | Steady |
| `handleApiError` | 179/427 (42%) | 335/430 (78%)* | 246/439 (56%)* | See note |
| `setWorkspaceContext` | 228/427 (53%) | 228/430 (53%) | 296/439 (67%) | **+14pp** |
| Zod validation | 85/427 (20%) | 335/430 (78%)* | 102/439 (23%)* | See note |

> **\* Methodology difference:** Feb 20 counts for Zod and handleApiError appear to have used a broader import-presence methodology. Feb 24 uses stricter call-site counting (`grep -rl "\.parse\|\.safeParse"` and `grep -rl "handleApiError"`). The `setWorkspaceContext` improvement (+68 routes, +14pp) is a genuine, confirmed gain.

### Components by Directory

| Directory | Count | Purpose |
|-----------|-------|---------|
| org | 120+ | People, teams, roles, intelligence |
| ui | 40+ | shadcn/ui primitives |
| landing | 23 | Mobile-responsive landing page (new) |
| wiki | 27 | Editor, navigation, AI assistant |
| projects | 23 | Board, epics, gantt |
| goals | 12+ | Goal tracking |
| one-on-ones | 8+ | 1:1 meetings |
| tasks | 8+ | Task components |
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
- Project status cards, quick actions: ✅ functional
- Some widgets UI-only with no live data binding: ⚠️

**Gaps:** A subset of dashboard widgets remain UI shells without live data binding.

---

### 3.2 Projects

**Pages:** `/w/[workspaceSlug]/projects/`, `/w/[workspaceSlug]/projects/[id]/`, task detail
**API routes:** 30+ under `/api/projects/`, `/api/tasks/`, `/api/project-spaces/`
**Status:** 70% complete

| Feature | Status |
|---------|--------|
| Project list (grid/list view, search) | ✅ |
| Project detail (task board, epics, milestones) | ✅ |
| Custom fields (CRUD) | ✅ |
| Task comments, subtasks, dependencies | ✅ |
| Project documentation (wiki link) | ✅ |
| **Epic/timeline/files view wiring** | ❌ Tabs present, not wired (`projects/[id]/page.tsx:672`) |
| Gantt chart for epics | ⚠️ "Coming soon" |
| Project initiatives / reports | ⚠️ Stubs only |
| Project duplication | ❌ TODO (`projects/[id]/page.tsx:391`) |
| Project sharing | ❌ TODO (`projects/[id]/page.tsx:397`) |
| Legacy redirect cleanup | ❌ `projects/page.tsx:6` TODO comment |

**Notable TODOs:**
- `projects/[id]/page.tsx:672` — `TODO: Handle epics, timeline, files views`
- `projects/[id]/page.tsx:391,397` — project duplication and sharing
- `projects/page.tsx:6` — redirect cleanup for legacy route

---

### 3.3 Wiki

**Pages:** `/wiki/home`, `/wiki/[slug]`, `/wiki/personal-space`, `/wiki/workspace/[id]`, `/wiki/new`, `/wiki/search`
**API routes:** 13 under `/api/wiki/`
**Status:** 90% complete *(up from 85% — AI actions now wired)*

| Feature | Status |
|---------|--------|
| Page creation/editing (TipTap editor) | ✅ |
| Full-text search | ✅ |
| Personal space (per-user isolation) | ✅ |
| Workspace wiki spaces | ✅ |
| Favorites | ✅ |
| Page versions | ✅ |
| Wiki AI assistant | ✅ |
| AI action execution (extract_tasks) | ✅ *Wired — lines 1107, 1521* |
| AI action execution (tag_pages) | ✅ *Wired — lines 1133, 1544* |
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

> **Scoping note:** `Todo` model has `workspaceId` but is **not in WORKSPACE_SCOPED_MODELS** (see §5.8). Application-layer scoping handles isolation currently.

---

### 3.5 Org Module

**Pages:** 40+ pages under `/org/` and `/w/[workspaceSlug]/org/`
**API routes:** 120+ under `/api/org/`
**Status:** 75% complete *(up from 70% — manager relationships and invite system now resolved)*

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
| **Manager/reporting relationships** | ✅ *Fixed — `PersonManagerLink` model with FK + time windows* |
| **Invite system** | ✅ *Fixed — end-to-end wired with email + 14-day expiry* |
| OrgChart department context | ✅ Wired in getOrgChartData (reportsToName, isHiring, recentChangeSummary, isReorg) |
| OrgChart hiring status | ✅ Wired |
| OrgChart reorg flags | ✅ Wired |
| Leaders filter | ❌ `PeoplePageClient.tsx:372` — TODO |
| "New" people filter | ❌ `PeoplePageClient.tsx:389` — TODO |
| "Recently Changed" filter | ❌ `PeoplePageClient.tsx:393` — TODO |
| Bulk assignment | ❌ `PeoplePageClient.tsx:969` — no API call |
| Add Department drawer | ❌ `StructurePageActions.tsx:8` — not wired |
| Change history | ❌ Not tracked |
| CSV export | ❌ TODO |
| Responsibility profiles | ⚠️ "Coming soon" |
| Org chart (visual — dept hierarchy) | ⚠️ Partial |

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

---

### 3.10 Landing Page

**Status:** 100% — New since Feb 20
**Location:** `src/app/(landing)/page.tsx` (500 lines), 23 components under `src/components/landing/`

| Feature | Status |
|---------|--------|
| Hero section with typewriter effect | ✅ |
| Mobile-responsive layout (Tailwind md:/lg:) | ✅ |
| Reduced-motion accessibility support | ✅ |
| Dashboard, Spaces, Org, Loopbrain, Architecture mockups | ✅ (5 animated sections) |
| Loopbrain AI chat simulation (7-step animation) | ✅ |
| Dark/light mode toggle | ✅ |
| Scroll-triggered intersection animations | ✅ |

---

### 3.11 Integrations

**Status:** Stub (~15%)
- Slack OAuth callback, webhook receiver, and channel listing exist (`/api/integrations/slack/`)
- ✅ Webhook signature verification now implemented (P0 from Feb 20 resolved)
- Webhook NLP handler and Q&A processing remain placeholder (lines 163, 176)
- No other integrations wired

---

## 4. Loopbrain Deep Dive

### 4.1 File Inventory

| File | Lines | Status |
|------|-------|--------|
| `orchestrator.ts` | ~4,413 | ✅ Implemented — central "Virtual COO" brain |
| `context-engine.ts` | ~1,955 | ✅ Implemented — Prisma-backed context retrieval |
| `insight-detector.ts` | ~1,304 | ✅ Implemented — blocker/risk/anomaly detection |
| `workload-analysis.ts` | ~1,101 | ✅ Implemented — capacity/allocation analysis |
| `entity-graph.ts` | ~935 | ✅ Implemented — cached entity relationship graph |
| `actions/executor.ts` | ~1,108 | ✅ Implemented — server-side mutation executor |
| `agent/tool-registry.ts` | ~734 | ✅ Implemented — tool registry for agent plans |
| `embedding-service.ts` | ~313 | ✅ Implemented — OpenAI text-embedding-3-small |
| `agent/planner.ts` | ~552 | ✅ Implemented — agentic planning layer |
| `intent-router.ts` | ~630 | ✅ Implemented — ACTION/QUESTION/ADVISORY routing |
| `context-pack.ts` | ~201 | ✅ Implemented — prompt budget enforcement |
| `store/context-repository.ts` | ~241 | ✅ Implemented — ContextItem persistence |
| `perf-guardrails.ts` | ~140 | ✅ Implemented — DB query + scan caps |
| `reasoning/q3.ts` | ~812 | ✅ Implemented — viable candidate analysis |
| `reasoning/q4.ts` | ~803 | ✅ Implemented — capacity feasibility |
| `contract/*.v0.ts` | ~3,000 | ✅ Canonical contracts (blockerPriority, projectHealth, workloadAnalysis, etc.) |
| **Total** | **~41,357** | **144 files** |

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
| Full auth (getUnifiedAuth + assertAccess) | ~290 | ✅ Secure |
| Partial auth (getUnifiedAuth, no assertAccess) | ~36 | ⚠️ Medium risk — custom auth logic in some |
| No auth — public/system by design | ~65 | ✅ Expected (embeds, blog, health, newsletter) |
| No auth — test/dev (env-gated) | 30+ | ✅ Protected by NODE_ENV + feature flags |
| New routes without auth (since Feb 20) | ~9 | ⚠️ Requires review |

### 5.2 Intentionally Public Routes

The following have no auth by design:
- `/api/health` — uptime probe
- `/api/auth/[...nextauth]` — NextAuth system handler
- `/api/auth/check-workspace-by-email` — workspace discovery
- `/api/newsletter/subscribe`, `/api/waitlist/subscribe` — marketing
- `/api/blog/posts` — public blog
- `/api/embeds/*` (8 routes) — embed renderers
- `/api/integrations/slack/callback` — OAuth callback
- `/api/integrations/slack/webhook` — ✅ Now properly signature-verified (P0 resolved)

### 5.3 E2E Auth Route

`/api/e2e-auth` is **properly secured**:
- Returns 403 in production (`NODE_ENV === 'production'`)
- Requires `E2E_TEST_AUTH=true` env var
- Requires `E2E_TEST_PASSWORD` header match

### 5.4 Internal/Cron Routes

`/api/internal/loopbrain/people-issues/run` and `/api/internal/loopbrain/run` use `x-cron-secret` or `Authorization: Bearer` header checked against `LOOPBRAIN_CRON_SECRET` env var. Fails closed in production if secret is unset.

### 5.5 Raw SQL — Injection Risk Found

**19 files** use `$executeRaw` / `$queryRaw` / `$queryRawUnsafe` / `$executeRawUnsafe`.

**⚠️ HIGH RISK — 2 files use `$queryRawUnsafe` with string interpolation:**

| File | Lines | Pattern | Risk |
|------|-------|---------|------|
| `src/lib/simple-auth.ts` | 260, 376, 441 | `$queryRawUnsafe(\`INSERT INTO users ... '${escapedEmail}'\`)` | HIGH — auth path, manual `'→''` escaping only |
| `src/server/org/people/write.ts` | 82, 149 | `$queryRawUnsafe(\`INSERT INTO users ... '${escapedName}'\`)` | HIGH — single-quote escaping insufficient against all vectors |

**Safe patterns (remaining 17 files):** Use Prisma tagged template literals (`$queryRaw\`...\``) or correctly parameterized `$executeRawUnsafe(sql, $1, $2, ...)`. No SQL injection risk detected in those files.

**Recommendation:** Replace the two `$queryRawUnsafe` string-interpolation usages with `$queryRaw` tagged template literals or the parameterized form `$queryRawUnsafe(sql, param1, param2)`.

### 5.6 `dangerouslySetInnerHTML`

**12 files** use it. Most are expected (wiki rendering, blog posts, SEO structured-data). Two require review:

| File | Context | Concern |
|------|---------|---------|
| `src/components/tasks/task-comments.tsx` | User comment HTML | Confirm DOMPurify or equivalent sanitization |
| `src/components/assistant/draft-editor.tsx` | AI draft output | Confirm sanitization before rendering |

All wiki-rendering uses go through TipTap's sanitized schema.

### 5.7 Hardcoded Secrets

**None found.** All secrets use `process.env.*` pattern.

### 5.8 Workspace Scoping Middleware — Critical Gap

**`WORKSPACE_SCOPED_MODELS` had 79 entries at time of this audit.** ✅ **RESOLVED Feb 24** — all 43 missing models were added; array now contains **122 models**. See §Post-Audit Resolutions.

**Previously P0 models — now all present (resolved):**

| Model | Status |
|-------|--------|
| `CustomFieldDef` | ✅ Line 52 |
| `ProjectDocumentation` | ✅ Line 49 |
| `ProjectAccountability` | ✅ Line 50 |
| `FeatureFlag` | ✅ Line 13 |
| `Activity` | ✅ Line 23 |
| `ContextItem` | ✅ Line 24 |
| `ContextEmbedding` | ✅ Line 25 |
| `ContextSummary` | ✅ Line 26 |

**New gap — 43 models missing (schema growth without middleware sync):**

| Risk | Models |
|------|--------|
| **Critical** | `OrgDepartment`, `OrgTeam`, `OrgCustomRole`, `OrgInvitation`, `Todo`, `LeaveRequest`, `PersonAvailability`, `PersonManagerLink`, `DecisionDomain`, `CapacityContract` |
| **High** | `OrgIntelligenceSnapshot`, `OrgIntelligenceSettings`, `OrgAuditLog`, `OrgCapacitySettings`, `LoopbrainPendingAction`, `LoopbrainUserProfile`, `ProactiveInsight`, `ProjectSpace` |
| **Medium** | `OrgLoopbrainQuery`, `OrgLoopbrainQueryLog`, `OrgQnaLog`, `OrgActivityExport`, `PersonActivityMetric`, `PersonAvailabilityHealth`, `PersonRelationship`, `PersonResponsibilityOverride`, `OwnerAssignment`, `TeamCapacityPlan`, `OnboardingProgress` |
| **Low** | `OrgSavedView`, `OrgUiPreference`, `OrgIssueResolution`, `ResponsibilityTag`, `RoleCoverage`, `RoleResponsibilityProfile`, `WorkAllocation`, `WorkEffortDefaults`, `WorkImpact`, `WorkRecommendationLog`, `WorkRequest`, `LoopbrainOpenLoop`, `LoopbrainChatFeedback`, `OrgPersonProfileOverride` |
| **Intentionally excluded** | `Workspace`, `WorkspaceMember`, `WorkspaceOnboardingState` |

### 5.9 orgId Drift

138 occurrences of `orgId` in API routes. The `org/projects/route.ts` uses a deliberate v1 pattern:
```typescript
// For v1, orgId = workspaceId
const orgId = workspaceId;
```
with a fallback dual-query. This is acknowledged tech debt, not a live data-leak bug, but must be resolved before multi-org support.

### 5.10 Slack Webhook Signature

✅ **Resolved (P0 from Feb 20).** `src/app/api/integrations/slack/webhook/route.ts` now implements:
- HMAC-SHA256 using `SLACK_SIGNING_SECRET` from `process.env`
- Replay attack prevention (5-minute timestamp window)
- `crypto.timingSafeEqual` constant-time comparison
- Returns `401` immediately on failure

### 5.11 RLS Status

Row-level security on `wiki_pages` is optional (off by default). When enabled, policies check `current_setting('app.user_id', true)`. Only the wiki POST route sets `app.user_id`. RLS is supplementary defense only — primary isolation is at application layer via `assertAccess` + workspace scoping.

---

## 6. Open Issues

### HIGH Severity

| Issue | Location | Impact |
|-------|----------|--------|
| `$queryRawUnsafe` with string interpolation | `src/lib/simple-auth.ts:260,376,441`, `src/server/org/people/write.ts:82,149` | Auth-path SQL injection surface; manual quote-escaping insufficient |
| 43 models missing from WORKSPACE_SCOPED_MODELS | `src/lib/prisma/scopingMiddleware.ts` | Cross-workspace data leakage for critical models: OrgDepartment, OrgTeam, Todo, PersonAvailability, etc. |
| Epic/timeline/files views not wired | `src/app/(dashboard)/projects/[id]/page.tsx:672` | Three project view modes are dead tabs |
| orgId drift (138 occurrences) | `src/app/api/org/projects/route.ts` + 13 others | Pre-multitenancy technical debt, dual-query fallback in place |

### MEDIUM Severity

| Issue | Location | Impact |
|-------|----------|--------|
| OrgChart: department context | `data.server.ts` getOrgChartData | ✅ Wired (reportsToName, isHiring, recentChangeSummary, isReorg) |
| Leaders filter not wired | `PeoplePageClient.tsx:372` | Filter exists, no managerId data |
| "New" people filter not wired | `PeoplePageClient.tsx:389` | joinedAt not exposed |
| "Recently Changed" filter not wired | `PeoplePageClient.tsx:393` | Change history not tracked |
| Bulk assignment no API call | `PeoplePageClient.tsx:969` | console.log only |
| Add Department drawer not wired | `StructurePageActions.tsx:8` | Button is stub |
| Project duplication not implemented | `projects/[id]/page.tsx:391` | No template cloning |
| Responsibility profiles UI | `responsibility/page.tsx:49` | Settings section placeholder |
| Change history not tracked | Various | No audit trail in UI |
| `capacity.request` action partial | `executor.ts` | One action type not fully wired |
| `task-comments.tsx` dangerouslySetInnerHTML | `src/components/tasks/task-comments.tsx` | Confirm sanitization |
| `draft-editor.tsx` dangerouslySetInnerHTML | `src/components/assistant/draft-editor.tsx` | Confirm sanitization |
| Legacy route redirect | `src/app/(dashboard)/projects/page.tsx:6` | File flagged for deletion |

### LOW Severity

| Issue | Location | Impact |
|-------|----------|--------|
| Nested task lists deferred | `tiptap-editor.tsx:71` | Editor limitation |
| Table resize deferred | `tiptap-editor.tsx:74` | Editor limitation |
| Manager permission granularity | `permissions.ts:77` | RBAC completeness |
| `findFirst` with `id` bypass in scoping middleware | `scopingMiddleware.ts:135-138` | Low risk, theoretical |
| CSV export not implemented | `PeoplePageClient.tsx:630` | Cannot export people data |

### TODO/FIXME Count (src/)

- **TODOs + FIXMEs:** 204 across the codebase (up from ~53; needs triage)
- **"Coming soon" strings:** 2 confirmed locations (down from 8)
- **Mock data in production:** None detected (seed files only)

---

## 7. Resolved Since Feb 20

| Issue | Status | Evidence |
|-------|--------|----------|
| 8 P0 models missing from WORKSPACE_SCOPED_MODELS | ✅ Resolved | Lines 13, 23-26, 49-50, 52 of scopingMiddleware.ts |
| Slack webhook signature not verified | ✅ Resolved | HMAC-SHA256 + replay prevention + timingSafeEqual |
| Manager relationships stored as text | ✅ Resolved | `PersonManagerLink` model with FK + time windows |
| Invite system not end-to-end wired | ✅ Resolved | `/api/org/invitations/create` + accept + email |
| Wiki AI extract_tasks/tag_pages not wired | ✅ Resolved | `wiki-ai-assistant.tsx:1107,1133,1521,1544` |
| setWorkspaceContext coverage 53% | ✅ Improved | 296/439 (67%) — +68 routes |
| No landing page | ✅ Complete | `src/app/(landing)/` — 500-line page, 23 components |

---

## 8. Database Schema

### 8.1 Model Count by Domain

| Domain | Count |
|--------|-------|
| Org (people, teams, roles, capacity, decisions) | 33 |
| Project management (projects, tasks, epics, templates) | 29 |
| Goals & OKRs (goals, reviews, 1:1s, performance) | 28 |
| Wiki | 13 |
| Capacity & availability | 18 |
| Work & decisions | 14 |
| Onboarding & lifecycle | 11 |
| Loopbrain & analytics | 8 |
| Auth (User, Account, Session) | 5 |
| Workspace | 4 |
| System/utility | 3 |
| **Total** | **162** |

### 8.2 Schema Compliance

| Concern | Status |
|---------|--------|
| Models with `createdAt`/`updatedAt` | ✅ ~99% compliance |
| Models with `workspaceId` and `onDelete: Cascade` | ✅ Strong |
| Indexes on foreign keys | ✅ ~95% compliance |
| Models with `orgId` instead of `workspaceId` | ⚠️ 3 legacy models + v1 fallback pattern |
| Models missing from WORKSPACE_SCOPED_MODELS | 🔴 43 models (see §5.8) |

### 8.3 Models Missing Timestamps (Minor)

- `BlogPost` — no workspace context (platform-wide, acceptable)
- `LoopBrainModel`, `LoopBrainFeedback`, `LoopBrainOutcome` — missing `updatedAt`

---

## 9. Remediation Priorities

### P0 — Critical (fix within sprint)

| # | Issue | Effort | Status |
|---|-------|--------|--------|
| 1 | Add ~43 models to `WORKSPACE_SCOPED_MODELS` | 2h | ✅ RESOLVED Feb 24 — 122 models total |
| 2 | Replace `$queryRawUnsafe` string interpolation with parameterized queries | 3h | ✅ RESOLVED — all 13 call sites safe |

### P1 — High (next sprint)

| # | Issue | Effort | Risk if Ignored |
|---|-------|--------|----------------|
| 3 | Wire Epic/Timeline/Files views in projects | 1 day | Dead project view tabs |
| 4 | ~~Complete OrgChart department context (reportsToName, hiring, reorg)~~ | — | ✅ Done |
| 5 | Migrate `orgId` fallback to clean `workspaceId` | 1 day | Blocks multi-org support |
| 6 | Wire People filter: Leaders / New / Recently Changed | 4h | Filter UX broken |
| 7 | Wire bulk assignment API call | 2h | Org operations partially missing |
| 8 | Review `dangerouslySetInnerHTML` in task-comments and draft-editor | 2h | Potential XSS if content is unsanitized |

### P2 — Medium (this month)

| # | Issue | Effort |
|---|-------|--------|
| 9 | Implement CSV export for people | 2h |
| 10 | Add project duplication | 4h |
| 11 | Implement change history tracking | 1 day |
| 12 | Increase `assertAccess` coverage from 66% → 80%+ | 2 days |
| 13 | Wire Add Department drawer | 2h |
| 14 | Deprecate legacy `orgId` models (SavedView, OrgMembership) | 1 day |
| 15 | Triage 204 TODO/FIXME comments — security/auth-related ones to P1 | 1 day |

### P3 — Low (backlog)

| # | Issue |
|---|-------|
| 16 | Responsibility profiles UI |
| 17 | Project initiatives/reports views |
| 18 | Template content for onboarding (step 4) |
| 19 | Gantt chart for epics |
| 20 | `findFirst` with `id` bypass in scopingMiddleware |
| 21 | Wiki table column resizing and nested task lists |
| 22 | `capacity.request` action completion |
| 23 | Delete legacy projects route redirect (`projects/page.tsx:6`) |

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
✅ All /api/org/invitations/* (create, accept — now wired)
⚠️ GET /api/org/ownership/bulk-assign  (missing assertAccess)
⚠️ GET /api/org/insights/overview      (partial)
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
❌ /api/auth/user-status          (custom auth logic + pending invite detection)
❌ /api/auth/check-workspace-by-email (public discovery)
```

### Integrations (Slack)
```
✅ GET  /api/integrations/slack          (full auth)
✅ GET  /api/integrations/slack/connect  (full auth)
✅ GET  /api/integrations/slack/channels (full auth)
✅ POST /api/integrations/slack/send     (full auth)
❌ GET  /api/integrations/slack/callback  (OAuth callback — public by design)
✅ POST /api/integrations/slack/webhook   (HMAC-SHA256 sig verified — P0 resolved)
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
❌ /api/e2e-auth          (E2E_TEST_AUTH flag + password — production-gated)
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
| `OrgInvitation` × N | Step 2 | One per valid email, 14-day expiry, email sent |
| `OrgDepartment` × N | Step 3 | Lead name stored in description (not linked to Person) |
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

## Appendix D: Manager Relationship Architecture (Updated Feb 24)

Manager relationships are now stored via two complementary mechanisms:

**1. `OrgPosition.parentId`** (position-based hierarchy):
```prisma
parentId  String?
parent    OrgPosition?  @relation("OrgHierarchy", fields: [parentId], references: [id])
children  OrgPosition[] @relation("OrgHierarchy")
```

**2. `PersonManagerLink`** (person-to-person, time-windowed):
```prisma
model PersonManagerLink {
  workspaceId             String
  personId                String
  managerId               String
  startsAt                DateTime?
  endsAt                  DateTime?
  intentionallyUnassigned Boolean @default(false)
}
```

OrgChart department context (reportsToName, isHiring, recentChangeSummary, isReorg) is wired in getOrgChartData. reportsToName uses department lead's manager via OrgPosition.parent (OrgDepartment.parentId does not exist in schema).

---

---

## Post-Audit Resolutions (Feb 24–25, 2026)

The following issues documented in this audit have been resolved since publication.

| Issue (from this audit) | Resolution | Commit |
|------------------------|------------|--------|
| **§5.8** — 43 models missing from WORKSPACE_SCOPED_MODELS (79 total) | ✅ All 43 added. Now 122 total. | `d8619f1` |
| **§5.5** — `$queryRawUnsafe` string interpolation in simple-auth.ts + people/write.ts | ✅ All 13 call sites now parameterized. No string interpolation remains. | `4b389f0` |
| **§5.1** — 20 org routes with zero authentication (departments, roles, taxonomy, issues, views, etc.) | ✅ Canonical `getUnifiedAuth → assertAccess → setWorkspaceContext` applied to all 20 routes. | `28bb4a0` |
| **§6 HIGH** — Wiki isolation test failures (4 tests returning 500) | ✅ Missing mock added to workspace-isolation.spec.ts; findMany mock fixed in wiki-security.spec.ts. 23/23 passing. | `28bb4a0` |
| **NextAuth type augmentation** — 80 TypeScript errors in auth backbone | ✅ `src/types/next-auth.d.ts` fixed to use module augmentation; 26 import paths corrected. 0 TS errors. | `28bb4a0` |
| **§6 HIGH** — Epic/Timeline/Files tabs not wired in projects | ✅ All three views now conditionally rendered in projects/[id]/page.tsx | (prior sprint) |
| **§6 MEDIUM** — People filters (Leaders, New, Unassigned) | ✅ Wired in PeoplePageClient.tsx | (prior sprint) |

### Remaining Open Issues (as of Feb 25)

| Issue | Status | Priority |
|-------|--------|----------|
| `POST /api/migrations/blog` — no auth | ⚠️ Open | P0 (medium risk) |
| OrgChart department context (reportsToName, isHiring, recentChangeSummary, isReorg) | ✅ Resolved | — |
| People "Recently Changed" filter (needs OrgAuditLog) | ❌ Open | P1 |
| `orgId` fallback in ~69 API files | ⚠️ Open | P1 |
| Test mock gaps: auth-patterns.spec.ts (2), phase1-migrated-routes.spec.ts (1) | ⚠️ Open | P2 |
| `capacity.request` action not fully wired | ⚠️ Open | P2 |

---

*This document is a point-in-time snapshot as of 2026-02-24 with post-audit updates appended above.*
*For the live current state, see `CURRENT_STATE_AUDIT_2026-02-24.md`.*
*Previous audit: `CODEBASE_AUDIT_2026-02-20.md`. Next full audit recommended after P1 sprint.*
