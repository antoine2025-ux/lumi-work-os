# LOOPWELL CODEBASE AUDIT

**Generated:** 2026-02-08
**Branch:** `integration/merge-stabilized`
**Codebase Size:** ~12 MB source, ~1,599 TypeScript/TSX files, 125 Prisma models, 379 API routes

---

## 1. FEATURE INVENTORY

### 1.1 Dashboard

**Status:** ~95% complete

**Pages:**
- `src/app/home/page.tsx` — Main home dashboard
- `src/app/(dashboard)/dashboard-original/page.tsx` — Original layout
- `src/app/(dashboard)/dashboard-minimal/page.tsx` — Minimal layout
- `src/app/(dashboard)/dashboard-grid/page.tsx` — Grid layout
- `src/app/(dashboard)/dashboard-compact/page.tsx` — Compact layout
- `src/app/(dashboard)/dashboard-sidebar/page.tsx` — Sidebar layout

**Components:**
- `src/components/dashboard/meetings-card.tsx` — Google Calendar integration
- `src/components/dashboard/todays-todos-card.tsx` — Daily todos widget
- SVG-based circular progress gauges for todo/task completion

**Database Models:**
- No dedicated dashboard models; aggregates from `Task`, `Project`, `WikiPage`, `Todo`

**API Routes:**
- `GET /api/dashboard/bootstrap` — Single bootstrap endpoint for all dashboard data

**Data Shown:**
- Task summary metrics (total, todo, in-progress, done, overdue)
- Recent wiki pages
- Active projects with status badges
- Today's todos and meetings
- Completion percentages

**What's Missing:**
- `src/app/(dashboard)/w/[workspaceSlug]/page.tsx` contains TODO: "Move dashboard content here or create a shared component"
- No customizable dashboard widgets

---

### 1.2 Projects

**Status:** ~90% complete

**Pages:**
- `src/app/(dashboard)/projects/page.tsx` — Legacy redirect to `/w/[workspaceSlug]/projects`
- `src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx` — Projects list (grid/list views, filtering, search)
- `src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/page.tsx` — Project detail (tasks, board, epics, milestones)
- `src/app/(dashboard)/projects/new/page.tsx` — Create project
- `src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/settings/custom-fields/page.tsx` — Custom fields

**Components (src/components/projects/ — 24+ files):**
- `create-project-dialog.tsx` — Project creation workflow
- `project-header.tsx` — Project navigation & status
- `project-edit-dialog.tsx` — Edit project details
- `project-sidebar.tsx` — Navigation sidebar
- `epics-view.tsx` — Epic management
- `epic-drawer.tsx` / `task-drawer.tsx` — Detail panels
- `gantt-chart.tsx` — Gantt chart visualization
- `project-documentation-section.tsx` — Embedded docs
- `project-reports.tsx` — Reporting & analytics
- `project-daily-summaries.tsx` — Daily summaries
- `template-selector.tsx` — Project templates
- `wiki-page-selector.tsx` — Link wiki pages

**Database Models:**
- `Project` — Core project model (workspaceId scoped)
- `ProjectMember` — Team membership (no direct workspaceId)
- `ProjectAssignee` — Task assignees
- `ProjectWatcher` — Project followers
- `Task` — Tasks (workspaceId scoped)
- `Subtask` — Subtasks (no direct workspaceId)
- `TaskComment` — Comments (no direct workspaceId)
- `Epic` — Epic groupings (workspaceId scoped)
- `Milestone` — Project milestones (workspaceId scoped)
- `CustomFieldDef` / `CustomFieldVal` — Custom fields
- `ProjectDailySummary` — Daily summaries
- `ProjectDocumentation` — Embedded documentation
- `ProjectAccountability` — Ownership tracking
- `ProjectAllocation` — Capacity allocation (uses orgId, not workspaceId)
- `ProjectTemplate` — Project templates (workspaceId scoped)

**API Routes (src/app/api/projects/):**
- `route.ts` — GET/POST (list/create)
- `[projectId]/route.ts` — GET/PUT/DELETE
- `[projectId]/tasks/route.ts` — GET/POST (project tasks)
- `[projectId]/assignees/route.ts` — GET/POST
- `[projectId]/milestones/route.ts` — GET/POST
- `[projectId]/epics/route.ts` — GET/POST
- `[projectId]/custom-fields/route.ts` — GET/POST
- `[projectId]/daily-summaries/route.ts` — GET/POST
- `[projectId]/reports/route.ts` — GET
- `[projectId]/documentation/route.ts` — GET/POST

**What's Missing:**
- Project duplication (TODO at `src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/page.tsx:401`)
- Project sharing (TODO at `:408`)
- Epics, timeline, files views (TODO at `:618`)
- Kanban board has incomplete epic grouping mode

---

### 1.3 LLM Chat / Assistant (Loopbrain)

**Status:** ~90% complete

**Pages:**
- `src/app/(dashboard)/ask/page.tsx` — Legacy redirect
- `src/app/(dashboard)/w/[workspaceSlug]/ask/page.tsx` — Main Loopbrain chat interface

**Components (src/components/loopbrain/ — 7+ files):**
- `assistant-launcher.tsx` — Global floating launcher button
- `assistant-panel.tsx` — Main chat panel (29KB)
- `assistant-context.tsx` — React context provider for state
- `OrgContextSyncButton.tsx` — Org context sync trigger
- `BlockedAnswerNotice.tsx` — Refusal UI for blocked answers

**Database Models:**
- `ChatSession` — Chat sessions (workspaceId scoped)
- `ChatMessage` — Chat messages (no direct workspaceId, derived from session)
- `LoopbrainUserProfile` — User personalization preferences
- `LoopbrainChatFeedback` — User feedback/ratings
- `LoopbrainOpenLoop` — Open action items from conversations
- `ContextItem` — Stored context objects (workspaceId scoped)
- `ContextEmbedding` — Vector embeddings for semantic search
- `ContextSummary` — Context summaries

**API Routes:**
- `POST /api/loopbrain/chat` — Main orchestrator endpoint (spaces/org/dashboard modes)
- `POST /api/loopbrain/feedback` — User feedback
- `GET /api/loopbrain/context` — Context retrieval
- `POST /api/loopbrain/search` — Semantic search
- `GET/POST /api/loopbrain/q1` through `/q9` — Templated question endpoints
- `GET/POST /api/loopbrain/org/qna` — Org Q&A
- `GET /api/loopbrain/org/qna/history` — Q&A history
- `POST /api/loopbrain/org/context/sync` — Sync org context
- `POST /api/assistant/stream` — SSE streaming responses
- `GET/POST /api/assistant/sessions` — Session management
- `POST /api/assistant/message` — Message operations

**AI Providers Supported:**
- OpenAI: GPT-4 Turbo, GPT-4o Mini
- Anthropic: Claude 3.5 Sonnet
- Google: Gemini 2.5 Pro, Gemini 2.5 Flash (default)

**What's Missing:**
- Full Q3-Q9 question reasoning pipelines (Q3 is most mature)
- Orchestrator file is 138KB — some code paths may be incomplete
- Vector search is placeholder until pgvector is fully enabled

---

### 1.4 Org/HRIS

**Status:** ~85% complete (most mature feature)

**Pages (src/app/org/ — 40+ pages):**
- `page.tsx` — Org overview (summary cards, readiness banner, capacity, work, recommendations, intelligence)
- `people/page.tsx` — People directory
- `people/[personId]/page.tsx` — Person profile
- `people/new/page.tsx` — Add person
- `structure/page.tsx` — Org structure (departments, teams)
- `structure/departments/[departmentId]/page.tsx` — Department detail
- `structure/teams/[teamId]/page.tsx` — Team detail
- `chart/page.tsx` — Org chart visualization (react-d3-tree)
- `chart/departments/[departmentId]/page.tsx` — Department chart
- `decision/page.tsx` — Decision authority matrix
- `activity/page.tsx` — Activity log
- `intelligence/page.tsx` — Intelligence dashboard
- `intelligence/[section]/page.tsx` — Intelligence drilldowns
- `intelligence/snapshots/[snapshotId]/page.tsx` — Snapshot detail
- `issues/page.tsx` — Data quality issues
- `ownership/page.tsx` — Accountability/ownership tracking
- `settings/page.tsx` — Org settings
- `settings/capacity/page.tsx` — Capacity settings
- `settings/decision-authority/page.tsx` — Decision domain settings
- `settings/responsibility/page.tsx` — Responsibility profiles
- `recommendations/page.tsx` — AI recommendations
- `work/page.tsx` — Work/capacity assessment
- `work/[id]/page.tsx` — Work request detail
- `insights/page.tsx` — Analytics/insights
- `diagnostics/page.tsx` — Diagnostics tools
- `onboarding/work/page.tsx` — Onboarding flow

**Components (src/components/org/ — 131+ files):**
- Header, overview, chart, people, structure, activity, intelligence components
- Settings: MembersSection, InvitesSection, CustomRolesSection, CapacitySettingsClient, PermissionsMatrix, DangerZoneSection
- Intelligence: OrgInsightsView, SummaryCards, ChartsSection, DeptHeadcountChart, JoinTrendChart
- Capacity: CapacityOverviewCard, CapacityPeopleList, CapacityTeamView
- Work: WorkOverviewCard, WorkRequestForm, OnboardingResumeCard
- Responsibility: TagManager, ProfileEditor
- UI: OrgCard, OrgEmpty, OrgChip, OrgCtaButton, tokens.ts design tokens

**Database Models (40+ org-related models):**
- Core: `Org`, `OrgMembership`, `OrgPosition`, `OrgTeam`, `OrgDepartment`
- People: `PersonAvailability`, `PersonAvailabilityHealth`, `PersonCapacity`, `PersonManagerLink`, `ManagerProfile`, `PersonRoleAssignment`, `PersonSkill`
- Skills: `Skill`, `RoleCard`, `RoleCardSkill`
- Capacity: `CapacityContract`, `WorkAllocation`, `CapacityAllocation`, `RoleCoverage`, `CapacityThresholds`, `TeamCapacityPlan`
- Work: `WorkRequest`, `WorkImpact`, `WorkEffortDefaults`, `WorkRecommendationLog`
- Decisions: `DecisionDomain`, `DecisionAuthority`, `DecisionEscalationStep`
- Responsibility: `ResponsibilityTag`, `RoleResponsibilityProfile`, `PersonResponsibilityOverride`
- Ownership: `OwnerAssignment`, `Domain`, `SystemEntity`
- Health: `OrgHealthSnapshot`, `OrgHealthSignal`, `OrgFixEvent`, `OrgHealthDigest`
- Intelligence: `OrgIntelligenceSnapshot`, `OrgIntelligenceRecommendation`
- Audit: `OrgAuditLog`, `AuditLogEntry`
- Settings: `OrgUiPreference`, `SavedOrgView`, `OrgDefaultView`
- Taxonomy: `OrgRoleTaxonomy`, `OrgSkillTaxonomy`

**API Routes (src/app/api/org/ — 100+ routes):**
- People management (25 routes): CRUD, availability, manager, responsibilities, skills, archive/unarchive
- Capacity management (20 routes): summary, people, teams, contracts, effective, batch, health
- Structure management (15 routes): departments, teams, members, positions
- Member/invitations (20 routes): CRUD, roles, invitations lifecycle
- Intelligence/analytics (15 routes): snapshots, recommendations, signals
- Roles & permissions (10 routes): CRUD, custom roles, capabilities
- Data quality (10 routes): duplicates, merge, sync, undo
- Decision domains, ownership, activity, audit

**Library (src/lib/org/ — 76 files):**
- `data.server.ts` — Load all org data
- `deriveIssues.ts` — Detect org problems
- `insights.ts` — Generate actionable insights
- `context-db.ts` — Query org context
- `intelligence/` — 13 files for intelligence/reasoning
- `capacity/` — 9 files for capacity management
- `responsibility/` — 7 files for responsibility profiles
- `decision/` — 5 files for decision authority
- `snapshot/` — 6 files for semantic snapshots
- `impact/` — 8 files for impact analysis

**What's Missing:**
- Org chart: manager relationships, hiring status, change tracking (TODOs at `src/app/org/chart/OrgChartClient.tsx:67-72`)
- People: manager/report data, join dates, change history (TODOs at `PeoplePageClient.tsx:373-394`)
- Invite flow, CSV export, bulk assignment not implemented (`PeoplePageClient.tsx:623-964`)
- Archive/unarchive routes use generic "MEMBER" role instead of fine-grained permissions
- Org settings forms use placeholder implementations (`GeneralSettingsSection.tsx:22`)
- Add Department drawer not wired (`StructurePageActions.tsx:8`)

---

### 1.5 Calendar

**Status:** ~20% complete (read-only integration only)

**API Routes:**
- `GET /api/calendar/events` — Fetch Google Calendar events (read-only)

**Components:**
- `src/components/dashboard/meetings-card.tsx` — Dashboard meetings widget (lazy-loaded)

**Database Models:**
- None (reads directly from Google Calendar API via OAuth)

**What EXISTS:**
- Google Calendar read-only integration via NextAuth OAuth scopes (calendar.readonly)
- Event parsing with meeting link extraction (Google Meet, Zoom, Teams, Webex, GoTo)
- Recurring event pattern parsing
- Dashboard card display

**What's MISSING:**
- No dedicated calendar page
- No event creation/editing
- No calendar component (full calendar view)
- No calendar-specific database models
- No integration with task due dates
- No event<>task linking

---

### 1.6 Wiki

**Status:** ~95% complete

**Pages:**
- `src/app/(dashboard)/wiki/page.tsx` — Wiki home
- `src/app/(dashboard)/wiki/[slug]/page.tsx` — Wiki page detail
- `src/app/(dashboard)/wiki/new/page.tsx` — Create page
- `src/app/(dashboard)/wiki/home/page.tsx` — Home workspace
- `src/app/(dashboard)/wiki/team-workspace/page.tsx` — Team workspace
- `src/app/(dashboard)/wiki/personal-space/page.tsx` — Personal space
- `src/app/(dashboard)/wiki/workspace/[id]/page.tsx` — Workspace view
- `src/app/(dashboard)/wiki/search/page.tsx` — Wiki search
- `src/app/(dashboard)/wiki/embed-demo/page.tsx` — Embed demo

**Components (src/components/wiki/ — 20 files):**
- `wiki-layout.tsx` (68KB) — Main layout & editor
- `rich-text-editor.tsx` (31KB) — Core editor
- `enhanced-rich-text-editor.tsx` — Enhanced version
- `tiptap-editor.tsx` — TipTap integration
- `wiki-ai-assistant.tsx` (75KB) — AI writing assistant
- `wiki-search.tsx` — Full-text search
- `wiki-navigation.tsx` — Nav sidebar
- `version-history.tsx` — Version control
- `embed-content-renderer.tsx` — Embed rendering
- `autosave-status.tsx` — Autosave indicator

**Database Models:**
- `WikiPage` — Pages (workspaceId scoped)
- `WikiChunk` — Content chunks for semantic search (workspaceId scoped)
- `WikiVersion` — Version history (no direct workspaceId)
- `WikiComment` — Comments (no direct workspaceId)
- `WikiEmbed` — Embedded content (no direct workspaceId)
- `WikiAttachment` — File attachments (no direct workspaceId)
- `WikiPagePermission` — Access control (no direct workspaceId)
- `WikiFavorite` — Bookmarks (no direct workspaceId)
- `WikiAiInteraction` — AI interactions (no direct workspaceId)
- `WikiPageView` — View tracking (no direct workspaceId)

**API Routes (src/app/api/wiki/):**
- `pages/route.ts` — GET/POST (list/create with caching, pagination)
- `pages/[id]/route.ts` — GET/PUT/DELETE
- `pages/[id]/versions/route.ts` — GET (version history)
- `pages/[id]/favorite/route.ts` — POST (toggle)
- `pages/[id]/upgrade/route.ts` — POST
- `search/route.ts` — GET (semantic search)
- `workspaces/route.ts` — GET
- `recent-pages/route.ts` — GET
- `favorites/route.ts` — GET/POST
- `favorites/check/route.ts` — GET
- `page-counts/route.ts` — GET

**What's Missing:**
- Wiki page CRUD lacks Zod validation (manual validation only)
- Many wiki-related models lack direct workspaceId (rely on parent WikiPage)

---

### 1.7 Todos

**Status:** ~90% complete (recently unified with tasks)

**Pages:**
- `src/app/(dashboard)/todos/page.tsx` — Main todos view
- `src/app/(dashboard)/my-tasks/page.tsx` — My tasks view

**Components (src/components/todos/ — 8 files):**
- `todo-list.tsx` — List display
- `todo-item.tsx` — Individual todo item
- `todo-quick-add.tsx` — Quick add
- `create-todo-dialog.tsx` — Full creation dialog (14KB)
- `todo-views-sidebar.tsx` — View sidebar
- `project-todos-section.tsx` — Project context
- `task-todos-section.tsx` — Task context

**Database Models:**
- `Todo` — Todo items (workspaceId scoped)
- Anchor types: NONE, PROJECT, TASK, PAGE (linking to parent entities)

**API Routes:**
- `GET/POST /api/todos` — List/create (Zod validation, view-based filtering)
- `GET/PUT/DELETE /api/todos/[id]` — CRUD
- `GET /api/my-tasks` — Alias for personal tasks

**Views:** my, assignedToMe, assignedByMe, created, completed
**Schedule Filters:** today, inbox, upcoming, thisWeek, all
**Features:** Timezone-aware date filtering, quick add, subtasks support

**What's Missing:**
- Recently unified with tasks (git: `dda6a35`), may have integration gaps

---

## 2. DATA MODELS & RELATIONSHIPS

### 2.1 Complete Model Inventory (125 models)

#### Core Identity & Auth
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `User` | No | Global user identity |
| `Account` | No | OAuth accounts (NextAuth) |
| `Session` | No | Auth sessions (NextAuth, unused with JWT) |
| `VerificationToken` | No | Email verification (NextAuth) |

#### Workspace & Membership
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `Workspace` | N/A | Top-level tenant |
| `WorkspaceMember` | Yes | User↔Workspace join |
| `WorkspaceInvite` | Yes | Invitation tokens |

#### Organization
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `Org` | No | Org entity (parallel to Workspace) |
| `OrgMembership` | No | orgId-based |
| `OrgPosition` | Yes | Positions within org |
| `OrgTeam` | Yes | Teams |
| `OrgDepartment` | Yes | Departments |
| `OrgInvitation` | No | orgId-based |
| `OrgAuditLog` | Yes | Audit trail |

#### People & Skills
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `PersonAvailability` | Yes | Time-off/availability |
| `PersonAvailabilityHealth` | Yes | Availability status |
| `PersonCapacity` | No | orgId-based |
| `PersonManagerLink` | Yes | Manager relationships |
| `ManagerProfile` | No | orgId-based |
| `PersonRoleAssignment` | No | orgId-based |
| `PersonSkill` | Yes | Skill assignments |
| `Skill` | Yes | Skill definitions |
| `RoleCard` | Yes | Role definitions |
| `RoleCardSkill` | No | Should inherit from RoleCard |
| `OrgRoleTaxonomy` | No | orgId-based |
| `OrgSkillTaxonomy` | No | orgId-based |

#### Capacity & Work
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `CapacityContract` | Yes | Weekly capacity definitions |
| `WorkAllocation` | Yes | Committed work allocations |
| `CapacityAllocation` | No | orgId-based (older model) |
| `CapacityThresholds` | Yes | Alert thresholds |
| `TeamCapacityPlan` | Yes | Team demand planning |
| `RoleCoverage` | Yes | Backup personnel |
| `WorkRequest` | Yes | Work intake requests |
| `WorkImpact` | Yes | Impact declarations |
| `WorkEffortDefaults` | Yes | T-shirt sizing defaults |
| `WorkRecommendationLog` | Yes | Recommendation history |
| `ProjectAllocation` | No | Uses orgId instead of workspaceId |

#### Decisions & Responsibility
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `DecisionDomain` | Yes | Decision area definitions |
| `DecisionAuthority` | No | **Should have** (domain has workspaceId) |
| `DecisionEscalationStep` | No | **Should have** (authority→domain chain) |
| `ResponsibilityTag` | Yes | Work type tags |
| `RoleResponsibilityProfile` | Yes | Role↔tag mapping |
| `PersonResponsibilityOverride` | Yes | Person-level overrides |

#### Ownership & Structure
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `OwnerAssignment` | Yes | Entity ownership |
| `Domain` | No | orgId-based |
| `SystemEntity` | No | orgId-based |
| `Role` | No | orgId-based |
| `RoleResponsibility` | No | Scoped responsibilities |

#### Health & Intelligence
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `OrgHealthSnapshot` | No | orgId-based |
| `OrgHealthSignal` | No | orgId-based |
| `OrgFixEvent` | No | orgId-based |
| `OrgHealthDigest` | No | orgId-based |
| `OrgIntelligenceSnapshot` | Yes | Intelligence snapshots |
| `OrgIntelligenceRecommendation` | Yes | AI recommendations |
| `SavedOrgView` | No | orgId-based |
| `OrgDefaultView` | No | orgId-based |
| `OrgUiPreference` | Yes | UI preferences |
| `AuditLogEntry` | No | orgId-based |

#### Projects
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `Project` | Yes | Core project |
| `ProjectMember` | No | **Should have** (project has workspaceId) |
| `ProjectWatcher` | No | **Should have** |
| `ProjectAssignee` | No | **Should have** |
| `ProjectDocumentation` | No | **Should have** |
| `ProjectAccountability` | No | **Should have** |
| `ProjectDailySummary` | No | **Should have** |
| `ProjectTemplate` | Yes | Templates |
| `ProjectSpace` | Yes | Project spaces |
| `ProjectSpaceMember` | No | Derived from ProjectSpace |

#### Tasks
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `Task` | Yes | Core task |
| `Subtask` | No | **Should have** (task has workspaceId) |
| `TaskComment` | No | **Should have** |
| `TaskHistory` | No | **Should have** |
| `TaskTemplate` | Yes | Templates |
| `TaskTemplateItem` | No | **Should have** |
| `CustomFieldDef` | No | **Should have** |
| `CustomFieldVal` | No | **Should have** |
| `Epic` | Yes | Epic groupings |
| `Milestone` | Yes | Milestones |

#### Wiki
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `WikiPage` | Yes | Pages |
| `WikiChunk` | Yes | Content chunks |
| `WikiVersion` | No | **Should have** |
| `WikiComment` | No | **Should have** |
| `WikiEmbed` | No | **Should have** |
| `WikiAttachment` | No | **Should have** |
| `WikiPagePermission` | No | **Should have** |
| `WikiFavorite` | No | **Should have** |
| `WikiAiInteraction` | No | **Should have** |
| `WikiPageView` | No | **Should have** |

#### Todos
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `Todo` | Yes | Todo items |

#### Chat & AI
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `ChatSession` | Yes | Chat sessions |
| `ChatMessage` | No | **Should have** (session has workspaceId) |
| `LoopbrainUserProfile` | Yes | User AI preferences |
| `LoopbrainChatFeedback` | Yes | Feedback ratings |
| `LoopbrainOpenLoop` | Yes | Open action items |

#### Context & Embeddings
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `ContextItem` | Yes | Stored context |
| `ContextEmbedding` | Yes | Vector embeddings |
| `ContextSummary` | Yes | Context summaries |

#### Integrations
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `Integration` | Yes | Generic integration records |
| `SlackIntegration` | Yes | Slack-specific config |

#### Onboarding
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `OnboardingTemplate` | Yes | Templates |
| `OnboardingPlan` | Yes | Plans |
| `OnboardingTask` | No | **Should have** |

#### Workflows & Activity
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `Workflow` | Yes | Workflow definitions |
| `WorkflowInstance` | Yes | Running instances |
| `WorkflowAssignment` | No | **Should have** |
| `Activity` | Yes | Activity feed |
| `FeatureFlag` | Yes | Feature toggles |
| `Migration` | Yes | Data migrations |

#### Blog (separate system)
| Model | workspaceId | Notes |
|-------|-------------|-------|
| `BlogPost` | No | Public blog content |
| `BlogAdmin` | No | Admin credentials |
| `NewsletterSubscriber` | No | Email subscribers |

### 2.2 Models That SHOULD Have workspaceId But Don't

**28 models identified:**

1. `WikiFavorite`, `WikiAttachment`, `WikiComment`, `WikiVersion`, `WikiPagePermission`, `WikiEmbed`, `WikiAiInteraction`, `WikiPageView` — Derived from WikiPage
2. `Subtask`, `TaskComment`, `TaskHistory` — Derived from Task
3. `CustomFieldDef`, `CustomFieldVal` — Derived from Project/Task
4. `ProjectMember`, `ProjectWatcher`, `ProjectAssignee` — Derived from Project
5. `ProjectDocumentation`, `ProjectAccountability`, `ProjectDailySummary` — Derived from Project
6. `ChatMessage` — Derived from ChatSession
7. `OnboardingTask` — Derived from template
8. `RoleCardSkill` — Derived from RoleCard
9. `TaskTemplateItem` — Derived from TaskTemplate
10. `WorkflowAssignment` — Derived from WorkflowInstance
11. `DecisionAuthority` — Derived from DecisionDomain
12. `DecisionEscalationStep` — Derived from DecisionAuthority chain
13. `ProjectAllocation` — Uses `orgId` instead of `workspaceId`

These models rely on cascading through parent relations for workspace isolation rather than having direct workspace scoping.

### 2.3 Key Relationship Chains

```
Workspace → WorkspaceMember → User
Workspace → OrgDepartment → OrgTeam → OrgPosition → User
Workspace → Project → Task → Subtask
Workspace → Project → Epic, Milestone
Workspace → WikiPage → WikiChunk, WikiVersion, WikiComment
Workspace → OnboardingTemplate → OnboardingTask
Workspace → Workflow → WorkflowInstance → WorkflowAssignment
Workspace → ContextItem → ContextEmbedding, ContextSummary
Workspace → DecisionDomain → DecisionAuthority → DecisionEscalationStep
Workspace → WorkRequest → WorkImpact
Workspace → ResponsibilityTag → RoleResponsibilityProfile
Workspace → CapacityContract, WorkAllocation (per person)
Workspace → PersonManagerLink (person ↔ manager)
```

### 2.4 Dual Scoping Systems

The codebase has two parallel scoping patterns:

1. **workspaceId-based** (newer pattern): `OrgTeam`, `OrgDepartment`, `Task`, `Project`, capacity models, etc.
2. **orgId-based** (older pattern): `OrgMembership`, `PersonCapacity`, `CapacityAllocation`, `Domain`, `SystemEntity`, health snapshots, etc.

This represents an ongoing migration from org-based to workspace-based scoping. `OrgInvitation` can be either.

---

## 3. LOOPBRAIN CURRENT STATE

### 3.1 Canonical Contracts

**Location:** `src/lib/loopbrain/contract/`

| File | Purpose |
|------|---------|
| `questions.v0.ts` | 6 canonical org questions with required paths, evidence paths, blockers |
| `answer-envelope.v0.ts` | Machine-enforced answer output shape (LoopbrainAnswerEnvelopeV0) |
| `blockerPriority.v0.ts` | Ordered list of 7 org readiness blockers |
| `refusalActions.v0.ts` | Blocker → next-action mapping with deepLinks |
| `refusalCopy.v0.ts` | Blocker → human-readable label/description |
| `validateAnswerEnvelope.ts` | AJV JSON Schema validation for answer envelope |

**Answer Envelope Structure:**
```typescript
type LoopbrainAnswerEnvelopeV0 = {
  schemaVersion: "v0"
  generatedAt: string           // ISO timestamp
  questionId: string
  answerability: "ANSWERABLE" | "BLOCKED"
  answer: { summary: string; details?: string[] } | null
  confidence: number            // 0.0–1.0
  supportingEvidence: { path: string; value: EvidenceValue }[]
  blockingFactors: OrgReadinessBlocker[]
  recommendedNextActions: { label: string; deepLink?: string }[]
  warnings?: string[]
  snapshotHash?: string
}
```

**Invariants:**
- `answer === null` iff `answerability === "BLOCKED"`
- `supportingEvidence.length > 0` iff `answerability === "ANSWERABLE"`
- `confidence ≤ 0.3` when BLOCKED; `≥ 0.4` when ANSWERABLE
- `blockingFactors` sorted by `BLOCKER_PRIORITY_V0`

### 3.2 Question Types Defined

**Canonical V0 Questions (6):**

| ID | Question | Required Paths | Blocking On |
|----|----------|----------------|-------------|
| `can-we-take-on-new-work` | Compare capacity vs work | capacity.pctConfigured, work.openCount | CAPACITY_COVERAGE_BELOW_MIN |
| `who-decides-pricing` | Decision domain lookup | decisions.domains | NO_DECISION_DOMAINS |
| `where-structurally-overloaded` | Capacity/severity analysis | capacity, severity | CAPACITY_COVERAGE_BELOW_MIN |
| `ownership-clean` | Ownership coverage % | ownership.coveragePct | OWNERSHIP_INCOMPLETE |
| `responsibility-profiles-complete` | Role profile coverage | responsibility.profileCoveragePct | RESPONSIBILITY_PROFILES_MISSING |
| `work-baseline-established` | Stable work baseline | work.totalCount | WORK_CANNOT_EVALUATE_BASELINE |

**Legacy Questions (Q1-Q9):**

| Q# | Purpose | Implementation Status |
|----|---------|----------------------|
| Q1 | "Who owns this?" | Implemented (`q1.ts`) |
| Q2 | "Who decides this?" | Implemented (`q2.ts`) |
| Q3 | "Who should be working on this?" | Mature 6-step reasoning pipeline (`reasoning/q3.ts`) |
| Q4 | Decision candidates | Exists (`reasoning/q4.ts`) |
| Q5 | Availability/time-off | Implemented (`q5.ts`) |
| Q6 | Backup owner candidates | Implemented (`q6.ts`) |
| Q7 | Owner/decision alignment | Implemented (`q7.ts`) |
| Q8 | Ownership clarity | Implemented (`q8.ts`) |
| Q9 | "Should we proceed?" | Implemented (`q9.ts`) |

**Org QA Smoke Test Questions (7):**
1. "Who leads the Platform team?" → `org.person`
2. "Who reports to the Head of Engineering?" → `org.person`
3. "Which people are in the AI & Loopbrain Team?" → `org.team`
4. "Which teams are part of the Engineering department?" → `org.department`
5. "What roles exist in the Engineering department?" → `org.department`
6. "Are there any single-person teams?" → `org.org`
7. "Which manager has the most direct reports?" → `org.org`

### 3.3 Intent Routing

**File:** `src/lib/loopbrain/org-question-types.ts`

**Question Types:**
- `org.person` — Person-specific questions
- `org.team` — Team membership/composition
- `org.department` — Department structure
- `org.role` — Role definitions/responsibilities
- `org.org` — Org-wide health, gaps
- `org.health` — Health scoring/risk analysis

**Inference Logic (`inferOrgQuestionTypeFromRequest`):**
1. Check explicit context: personId → `org.person`, teamId → `org.team`, roleId → `org.role`
2. Keyword heuristic: "reports to"/"manager" → `org.person`, "team"/"members" → `org.team`, etc.

**Org Detection (`src/lib/loopbrain/org/isOrgQuestion.ts`):**
- Explicit mode override from caller
- Keyword heuristic on 20+ org-related terms

### 3.4 Context Bundling

**Context Engine (`src/lib/loopbrain/context-engine.ts`):**

Methods:
- `getWorkspaceContext(workspaceId)` → workspace metadata
- `getPageContext(pageId, workspaceId)` → wiki page with chunks
- `getProjectContext(projectId, workspaceId)` → project with tasks/epics
- `getTaskContext(taskId, workspaceId)` → task with subtasks/comments
- `getOrgContext(workspaceId)` → org structure
- `getActivityContext(workspaceId)` → recent activity
- `getUnifiedContext(params)` → combined context

**Org Context Bundle (`src/lib/loopbrain/org/buildOrgLoopbrainContextBundle.ts`):**

```typescript
OrgLoopbrainContextBundle = {
  primary: OrgLoopbrainContextObject | null  // org root node
  related: OrgLoopbrainContextObject[]        // depts, teams, roles, people
  byId: Record<string, OrgLoopbrainContextObject>  // fast lookup
}
```

Entity types: `org`, `department`, `team`, `role`, `person`
Relations: `reports_to`, `member_of_team`, `member_of_department`, etc.

**Org Prompt Builder (`src/lib/loopbrain/org/buildOrgPromptSection.ts`):**
Converts bundle to LLM-friendly `<ORG_GRAPH>` format with sections for departments, teams, people, and relation edges.

### 3.5 Features Currently Integrated

**Loopbrain integrations found across 50+ files:**

- **Org module:** Full integration — context sync, Q&A, semantic snapshots, health assessment
- **Projects:** `upsertProjectContext()` fire-and-forget on project create/update
- **Tasks:** `upsertTaskContext()` fire-and-forget on task create/update
- **Wiki:** Context retrieval for wiki pages, semantic search via embeddings
- **Dashboard:** Dashboard mode for aggregate insights
- **Slack:** Context extraction from Slack channels, send-to-Slack capability
- **Personalization:** User profile preferences, feedback-driven adjustments

---

## 4. DATA FLOW ANALYSIS

### 4.1 Dashboard

| Aspect | Status |
|--------|--------|
| Data captured | Task counts, project statuses, recent pages, meetings |
| Storage | Aggregates from Task, Project, WikiPage models |
| Events/updates | None — reads on page load via bootstrap |
| Loopbrain queryable | Partially (projects, tasks) |
| Missing for Loopbrain | Dashboard-specific context bundle, user activity patterns |

### 4.2 Projects

| Aspect | Status |
|--------|--------|
| Data captured | Full CRUD: tasks, epics, milestones, members, docs, custom fields, daily summaries |
| Storage | Project, Task, Epic, Milestone, ProjectMember, etc. |
| Events/updates | Socket.io events: task.create, task.update, project.update, epic/milestone events |
| Loopbrain queryable | Yes — `upsertProjectContext()` on create/update, full context retrieval |
| Missing for Loopbrain | Project health metrics, velocity tracking, burn-down data |

### 4.3 LLM Chat / Loopbrain

| Aspect | Status |
|--------|--------|
| Data captured | Sessions, messages, feedback, open loops, user profiles |
| Storage | ChatSession, ChatMessage, LoopbrainUserProfile, LoopbrainChatFeedback, LoopbrainOpenLoop |
| Events/updates | None — direct API calls |
| Loopbrain queryable | Self-referential (IS Loopbrain) |
| Missing | Cross-session learning, conversation summarization |

### 4.4 Org/HRIS

| Aspect | Status |
|--------|--------|
| Data captured | People, teams, departments, positions, capacity, availability, skills, decisions, work requests |
| Storage | 40+ models (see §2) |
| Events/updates | `logOrgAuditEvent()` on mutations, org health signals |
| Loopbrain queryable | Yes — deepest integration (semantic snapshots, QA, reasoning pipelines) |
| Missing for Loopbrain | Real-time org change notifications, change impact analysis |

### 4.5 Calendar

| Aspect | Status |
|--------|--------|
| Data captured | Google Calendar events (read-only) |
| Storage | None (direct API reads) |
| Events/updates | None |
| Loopbrain queryable | No |
| Missing for Loopbrain | Calendar context source, meeting<>person linking, availability inference |

### 4.6 Wiki

| Aspect | Status |
|--------|--------|
| Data captured | Pages, versions, chunks, comments, favorites, views, AI interactions |
| Storage | WikiPage + 9 related models |
| Events/updates | Socket.io: page updates, editing presence, cursor tracking |
| Loopbrain queryable | Yes — semantic search via embeddings, page context retrieval |
| Missing for Loopbrain | Knowledge graph relationships, cross-page linking context |

### 4.7 Todos

| Aspect | Status |
|--------|--------|
| Data captured | Title, description, status, priority, schedule, anchor (project/task/page) |
| Storage | Todo model |
| Events/updates | None found |
| Loopbrain queryable | Recently unified with tasks via `dda6a35` commit |
| Missing for Loopbrain | Todo completion patterns, workload analysis |

---

## 5. API SURFACE

### 5.1 Route Count by Feature Area

| Area | Routes | Auth Pattern |
|------|--------|-------------|
| Org (all sub-areas) | ~150 | Mixed: getUnifiedAuth + getOrgContext |
| Loopbrain | ~100 | getUnifiedAuth + assertAccess |
| Projects | ~25 | assertProjectAccess (custom guard) |
| Wiki | ~11 | getUnifiedAuth + assertAccess + cache |
| Tasks | ~20 | Full standard pattern |
| Todos | ~5 | Full standard pattern + Zod |
| Assistant/AI Chat | ~20 | getUnifiedAuth + assertAccess |
| Integrations | ~15 | Mixed (Slack OAuth has no user auth) |
| Onboarding | ~15 | getUnifiedAuth + Zod |
| Workspaces | ~10 | getUnifiedAuth |
| Admin | ~5 | getUnifiedAuth + ADMIN/OWNER roles |
| Auth | ~5 | NextAuth delegation |
| Dashboard | ~2 | getUnifiedAuth |
| Calendar | ~1 | getUnifiedAuth |
| Blog | ~5 | Public or admin auth |
| Debug/Dev | ~40 | NODE_ENV check or none |
| Migrations | ~5 | Various |
| Health/Utils | ~15 | None |
| **Total** | **~379** | |

### 5.2 Pattern Compliance

**Standard Pattern (from CLAUDE.md):**
```typescript
getUnifiedAuth(request) → assertAccess() → setWorkspaceContext() → Zod → handleApiError()
```

**Routes Following Full Standard Pattern (~25%):**
- `/api/tasks/route.ts` — GET/POST with Zod (TaskCreateSchema, TaskUpdateSchema)
- `/api/todos/route.ts` — GET/POST with Zod (TodoCreateSchema)
- `/api/wiki/pages/route.ts` — GET/POST with caching + pagination
- `/api/loopbrain/chat/route.ts` — POST with mode validation
- `/api/assistant/route.ts` — POST/GET
- `/api/admin/users/route.ts` — GET/POST with ADMIN/OWNER roles
- `/api/onboarding/plans/route.ts` — GET/POST with Zod schemas

**Routes Using Alternative Auth (~15%):**
- `/api/org/members/route.ts` — Uses `getOrgContext()` + `requireEdit()`
- `/api/org/structure/departments/route.ts` — Uses `getOrgPermissionContext()` + `assertOrgCapability()`
- `/api/org/loopbrain/feedback/route.ts` — Minimal, only `getOrgContext()`

**Routes Without Auth (~10%):**
- `/api/health/route.ts` — Health check
- `/api/embeds/*` — Public metadata fetching
- `/api/blog/posts/route.ts` — Public content
- `/api/integrations/slack/callback/route.ts` — OAuth callback
- `/api/dev/*`, `/api/debug/*` — Dev-only guards

### 5.3 Zod Validation Usage

**Routes Using Zod (~25%):**
- `/api/tasks/route.ts` — TaskCreateSchema
- `/api/todos/route.ts` — TodoCreateSchema
- `/api/projects/[projectId]/route.ts` — ProjectUpdateSchema
- `/api/integrations/slack/route.ts` — storeSlackConfigSchema
- `/api/onboarding/plans/route.ts` — createPlanSchema, updatePlanSchema
- `/api/onboarding/templates/[id]/route.ts` — createTemplateSchema

**Routes NOT Using Zod (~75%):**
- Most `/api/org/*` routes — manual validation
- Most `/api/loopbrain/*` routes — manual body parsing
- `/api/wiki/pages/route.ts` — manual validation

### 5.4 Error Handling

**Using `handleApiError()` (~40%):**
- Tasks, todos, wiki, workspaces routes

**Custom Error Handling (~60%):**
- Most org routes — manual `try/catch` with `NextResponse.json({ error: ... })`
- Most loopbrain routes — custom error objects

---

## 6. INTEGRATION POINTS

### 6.1 NextAuth Configuration

**File:** `src/server/authOptions.ts` (~500 lines)

**Providers:**
- Google OAuth (production) — scopes: openid, userinfo.email, userinfo.profile, calendar.readonly
- E2E Test Credentials (development only) — requires `E2E_TEST_AUTH=true`

**Session Strategy:** JWT (stateless, no DB sessions)

**Callbacks:**
- `signIn`: Creates/updates User in Prisma, handles workspace assignment
- `jwt`: Persists userId, fetches WorkspaceMember, handles session updates
- `session`: Populates session with userId, workspaceId, role, tokens
- `redirect`: Handles OAuth callbacks with ngrok dev support

### 6.2 Slack Integration

**Status:** Fully implemented

**Files (22 files):**
- `src/lib/integrations/slack-service.ts` — Main service
- `src/app/api/integrations/slack/route.ts` — Status endpoint (GET/POST/DELETE with Zod)
- `src/app/api/integrations/slack/connect/route.ts` — OAuth connect
- `src/app/api/integrations/slack/callback/route.ts` — OAuth callback
- `src/app/api/integrations/slack/channels/route.ts` — List channels
- `src/app/api/integrations/slack/send/route.ts` — Send messages
- `src/lib/loopbrain/slack-helper.ts` — Loopbrain slack helpers
- `src/lib/loopbrain/context-sources/slack.ts` — Context extraction
- `src/lib/client-state/project-slack-hints.ts` — Project slack hints

**Features:**
- OAuth2 token management (access_token, refresh_token, expiresAt)
- Channel listing and message sending
- Slack Block Kit support with thread support (threadTs)
- Integration with Loopbrain AI context extraction
- Org health metrics computation with Slack data

### 6.3 OpenAI Integration

**Files:**
- `src/lib/ai/providers.ts` — Multi-provider AI abstraction
- `src/lib/loopbrain/embedding-service.ts` — Vector embeddings
- `src/app/api/assistant/stream/route.ts` — SSE streaming
- `src/app/api/assistant/message/route.ts` — Messages
- `src/app/api/onboarding/generate/route.ts` — AI onboarding

**Models Supported:**
- OpenAI: GPT-4 Turbo, GPT-4o Mini
- Anthropic: Claude 3.5 Sonnet (claude-sonnet-4-20250514)
- Google: Gemini 2.5 Pro, Gemini 2.5 Flash

**Loopbrain Config:**
```typescript
LOOPBRAIN_ORG_CONFIG = {
  enabledGlobally: process.env.LOOPBRAIN_ORG_ENABLED === "true" || NODE_ENV !== "production",
  model: process.env.LOOPBRAIN_ORG_MODEL || "gpt-4o-mini",
  maxTokens: 700,
  timeoutMs: 20000
}
```

### 6.4 Socket.io Implementation

**Files:**
- `src/lib/realtime/socket-server.ts` — Server setup
- `src/lib/realtime/socket-client.ts` — Client connection
- `src/lib/pm/events.ts` — Event type definitions
- `src/app/api/socketio/route.ts` — Socket endpoint

**Events Supported:**
- Task: create, update, delete, comment
- Project: update
- Epic/Milestone: create, update, delete, assignment
- Wiki: page updates, editing presence, cursor tracking
- User presence: join, leave, status updates
- Notifications: generic events
- Comments: add, update, delete

**Auth:** User authenticates with userId, userName, workspaceId

### 6.5 Redis Caching

**File:** `src/lib/cache.ts`

**Connection:** `process.env.REDIS_URL`
**Fallback:** In-memory cache when Redis unavailable

**TTL Values:**
- SHORT: 5 minutes
- MEDIUM: 30 minutes
- LONG: 1 hour
- VERY_LONG: 24 hours
- REAL_TIME: 30 seconds

### 6.6 Supabase

**Files:**
- `src/lib/supabase.ts` — Public client (anon key)
- `src/lib/supabase/admin.ts` — Server admin client (service role key)

**Purpose:** File storage and admin operations. Not used for auth (uses NextAuth).

### 6.7 Google APIs

**File:** `src/app/api/calendar/events/route.ts`

- Google Calendar API (read-only)
- Uses session.accessToken from NextAuth Google OAuth
- Extracts meeting links from events (Google Meet, Zoom, Teams, Webex, GoTo)

### 6.8 Nodemailer

**Status:** Listed as dependency but no active usage found in codebase. Email functionality appears to be missing or delegated.

---

## 7. GAPS & INCONSISTENCIES

### 7.1 Features in CLAUDE.md Not Fully Implemented

| Feature Mentioned | Actual Status |
|-------------------|---------------|
| Multi-tenant workspace scoping | Implemented but `PRISMA_WORKSPACE_SCOPING_ENABLED` feature flag is **disabled** |
| Redis caching | Implemented with fallback, but not consistently used across routes |
| Feature flags | Infrastructure exists (`FeatureFlag` model) but not fully wired (`navigation.tsx:154` TODO) |
| Nodemailer email | Listed as dependency but no active email functionality |

### 7.2 Incomplete Data Flows

1. **Calendar → Loopbrain:** No context source for calendar events
2. **Todos → Loopbrain:** Recently unified but integration may have gaps
3. **Wiki → Loopbrain:** Vector search is placeholder until pgvector fully enabled
4. **Socket.io → Loopbrain:** Real-time events not feeding into Loopbrain context
5. **Slack → Calendar:** No meeting extraction from Slack messages

### 7.3 Missing Contracts or Types

1. No Zod schemas for ~75% of API routes
2. No TypeScript types for many org API response shapes
3. `ProjectAllocation` model uses `orgId` instead of `workspaceId`
4. 28 models lack direct `workspaceId` (see §2.2)

### 7.4 Inconsistent Patterns

1. **Auth patterns:** Three competing patterns — `getUnifiedAuth()`, `getOrgContext()`, `getOrgPermissionContext()`
2. **Error handling:** Mix of `handleApiError()` and manual try/catch
3. **Scoping:** Dual orgId/workspaceId systems running in parallel
4. **Route structure:** Legacy routes (`/projects/page.tsx`) redirect to workspace-scoped routes (`/w/[slug]/projects/page.tsx`)
5. **Project auth:** Uses `assertProjectAccess()` instead of standard `assertAccess()`

### 7.5 TODOs and FIXMEs in Critical Files

| File | Line | TODO |
|------|------|------|
| `src/app/org/chart/OrgChartClient.tsx` | 67-72 | Populate manager hierarchy, hiring status, change summary, reorg detection |
| `src/app/org/people/PeoplePageClient.tsx` | 373-630 | Manager data, join dates, change history, invite flow, CSV export, bulk assignment |
| `src/app/api/tasks/[id]/comments/route.ts` | 192 | Send notifications to mentioned users |
| `src/app/api/org/people/[personId]/archive/route.ts` | 35-40 | Restrict to admin/write permissions |
| `src/app/api/org/capacity/contract/route.ts` | 178-204 | Derive actual capacity issues |
| `src/app/api/org/current/route.ts` | 13 | Implement role checking |
| `src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/page.tsx` | 401-618 | Project duplication, sharing, epics/timeline/files views |
| `src/components/tasks/task-edit-dialog.tsx` | 3 | Deprecated in favor of TaskSidebar (should be removed) |
| `src/components/org/settings/GeneralSettingsSection.tsx` | 22 | Embed real org settings forms |
| `src/app/api/workspaces/[workspaceId]/user-role/route.ts` | 9 | Remove after confirming no external dependencies |
| `src/components/layout/navigation.tsx` | 154 | Check feature flags when implemented |

---

## 8. STABLE SEAMS STATUS

### 8.1 `src/lib/db.ts`

**Status:** Healthy
**Size:** ~274 lines
**Importers:** 418 files
**Purpose:** Prisma client singleton, connection pooling, workspace scoping setup

**Key Details:**
- Detects Supabase PgBouncer and configures prepared statements
- Exports both `prisma` (scoped/unscoped based on feature flag) and `prismaUnscoped`
- Database connection verification at startup (DEV only)
- `PRISMA_WORKSPACE_SCOPING_ENABLED` feature flag controls middleware activation

**Risk:** Maximum — all database operations flow through this module.

---

### 8.2 `src/lib/unified-auth.ts`

**Status:** Healthy
**Size:** ~700 lines
**Importers:** 216 files
**Purpose:** Single entry point for all auth context

**Key Details:**
- `getUnifiedAuth()` returns `AuthContext { user, workspaceId, isAuthenticated }`
- JWT-first workspace resolution with DB fallback
- Priority-based workspace selection: URL slug > query params > header > default
- Request-level caching prevents duplicate auth queries
- `NoWorkspaceError` custom error for first-time users
- Warns if auth takes >500ms

**Risk:** Critical — all authenticated API routes depend on this.

---

### 8.3 `src/middleware.ts`

**Status:** Healthy
**Size:** ~148 lines
**Importers:** 0 (used as Next.js middleware via config)
**Purpose:** Route protection and request preprocessing

**Key Details:**
- Lightweight JWT token check (no database calls)
- Protected routes: /home, /projects, /wiki, /todos, /settings, /my-tasks, /calendar, /ask, /org
- Redirects unauthenticated users to /login
- First-time user redirect to /welcome
- Request ID injection for tracing
- Matcher excludes API, static, and image routes

**Risk:** Critical — controls all route access.

---

### 8.4 `src/server/authOptions.ts`

**Status:** Healthy
**Size:** ~500 lines
**Importers:** 30 files
**Purpose:** NextAuth configuration and callbacks

**Key Details:**
- Google OAuth + E2E Test Credentials (dev only)
- JWT session strategy
- User creation/update on signIn
- Workspace membership resolution in jwt callback
- Comprehensive error handling and logging

**Risk:** Critical — all authentication flows.

---

### 8.5 `src/lib/prisma/scopingMiddleware.ts`

**Status:** Healthy but partially disabled
**Size:** ~223 lines
**Importers:** 137 files
**Purpose:** Workspace isolation via Prisma middleware

**43 Scoped Models:**
Project, Task, Epic, Milestone, WikiPage, WikiChunk, ChatSession, ChatMessage, OrgPosition, Workflow, WorkflowInstance, OnboardingTemplate, OnboardingPlan, OnboardingTask, ProjectTemplate, TaskTemplate, TaskTemplateItem, Activity, CustomFieldDef, CustomFieldVal, TaskHistory, ProjectDailySummary, ProjectMember, ProjectWatcher, ProjectAssignee, Subtask, TaskComment, ContextItem, ContextEmbedding, ContextSummary, Integration, Migration, FeatureFlag, WikiEmbed, WikiAttachment, WikiComment, WikiVersion, WikiPagePermission, WikiFavorite, Todo

**Key Details:**
- `setWorkspaceContext(workspaceId)` — Set current workspace
- Production: Throws error if workspaceId not set for scoped models
- Development: Logs warnings but continues
- **Feature Flag:** `PRISMA_WORKSPACE_SCOPING_ENABLED` — currently **disabled**
- Defense-in-depth layer, not a replacement for `assertAccess()`

**Risk:** Medium — disabled but critical when enabled.

---

### 8.6 `prisma/schema.prisma`

**Status:** Healthy
**Size:** ~3,068 lines (99KB)
**Models:** 125
**Migrations:** 47+ in `prisma/migrations/`

**Risk:** Critical — all data model definitions.

---

## 9. TESTING COVERAGE

### 9.1 Test Files Inventory

**E2E Tests (Playwright) — 9 files:**
| File | Feature |
|------|---------|
| `tests/e2e/auth.spec.ts` | Authentication flows & session |
| `tests/e2e/auth-redirects.spec.ts` | Auth redirect logic |
| `tests/e2e/auth-snapshot.spec.ts` | Auth state snapshots |
| `tests/e2e/dashboard.spec.ts` | Dashboard UI |
| `tests/e2e/projects.spec.ts` | Project management |
| `tests/e2e/todos.spec.ts` | Todo features |
| `tests/e2e/redirect-smoke.spec.ts` | Routing redirects |
| `tests/e2e/api-projects-regression.spec.ts` | Projects API regression |
| `tests/e2e/org-routing.spec.ts` | Org routing |

**API/Unit Tests (Vitest) — 3 files:**
| File | Feature |
|------|---------|
| `tests/api/tasks.auth.spec.ts` | Task API authorization |
| `tests/api/projects.auth.spec.ts` | Project API authorization |
| `tests/api/phase1-migrated-routes.spec.ts` | Legacy route migrations |

**Loopbrain Contract Tests — 7 files:**
| File | Feature |
|------|---------|
| `tests/loopbrain/answer-envelope.contract.test.ts` | Answer envelope JSON schema |
| `tests/loopbrain/snapshot-contract.test.ts` | Snapshot contracts |
| `tests/loopbrain/orgContextBuilder.smoke.test.ts` | Context builder smoke |
| `tests/loopbrain/orgContextMapper.department.test.ts` | Department mapper |
| `tests/loopbrain/orgContextMapper.person.test.ts` | Person mapper |
| `tests/loopbrain/orgContextMapper.position.test.ts` | Position mapper |
| `tests/loopbrain/orgContextMapper.team.test.ts` | Team mapper |
| `tests/loopbrain/refusal-language.v0.test.ts` | Refusal language contracts |

**Infrastructure Tests — 2 files:**
| File | Feature |
|------|---------|
| `tests/workspace-scoping.sanity.test.ts` | Workspace scoping validation |
| `tests/events/orgEvents.test.ts` | Organization events |

**Internal Unit Tests — 1 file:**
| File | Feature |
|------|---------|
| `src/lib/loopbrain/__tests__/loopbrain.snapshots.test.ts` | Q1-Q9 snapshot tests |

**Total: 22 test files**

### 9.2 Coverage by Feature

| Feature | Unit Tests | E2E Tests | Contract Tests | Overall |
|---------|-----------|-----------|---------------|---------|
| Auth | None | 3 files | None | Moderate |
| Dashboard | None | 1 file | None | Low |
| Projects | 1 file (auth) | 2 files | None | Low |
| Tasks | 1 file (auth) | None | None | Very Low |
| Todos | None | 1 file | None | Low |
| Wiki | None | None | None | **None** |
| Calendar | None | None | None | **None** |
| Org | None | 1 file (routing) | None | Very Low |
| Loopbrain | 1 file (snapshots) | None | 7 files | Moderate |
| Workspace scoping | 1 file | None | None | Low |
| Chat/Messaging | None | None | None | **None** |
| Integrations (Slack) | None | None | None | **None** |
| Onboarding | None | None | None | **None** |
| Search | None | None | None | **None** |

### 9.3 Features Lacking Any Test Coverage

1. **Wiki/Documentation** — No tests at all
2. **Calendar** — No tests
3. **Chat/Messaging** — No tests
4. **Slack Integration** — No tests
5. **Google Calendar Integration** — No tests
6. **Socket.io Real-time** — No tests
7. **Search (full-text & semantic)** — No tests
8. **Custom Fields** — No tests
9. **Onboarding Flow** — No tests
10. **Feature Flags** — No tests
11. **Bulk Operations** — No tests
12. **Settings/Admin** — No tests
13. **Blog** — No tests
14. **Migrations/Imports** — No tests

---

## 10. LOOPBRAIN READINESS ASSESSMENT

### Rating Scale
- **Not Started** — No data, no contract, no query interface
- **In Progress** — Partial data or contract exists
- **Ready** — Full data, contract, and query interface

### Feature Readiness Matrix

| Feature | Data Completeness | Contract Definition | Query Interface | Event Emissions | Cross-Feature Links | Overall |
|---------|-------------------|--------------------|-----------------|-----------------|--------------------|---------|
| **Org/HRIS** | Ready | Ready (v0 contracts) | Ready (Q1-Q9, QA) | Ready (audit events) | Ready (people↔teams↔depts) | **Ready** |
| **Projects** | Ready | In Progress | Ready (context engine) | Ready (Socket.io) | In Progress (project↔org linking) | **In Progress** |
| **Tasks** | Ready | In Progress | Ready (context engine) | Ready (Socket.io) | In Progress (task↔person linking) | **In Progress** |
| **Wiki** | Ready | Not Started | In Progress (embeddings) | In Progress (Socket.io) | Not Started (wiki↔org linking) | **In Progress** |
| **Todos** | In Progress | Not Started | In Progress (recent unification) | Not Started | Not Started | **In Progress** |
| **Calendar** | Not Started | Not Started | Not Started | Not Started | Not Started | **Not Started** |
| **Dashboard** | In Progress | Not Started | Not Started | Not Started | Not Started | **Not Started** |
| **Chat** | In Progress | Not Started | Not Started | Not Started | Not Started | **Not Started** |
| **Slack** | Ready | Not Started | In Progress (context source) | Not Started | In Progress (Slack↔project hints) | **In Progress** |
| **Blog** | Not Started | Not Started | Not Started | Not Started | Not Started | **Not Started** |

### Detailed Assessment

**Org/HRIS — READY**
- Complete semantic snapshot (OrgSemanticSnapshotV0) with 7 readiness paths
- 6 canonical questions with evidence-based answers
- Blocker detection and refusal handling
- Full context bundling (people, teams, departments, roles, capacity, decisions)
- Audit event trail for mutations
- Intelligence snapshots and recommendations
- Few-shot examples for LLM grounding

**Projects — IN PROGRESS**
- Context objects stored via `upsertProjectContext()` (fire-and-forget)
- Project context retrieval implemented
- Missing: project health contract, velocity metrics, burn-down data
- Missing: project↔org person linkage for capacity reasoning
- Socket.io events exist but don't feed Loopbrain

**Tasks — IN PROGRESS**
- Context objects stored via `upsertTaskContext()` (fire-and-forget)
- Task context retrieval implemented
- Missing: task assignment↔person capacity linkage
- Missing: task workload patterns contract
- Socket.io events exist but don't feed Loopbrain

**Wiki — IN PROGRESS**
- WikiChunks support semantic search via embeddings
- Page context retrieval implemented
- Missing: knowledge graph contract (page relationships, cross-references)
- Missing: wiki↔org linking (who wrote what, who's expert on what)
- Vector search is placeholder until pgvector fully enabled

**Calendar — NOT STARTED**
- No context source for Loopbrain
- No meeting↔person linking
- No availability inference from calendar
- No calendar-specific contract

**Todos — IN PROGRESS**
- Recently unified with tasks (`dda6a35`)
- Loopbrain now sees "actionable items" as combined context
- Missing: workload patterns, completion analytics, scheduling intelligence
- Missing: dedicated todo contract

---

## APPENDIX: Key File Paths Quick Reference

### Stable Seams
```
src/lib/db.ts                           # Prisma client (418 importers)
src/lib/unified-auth.ts                 # Auth context (216 importers)
src/middleware.ts                       # Route protection
src/server/authOptions.ts               # NextAuth config (30 importers)
src/lib/prisma/scopingMiddleware.ts     # Workspace isolation (137 importers)
prisma/schema.prisma                    # Data model (125 models)
```

### Loopbrain Core
```
src/lib/loopbrain/orchestrator.ts       # Main orchestrator (138KB)
src/lib/loopbrain/context-engine.ts     # Context retrieval
src/lib/loopbrain/client.ts             # Client-side helper
src/lib/loopbrain/contract/             # Canonical contracts (6 files)
src/lib/loopbrain/org/                  # Org context builders
src/lib/loopbrain/reasoning/            # Q3+ reasoning pipelines
src/lib/loopbrain/personalization/      # User preferences
src/lib/loopbrain/store/                # Context/embedding storage
src/lib/loopbrain/signals.ts            # Org health signals
src/lib/loopbrain/actions/              # Executable actions
src/lib/loopbrain/config.ts             # Model/timeout config
```

### Org Module
```
src/lib/org/data.server.ts              # Load all org data
src/lib/org/deriveIssues.ts             # Issue detection
src/lib/org/intelligence/               # Intelligence/analytics
src/lib/org/capacity/                   # Capacity management
src/lib/org/responsibility/             # Responsibility profiles
src/lib/org/decision/                   # Decision authority
src/lib/org/snapshot/                   # Semantic snapshots
```

### API Entry Points
```
src/app/api/loopbrain/chat/route.ts     # Main Loopbrain endpoint
src/app/api/tasks/route.ts              # Tasks CRUD (standard pattern)
src/app/api/todos/route.ts              # Todos CRUD (standard pattern)
src/app/api/wiki/pages/route.ts         # Wiki CRUD
src/app/api/projects/route.ts           # Projects CRUD
src/app/api/dashboard/bootstrap/route.ts # Dashboard data
```
