# Loopwell Architecture

> Generated 2026-03-09 from live codebase audit.
> Prior audit docs cross-referenced: CODEBASE_AUDIT_2026-02-24, LOOPBRAIN_AUDIT_2026-03-02, ORG_MODULE_AUDIT_2026-03-06, LEVEL4_ARCHITECTURE.md.

---

## 1. System Overview

Loopwell is a multi-tenant workplace operating system. Core surface areas:

| Module | Routes | Pages | Lib Files | Role |
|--------|--------|-------|-----------|------|
| **Org** | 184 | 33+ | 76 | People, teams, departments, capacity, decisions, intelligence |
| **Loopbrain** | 48 | — | 102 | AI context engine — intent routing, Q&A, actions, policies |
| **Goals** | 22 | 4 | 8+ | OKRs, check-ins, workflows, stakeholder management |
| **Projects** | 20 | 8 | 10+ | Project CRUD, tasks, epics, milestones, custom fields |
| **Wiki/Spaces** | 27 | 7 | 15+ | Knowledge base, collaborative editing, spaces unification |
| **Integrations** | 19 | — | 12 | Slack, Gmail, Google Drive, Calendar |
| **Performance** | 7 | 3 | 5+ | Review cycles, 1:1s |
| **Dashboard** | 2 | 1 | — | Activity feed, workspace bootstrap |
| **Onboarding** | 7 | 5 | 3+ | 5-step wizard, workspace setup |
| **Policies** | 7 | — | 4+ | Rule-based automation engine (Loopbrain-driven) |
| **Infrastructure** | 55 | — | 34 dirs | Auth, caching, real-time, scoping, validation, errors |

**Totals (live):** 498 API routes · 70 dashboard pages · 168 Prisma models · 152 workspace-scoped models

---

## 2. Module Boundaries

### 2.1 Foundation Layer

```
src/lib/db.ts                         Prisma client singleton (200+ consumers)
src/lib/unified-auth.ts               getUnifiedAuth() — auth context for all routes
src/server/authOptions.ts             NextAuth.js 4 JWT configuration
src/lib/auth/assertAccess.ts          RBAC enforcement (290 routes)
src/lib/auth/assertManagerAccess.ts   Manager-scoped access helper
src/lib/prisma/scopingMiddleware.ts   Workspace isolation (152 models)
src/lib/api-errors.ts                 Centralized error handling (246 routes)
src/lib/validations/                  Zod schema library (102 routes)
src/middleware.ts                     Route protection gateway
```

**Dependency hierarchy (must not be circular):**
```
Foundation:   db.ts
    ↑
Auth:         unified-auth.ts → authOptions.ts
    ↑
Permissions:  assertAccess.ts, assertManagerAccess.ts
    ↑
Application:  API routes, server components, client components
```

### 2.2 Org Module (`src/lib/org/` — 76 files)

The largest domain module. Subdirectories:

| Submodule | Files | Purpose |
|-----------|-------|---------|
| `intelligence/` | 22 | Org Intelligence Snapshot — readiness, completeness, capacity, ownership scoring |
| `capacity/` | 8 | Capacity planning, thresholds, team rollups |
| `issues/` | 7 | Issue detection engine (staffing, responsibility, decision gaps) |
| `impact/` | 5 | Work impact inference & resolution |
| `decision/` | 3 | Decision domain authority, escalation |
| `snapshot/` | 3 | OrgSemanticSnapshotV0 — machine contract for Loopbrain |
| `skills/` | 3 | Skill taxonomy & proficiency |
| `work/` | 3 | Work allocation & staffing analysis |
| `allocations/` | 2 | Person work allocations |
| `availability/` | 2 | Person availability windows |
| `mutations/` | 4 | Org data change bus |
| `listeners/` | 2 | Activity metric collection, relationship building |

Entry points: `data.server.ts` (loads all org data), `org-context-service.ts`, `healthService.ts`.

Server layer: `src/server/org/` (75+ files) — data queries, health checks, import, write operations, intelligence snapshots, loopbrain context.

UI: `src/components/org/` (120+ files) — 289+ components covering chart, people, departments, roles, capacity.

### 2.3 Loopbrain (`src/lib/loopbrain/` — 102 files)

AI Context Engine. Orchestrates questions about organizational data using intent routing, context bundling, and evidence-based answers.

```
loopbrain/
├── contract/              6 files — Canonical machine contracts (single source of truth)
│   ├── answer-envelope.v0.ts
│   ├── blockerPriority.v0.ts
│   ├── goalIntelligence.v0.ts
│   ├── questions.v0.ts        Q1–Q9 definitions
│   ├── refusalActions.v0.ts
│   └── validateAnswerEnvelope.ts
├── agent/                 5 files — Executor, planner, tool registry, context builder
├── org/                  18 files — Org-specific context bundling, prompt composition, few-shot
├── policies/              — Policy execution engine (rule-based automations)
├── permissions/           — Permission scoping for questions
├── context-sources/pm/    — Domain-specific context extraction (epics, projects, tasks)
├── indexing/builders/     — Document vectorization (epic, org, page, project, task, leave)
├── reasoning/             — Answer generation (calendar, entity links, workload)
├── store/                 — Summary repository
├── __tests__/             — Snapshot & personalization tests
├── orchestrator.ts        5,391 lines — Core routing for 4 modes (spaces/org/dashboard/goals)
├── intent-router.ts       — Intent classification
├── q1.ts–q9.ts            — Question pipeline implementations
├── context-ranker.ts      — Evidence ranking
├── embedding-service.ts   — Vector embedding
├── tool-schemas.ts        — Tool definitions for agent executor
└── [20+ supporting files] — Citations, formatting, budgets, caching, error types
```

**Orchestrator modes:** spaces, org, dashboard, goals. Each mode loads different context bundles and applies different prompt strategies.

**Q pipelines:** Q1 (general), Q2 (people), Q3 (org structure — via org/), Q4 (org health — via org/), Q5 (capacity), Q6 (workload), Q7 (project health), Q8 (goals), Q9 (calendar). All fully implemented.

**8 action types:** wiki extract_tasks, wiki tag_pages, org org-actions, goal actions (adjust-timeline, escalate, reallocate, update-progress), plus policy-driven actions. All wired with permission checks.

### 2.4 Projects & Tasks

- **API:** `/api/projects/` (20 routes), `/api/tasks/` (10 routes), `/api/project-spaces/` (4 routes)
- **Lib:** `src/lib/projects/`, `src/lib/pm/schemas.ts`
- **Models:** Project, Task, Epic, Milestone, ProjectSpace, ProjectMember, CustomFieldDef/Val, ProjectDocumentation, ProjectAccountability, ProjectDailySummary, ProjectTemplate, etc. (13+ models)
- **UI:** Board view functional, epic/timeline/files tabs exist but partially wired

### 2.5 Wiki & Spaces

- **API:** `/api/wiki/` (15 routes), `/api/spaces/` (12 routes)
- **Lib:** `src/lib/wiki/`, `src/lib/spaces/`
- **Models:** WikiPage, WikiTemplate, WikiFavorite, WikiVersion, WikiChunk, WikiComment, WikiAttachment, WikiPagePermission, WikiEmbed, Space, SpaceMember (11+ models)
- **UI:** Full TipTap editor, AI assistant, personal page isolation, version history, favorites
- **Security:** RLS on `wiki_pages`, personal page `createdById` isolation, per-user cache keys

### 2.6 Goals & Performance

- **API:** `/api/goals/` (22 routes), `/api/performance/` (7 routes), `/api/one-on-ones/` (6 routes)
- **Lib:** `src/lib/goals/`, `src/lib/performance/`, `src/lib/one-on-ones/`
- **Models:** Goal, Objective, KeyResult, GoalComment, GoalCheckIn, GoalWorkflowRule, PerformanceCycle, PerformanceReview, OneOnOneSeries/Meeting/TalkingPoint/ActionItem (17+ models)

### 2.7 Integrations

| Integration | Lib Path | API Routes | Status |
|-------------|----------|------------|--------|
| **Slack** | `src/lib/integrations/slack/` | 7 | OAuth + webhooks + interactive messages. HMAC-SHA256 verified. |
| **Gmail** | `src/lib/integrations/gmail/` | 8 | OAuth, send, watch, push notifications, sync |
| **Google Drive** | `src/lib/integrations/drive/` | 4 | OAuth, read/write/search, exponential retry |
| **Calendar** | `src/lib/integrations/calendar-events.ts` | 1 | Event sync & display |

Pattern: Store OAuth tokens in `Integration` model (workspace-scoped) → service functions instantiate API clients → execute.

---

## 3. Integration Matrix

Which modules talk to which, and how:

```
                 Org      Loopbrain   Projects   Wiki    Goals   Integrations
Org              —        snapshot→   allocation  —       —       slack notify
Loopbrain        ←context  —          ←context   ←context ←context ←drive search
Projects         people→   health→     —          wiki→   ←link   daily-summary→
Wiki             —         AI actions  ←links     —       —       —
Goals            ←owners   intelligence —          —       —       —
Integrations     —         ←tools      ←notify    —       —       —
Dashboard        ←stats    ←insights   ←stats     —       ←stats  —
Onboarding       ←setup    ←sync       —          —       —       —
Policies         ←triggers ←engine     —          —       —       —
```

**Key integration seams:**
- **Org → Loopbrain:** `OrgSemanticSnapshotV0` is the machine contract. Org builds it; Loopbrain consumes it. Never reinterpret in UI.
- **Loopbrain → All domains:** Context-sources extract data from projects, tasks, wiki, calendar, org.
- **Projects ↔ Goals:** `ProjectGoalLink` model. Goals sync progress from linked projects.
- **Wiki ↔ Tasks:** `TaskWikiLink` model. Loopbrain `extract_tasks` action creates tasks from wiki content.
- **Integrations → Loopbrain:** Drive search is a Loopbrain tool. Slack/Gmail are notification channels.

---

## 4. Data Flow Patterns

### 4.1 Standard API Request

```
Client (React) → fetch/TanStack Query
    ↓
Next.js API Route (src/app/api/**/route.ts)
    ↓
1. getUnifiedAuth(request)       — extract JWT → userId + workspaceId
2. assertAccess({ requireRole }) — RBAC check (VIEWER < MEMBER < ADMIN < OWNER)
3. setWorkspaceContext(wId)      — arm Prisma scoping middleware
4. Zod .parse() / .safeParse()  — validate request body
5. Prisma query (auto-scoped)   — DB read/write
6. handleApiError()             — catch → structured error response
    ↓
JSON response → TanStack Query cache (5min stale, 30min gc)
```

### 4.2 Loopbrain Query Flow

```
User types question in /ask
    ↓
POST /api/loopbrain/chat (or /execute-stream)
    ↓
orchestrator.ts → detect mode (spaces/org/dashboard/goals)
    ↓
intent-router.ts → classify to Q pipeline (Q1–Q9)
    ↓
Context bundling:
  - OrgSemanticSnapshotV0 (org state)
  - PM context (projects, tasks, epics)
  - Wiki context (pages, embeddings)
  - Calendar context (availability)
    ↓
context-ranker.ts → rank evidence by relevance
    ↓
OpenAI call (with prompt budget management)
    ↓
answer-envelope.v0.ts validation
    ↓
Response with: answer, confidence, constraints, risks, citations
```

### 4.3 Real-Time Updates

```
Server mutation (task/project/wiki change)
    ↓
src/lib/events/ → emit event
    ↓
Socket.IO server → broadcast to workspace room
    ↓
socket-context.tsx (client) → useSocket() / useTaskUpdates() / useWikiEditing()
    ↓
React state update → UI re-render
```

### 4.4 Caching Architecture (3-Tier)

| Tier | Technology | TTL | Purpose |
|------|-----------|-----|---------|
| **L1** | TanStack Query (client) | 5min stale / 30min gc | UI responsiveness, deduplication |
| **L2** | Redis (server) | 5s–24h configurable | Cross-request caching, workspace data |
| **L3** | In-memory Map (fallback) | 5min default, 1000 entries max | When Redis unavailable |

Cache keys: `WIKI_PAGES`, `PROJECTS`, `TASKS`, `AI_CONTEXT`, `USER_STATUS`, `WORKSPACE_DATA`, `PERMISSIONS`, `ORG_POSITIONS`, `FAVORITES`, `SEARCH_RESULTS`, `CALENDAR_EVENTS`, `AUDIT_LOGS`, `ANALYTICS`, `FEATURE_FLAGS`.

Invalidation: `cache.invalidateWorkspace(wId)` for bulk, `cache.invalidatePattern(glob)` for targeted.

---

## 5. Schema Overview (168 Models)

### By Domain

| Domain | Model Count | Key Models |
|--------|-------------|------------|
| **Auth & Workspace** | 8 | User, Account, Session, Workspace, WorkspaceMember, OrgCustomRole |
| **Org Structure** | 14 | OrgDepartment, OrgTeam, OrgPosition, OrgInvitation, JobDescription, RoleCard |
| **People & Capacity** | 20 | PersonAvailability, PersonSkill, PersonManagerLink, CapacityContract, DecisionDomain |
| **Intelligence & Analytics** | 29 | OrgIntelligenceSnapshot, OrgHealthSnapshot, OrgHealthSignal, ProactiveInsight, LoopbrainSession |
| **Projects & Tasks** | 18 | Project, Task, Epic, Milestone, ProjectSpace, CustomFieldDef/Val, ProjectTemplate |
| **Goals & Performance** | 17 | Goal, Objective, KeyResult, GoalCheckIn, PerformanceCycle, PerformanceReview |
| **Wiki** | 11 | WikiPage, WikiTemplate, WikiVersion, WikiChunk, WikiComment, WikiEmbed |
| **1:1s** | 5 | OneOnOneSeries, OneOnOneMeeting, OneOnOneTalkingPoint, OneOnOneActionItem |
| **Content & Comms** | 7 | ChatSession, ChatMessage, Todo, PersonalNote, Notification |
| **Loopbrain Core** | 4 | LoopbrainPolicy, PolicyExecution, PolicyActionLog, LoopbrainPendingAction |
| **Context & Embeddings** | 3 | ContextItem, ContextEmbedding, ContextSummary |
| **Onboarding** | 4 | OnboardingTemplate, OnboardingTask, OnboardingPlan, OnboardingProgress |
| **Work Management** | 11 | WorkRequest, WorkImpact, DecisionDomain, DecisionAuthority, ResponsibilityTag |
| **Integrations** | 2 | Integration, LeaveRequest |
| **Workflows** | 4 | Workflow, WorkflowInstance, WorkflowAssignment, Migration |
| **Other** | 11 | FeatureFlag, BlogPost, Activity, Space, SpaceMember, etc. |

### Key Relationships

```
Workspace ──< WorkspaceMember >── User
Workspace ──< OrgDepartment ──< OrgTeam ──< OrgPosition
OrgPosition ──< PersonManagerLink >── OrgPosition (hierarchy)
Workspace ──< Project ──< Task
Workspace ──< Project ──< Epic ──< Task
Project ──< ProjectGoalLink >── Goal
Workspace ──< WikiPage (workspace-scoped, RLS-protected)
Workspace ──< Goal ──< Objective ──< KeyResult
Workspace ──< LoopbrainPolicy ──< PolicyExecution
Workspace ──< Integration (Slack/Gmail/Drive tokens)
```

---

## 6. Shared Infrastructure

### 6.1 Provider Stack (Client)

```
SessionProvider (NextAuth)
  → QueryClientProvider (TanStack Query)
    → UserStatusProvider (centralized auth state from JWT)
      → ConditionalThemeProvider
        → AuthWrapper (auth guard)
          → WorkspaceProvider (workspace selection + permissions)
            → SocketWrapper (real-time — Socket.IO or mock)
              → KeyboardShortcutsWrapper
                → [DataPrefetcher, CommandPalette, Toaster]
```

### 6.2 Route Protection (Middleware)

`src/middleware.ts` protects: `/home`, `/projects`, `/wiki`, `/todos`, `/settings`, `/ask`, `/org`, `/goals`, `/spaces`, `/one-on-ones`.

Onboarding gates: no workspace → `/onboarding/1`, incomplete → `/onboarding/1`. JWT carries `isFirstTime` flag.

### 6.3 RBAC

| Level | Value | Typical Access |
|-------|-------|---------------|
| VIEWER | 1 | Read own profile, tasks, workspace content |
| MEMBER | 2 | Create/edit content, use AI/Loopbrain |
| ADMIN | 3 | Manage org structure, invite members, settings |
| OWNER | 4 | Manage roles, delete workspace |

Manager-scoped: `assertManagerOrAdmin()` checks ADMIN+ first, then `OrgPosition.parentId`.

### 6.4 Multi-Tenant Workspace Scoping

- `scopingMiddleware.ts` intercepts Prisma queries, injects `workspaceId` filters
- **152 models** registered in `WORKSPACE_SCOPED_MODELS`
- Middleware controlled by `WORKSPACE_SCOPING_ENABLED` env var (default: false)
- Application-layer: manual `where: { workspaceId }` is primary defense
- `prismaUnscoped` available for auth operations without workspace context

### 6.5 Event System

`src/lib/events/` — `activityEvents.ts`, `orgEvents.ts`, `emit.ts`, `init.ts`

Events: task CRUD, project CRUD, wiki page updates, comment CRUD, user presence (join/leave/away).

---

## 7. Divergences: Audit Docs vs. Live Code

| Metric | CLAUDE.md / Feb 24 Audit | Live (Mar 9) | Delta |
|--------|--------------------------|--------------|-------|
| **API routes** | 439 | 498 | **+59** (policies, loopbrain org, drive, cron, performance, one-on-ones) |
| **Prisma models** | 162 | 168 | **+6** (LoopbrainPolicy, PolicyExecution, PolicyActionLog, LoopbrainPendingAction, plus others) |
| **WORKSPACE_SCOPED_MODELS** | 122 | 152 | **+30** (new policy, performance, one-on-one models added) |
| **Loopbrain files** | "120 files" (audit) | 102 | Audit over-counted (likely included test fixtures or counted nested) |
| **Org API routes** | ~120 (audit estimate) | 184 | **+64** (people subroutes, work requests, data quality, role cards expanded) |
| **Dashboard pages** | Not tracked | 70 | First count |

### Notable New Modules (not in Feb 24 audit)

1. **Policies engine** — `LoopbrainPolicy`, `PolicyExecution`, `PolicyActionLog` models + 7 API routes + cron job
2. **Google Drive integration** — 4 API routes, full read/write/search lib
3. **Gmail integration** — 8 API routes, watch/sync/send
4. **Performance module** — 7 API routes, review cycles, 1:1s
5. **One-on-Ones** — 6 API routes, series/meeting/talking-point/action-item
6. **Work requests** — `/api/org/work/requests/` (8 routes)

### Architectural Risks Carried Forward

| Risk | Status | Detail |
|------|--------|--------|
| **Orchestrator god-object** | Open | `orchestrator.ts` is 5,391 lines. Decompose into mode-specific submodules. |
| **orgId drift** | Open | ~69 routes use `const orgId = workspaceId` fallback pattern. |
| **Prisma scoping disabled** | Open | `WORKSPACE_SCOPING_ENABLED` defaults to false. Application-layer only. |
| **Activity model no workspaceId** | Open | Global across workspaces — critical isolation gap. |
| **Blog migration no auth** | Open | `POST /api/migrations/blog` has no auth check. |
| **Zod coverage low** | Open | 23% of routes validate inputs. Target 50%+. |

---

## 8. Directory Map (Key Paths)

```
src/
├── app/
│   ├── (dashboard)/w/[workspaceSlug]/   70 pages, 6 layouts
│   ├── (landing)/                        Public landing page
│   ├── api/                              498 route files
│   ├── auth/                             Login/signup pages
│   ├── onboarding/[step]/                5-step wizard
│   └── ...
├── components/
│   ├── org/          120+ files — Org UI
│   ├── wiki/          38+ files — Wiki editor & AI
│   ├── ui/            38+ files — shadcn/ui primitives
│   ├── loopbrain/     14+ files — AI panel
│   ├── goals/         Goal management
│   ├── projects/      Project views
│   ├── tasks/         Task lists
│   ├── calendar/      Calendar display
│   ├── one-on-ones/   1:1 management
│   ├── assistant/     AI chat
│   ├── layout/        Headers, sidebars
│   ├── settings/      Settings UI
│   ├── realtime/      4 files — presence indicators
│   └── providers.tsx  Root provider stack
├── lib/
│   ├── loopbrain/    102 files — AI engine
│   ├── org/           76 files — Org data layer
│   ├── integrations/  12 files — Slack, Gmail, Drive, Calendar
│   ├── auth/          RBAC enforcement
│   ├── prisma/        Scoping middleware
│   ├── validations/   Zod schemas
│   ├── goals/         Goal logic
│   ├── realtime/      Socket.IO client/server
│   ├── cache.ts       Redis + in-memory
│   ├── db.ts          Prisma singleton
│   ├── unified-auth.ts Auth context
│   └── api-errors.ts  Error handling
├── server/
│   ├── org/           75+ files — Server-side org operations
│   ├── loopbrain/     Heuristics, suggestions, outcomes
│   ├── authOptions.ts NextAuth config
│   └── mailer.ts      Resend email service
└── providers/
    └── user-status-provider.tsx  Centralized auth state
```

---

## 9. Coverage Summary

> Updated March 10, 2026 from live audit. Prior estimates from Feb 24 audit were lower due to 59 new routes added since.

| Security Layer | Coverage | Denominator |
|----------------|----------|-------------|
| `getUnifiedAuth` | 85.3% | 425/498 |
| `assertAccess` | 83.3% | 415/498 |
| `setWorkspaceContext` | 80.3% | 400/498 |
| `handleApiError` | 90.5% | 447/494 (100% eligible) ✅ |
| Zod validation | 38.8% | 120/309 mutating |
| Workspace-scoped models | 90% | 152/168 |
| Genuinely unprotected routes | 0 | Fixed March 10, 2026 |

---

*Next: Feature MDs per module in `/cext/features/`.*
