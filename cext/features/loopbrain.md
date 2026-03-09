# Loopbrain Module

> Audited 2026-03-09 from live code. ~102 lib files, 37 API routes, 18 UI components.

## Purpose

AI context engine that orchestrates questions about organizational data using intent routing, context bundling, evidence-based answers, an agent executor, and a policy automation engine.

## Current State

| Feature | Status | Notes |
|---------|--------|-------|
| Orchestrator (4 core modes) | **LIVE** | spaces, org, dashboard, agent — 5,405 lines |
| Scenario handlers (8 extra) | **LIVE** | onboarding-briefing, daily-briefing, meeting-prep, email-search, slack-search, meeting-extraction, goal, project-health, workload, calendar-availability, action, plan-execution |
| Intent router | **LIVE** | Pure keyword heuristics (no LLM), 25+ intent types |
| Q1–Q9 pipelines | **LIVE** | All implemented. Q3/Q4 in `reasoning/` (org-specific, 1,605L combined) |
| Canonical contracts | **LIVE** | 12 files — answer-envelope, blockers, questions, project-health, workload, calendar, etc. |
| Agent system | **LIVE** | Planner (LLM) → Executor → Tool Registry. Write tools require confirmation. |
| Drive tools | **LIVE** | search, read, create, update via `agent/tools/drive/` |
| Context sources | **LIVE** | Calendar (969L), capacity (648L), Gmail (631L+166L), Slack (690L+245L), PM (395L) |
| Policy engine | **LIVE** | Compiler → executor → scheduler → event-matcher. 7 API routes + cron. |
| Permissions | **LIVE** | Role-based tool gating, context filtering, hierarchy checks, resource ACLs |
| Indexing | **LIVE** | 7 entity builders (org, project, task, epic, page, time-off, leave-request) |
| Embedding service | **LIVE** | OpenAI text-embedding-3-small (1536 dim). pgvector search PLACEHOLDER. |
| Settings UI | **LIVE** | Policy editor (654L), execution history (278L), policy list (318L) |
| Proactive insights | **LIVE** | Contract defined (627L), API routes for generation + dismissal |

## Key Files

### Orchestrator & Routing
- `src/lib/loopbrain/orchestrator.ts` (5,405L) — Main dispatcher: `runLoopbrainQuery()`, `callLoopbrainLLM()`, 12+ mode handlers
- `src/lib/loopbrain/intent-router.ts` — Deterministic intent classification → `RouteDecision` with mode, anchors, confidence

### Q Pipelines
- `src/lib/loopbrain/q1.ts` (33L) — "Who owns this?" — reads ProjectAccountability
- `src/lib/loopbrain/q2.ts` (51L), `q5.ts` (74L), `q6.ts` (171L), `q7.ts` (116L), `q8.ts` (47L), `q9.ts` (252L)
- `src/lib/loopbrain/reasoning/q3.ts` (808L) — "Who should work on this?" — ranked candidates with constraints
- `src/lib/loopbrain/reasoning/q4.ts` (797L) — Org health reasoning

### Contracts (`src/lib/loopbrain/contract/` — 12 files, 3,540L)
- `answer-envelope.v0.ts` (45L) — Output shape: answerability, confidence, evidence, blockers
- `questions.v0.ts` (254L) — Q1–Q9 definitions with requiredSnapshotPaths, evidencePaths, blockingOn
- `blockerPriority.v0.ts` (32L) — Canonical blocker ordering (15 blockers, append-only)
- `projectHealth.v0.ts` (541L), `workloadAnalysis.v0.ts` (679L), `calendarAvailability.v0.ts` (515L), `goalIntelligence.v0.ts` (293L), `proactiveInsight.v0.ts` (627L), `entityLinks.v0.ts` (342L)
- `validateAnswerEnvelope.ts` (60L) — Zod validation

### Agent System (`src/lib/loopbrain/agent/`)
- `planner.ts` (621L) — LLM-based plan generation; outputs AgentPlan or ClarifyingQuestions
- `executor.ts` (279L) — Executes plan steps sequentially; resolves `$stepN.data.field` references
- `tool-registry.ts` (1,178L) — Central registry: READ_TOOLS + WRITE_TOOLS with Zod schemas
- `tools/drive/` — 4 files: search, read, create, update Drive documents
- `context-builder.ts` (271L), `types.ts` (157L)

### Context Sources (`src/lib/loopbrain/context-sources/`)
- `calendar.ts` (969L) — Calendar events + availability analysis
- `capacity.ts` (648L) — Org capacity planning context
- `gmail.ts` (631L) + `gmail-search.ts` (166L) — Inbox + search
- `slack.ts` (690L) + `slack-search.ts` (245L) — Channels + search
- `pm/projects.ts` (124L), `pm/tasks.ts` (160L), `pm/epics.ts` (111L)

### Policies (`src/lib/loopbrain/policies/` — 9 files, 1,090L)
- `compiler.ts` (215L) — Compiles rules to executables
- `executor.ts` (265L) — Runs compiled policies on events
- `scheduler.ts` (178L), `event-matcher.ts` (98L), `validator.ts` (110L), `suggestion-generator.ts` (163L)

### Permissions (`src/lib/loopbrain/permissions/` — 4 files, 518L)
- `index.ts` (92L) — `assertToolRole()`, `LoopbrainPermissionError`
- `context-filter.ts` (155L) — Role-based context filtering
- `hierarchy.ts` (168L) — Hierarchy access control
- `resource-acl.ts` (103L) — Resource-level ACLs

### Indexing (`src/lib/loopbrain/indexing/` — 8 files, 956L)
- `indexer.ts` (245L) — Orchestrator
- `builders/` — org (284L), project (70L), task (69L), epic (82L), page (71L), time-off (64L), leave-request (71L)

### UI (`src/components/loopbrain/` — 14 files, 4,118L)
- `assistant-panel.tsx` (1,252L) — Main chat panel with plan confirmation and execution streaming
- `execution-progress.tsx` (428L) — SSE execution progress display
- `ProjectHealthCard.tsx` (432L), `MeetingTaskReview.tsx` (309L), `OnboardingBriefing.tsx` (282L), `MeetingPrepBrief.tsx` (225L)
- `assistant-context.tsx` (194L) — React Context provider
- `clarifying-questions.tsx` (153L), `plan-confirmation.tsx` (151L), `BlockedAnswerNotice.tsx` (115L)

### Settings UI (`src/components/settings/loopbrain/` — 4 files, 1,352L)
- `policy-editor.tsx` (654L), `policy-list.tsx` (318L), `execution-history.tsx` (278L), `SuggestionCard.tsx` (102L)

## Data Models

**Loopbrain Core:** LoopbrainPolicy, PolicyExecution, PolicyActionLog, LoopbrainPendingAction

**Analytics/Config:** OrgLoopBrainConfig, OrgLoopBrainRollout, LoopBrainModel, LoopBrainFeedback, LoopBrainOutcome, OrgLoopbrainQuery, OrgLoopbrainQueryLog, OrgQnaLog, LoopbrainUserProfile, LoopbrainChatFeedback, LoopbrainOpenLoop, LoopbrainSession, ProactiveInsight

**Context:** ContextItem, ContextEmbedding, ContextSummary

**Chat:** ChatSession, ChatMessage

## API Routes — 37 route.ts files

| Group | Routes | Key Endpoints |
|-------|--------|---------------|
| Chat/Execute | 2 | `POST /loopbrain/chat`, `POST /loopbrain/execute-stream` (SSE) |
| Q Pipelines | 7 | `/loopbrain/q1` through `/loopbrain/q9` |
| Capacity/Workload | 5 | `/loopbrain/capacity/[userId]`, `/loopbrain/workload/[userId]`, `/loopbrain/availability` |
| Project Health | 2 | `/loopbrain/project-health`, `/loopbrain/project-health/[projectId]` |
| Org-specific | 13 | `/loopbrain/org/ask`, `/loopbrain/org/q3`, `/loopbrain/org/q4`, `/loopbrain/org/context/*`, `/loopbrain/org/qa/*`, `/loopbrain/org/qna/*` |
| Infrastructure | 8 | `/loopbrain/context`, `/loopbrain/entity-graph`, `/loopbrain/search`, `/loopbrain/feedback`, `/loopbrain/insights/*`, `/loopbrain/index-health`, `/loopbrain/actions` |

All routes follow: `getUnifiedAuth → assertAccess (MEMBER+) → setWorkspaceContext → handler`.

## Loopbrain Integration (Self)

Loopbrain consumes data from every other module:

| Source | Mechanism | Data |
|--------|-----------|------|
| **Org** | `OrgSemanticSnapshotV0` + `buildOrgLoopbrainContextBundle()` | Readiness, coverage, roles, capacity, issues |
| **Projects** | `context-sources/pm/projects.ts` | Project list, status, members |
| **Tasks** | `context-sources/pm/tasks.ts` | Task status, assignees, priorities |
| **Epics** | `context-sources/pm/epics.ts` | Epic progress, linked tasks |
| **Wiki** | Indexing (`builders/page.ts`) + embedding search | Page content, embeddings |
| **Calendar** | `context-sources/calendar.ts` (969L) | Events, availability windows |
| **Gmail** | `context-sources/gmail.ts` + `gmail-search.ts` | Inbox, search results |
| **Slack** | `context-sources/slack.ts` + `slack-search.ts` | Channels, messages, search |
| **Drive** | `agent/tools/drive/` (4 tools) | File search, read, create, update |

## Known Gaps

| Gap | Severity | Location |
|-----|----------|----------|
| Orchestrator god-object | P1 | `orchestrator.ts` — 5,405 lines, 12+ handlers. Needs decomposition. |
| pgvector search is PLACEHOLDER | P1 | `store/embedding-repository.ts:7` — vector search stubbed |
| Calendar event model doesn't exist | P2 | `context-sources/capacity.ts:250` — calendar events placeholder |
| 5 contracts missing Zod validation | P2 | `proactiveInsight.v0.ts:617`, `calendarAvailability.v0.ts:506`, `entityLinks.v0.ts:333`, `projectHealth.v0.ts:533`, `workloadAnalysis.v0.ts:671` |
| Epic context inline-loaded | P2 | `orchestrator.ts:1314` — temporary fix, needs refactor back to `getProjectEpicsContext` |
| Bulk reassign re-indexing missing | P2 | `tool-registry.ts:1006` — TODO: re-index affected tasks |
| Prompt budget tuning | P3 | `prompt-budgets.ts` — hardcoded limits (12 context objects, 6 retrieved, 900 chars/object) |

## Dependencies

**Foundation:** `db.ts`, `unified-auth.ts`, `assertAccess.ts`, `scopingMiddleware.ts`, `api-errors.ts`, `cache.ts`

**External:** OpenAI API (chat + embeddings), pgvector (when enabled)

**Internal modules consumed:** Org (snapshot + context), Projects, Tasks, Epics, Wiki, Calendar, Gmail, Slack, Drive

## Integration Points

| Consumer | How | What |
|----------|-----|------|
| **Ask page** (`/ask`) | `POST /loopbrain/chat` | Main user-facing Q&A |
| **Dashboard** | `/loopbrain/insights` | Proactive insight cards |
| **Org Intelligence** | `/loopbrain/org/ask`, Q3, Q4 | Org-specific questions |
| **Projects** | `/loopbrain/project-health/[id]` | Project health scoring |
| **Settings** | Policy editor UI | Policy CRUD + execution history |
| **Cron** | `/api/cron/insights`, `/api/cron/policies` | Scheduled insight generation + policy runs |
| **Onboarding** | `handleOnboardingBriefingMode()` | Post-setup briefing |
