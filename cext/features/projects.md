# Projects & Tasks Module

> Audited 2026-03-09 from live code. 6 lib files, 29 API routes, 36 UI components, 24 Prisma models.

## Purpose

Project management with tasks, epics, milestones, custom fields, documentation linking, templates, daily AI summaries, and real-time collaboration.

## Current State

| Feature | Status | Notes |
|---------|--------|-------|
| Project CRUD | **LIVE** | Create, update, archive, duplicate. 8 built-in templates. |
| Task CRUD | **LIVE** | Create, edit, assign, subtasks, comments, mentions, story points |
| Kanban board | **LIVE** | Drag-drop task board by status columns |
| Table view | **LIVE** | Data table with inline editing (`TaskTableView.tsx`) |
| Epics | **LIVE** | CRUD + task assignment. Per-epic timeline STUBBED, settings panel STUBBED |
| Milestones | **LIVE** | CRUD with date ranges + task assignment |
| Calendar view | **LIVE** | Task due dates on calendar grid |
| Timeline/Gantt | **LIVE** | `gantt-chart.tsx` — Gantt-style visualization |
| Documentation | **LIVE** | Attach wiki pages to projects. Inline viewer. |
| Custom fields | **LIVE** | Def + Val models. Types: text, number, select, date, boolean |
| Task dependencies | **LIVE** | `blocks[]`, `dependsOn[]` (string arrays). Status validation enforced. |
| Task history | **LIVE** | All mutations logged to TaskHistory (non-blocking) |
| Daily summaries | **LIVE** | AI-generated per project+date. Toggle via `dailySummaryEnabled` |
| Project members | **LIVE** | ProjectMember, ProjectAssignee, ProjectPersonLink (with org position) |
| Project reports | **LIVE** | Analytics dashboard (`project-reports.tsx`) |
| Loopbrain panel | **LIVE** | `ProjectLoopbrainPanel.tsx` — AI insights per project |
| Org status | **LIVE** | `ProjectOrgStatus.tsx` — org readiness blockers for project |
| Templates | **LIVE** | 8 built-in + user-created. Apply to new projects. |
| Task templates | **LIVE** | Category-based task template items |
| Wiki links | **LIVE** | Tasks ↔ wiki pages via TaskWikiLink |
| ProjectSpace (legacy) | **DEPRECATED** | `/api/project-spaces/` warns to use `/api/spaces/` instead |
| TaskEditDialog | **DEPRECATED** | P1: migrate callers to `TaskSidebar`, then delete |

## Key Files

### Lib (`src/lib/projects/` + `src/lib/pm/`)
- `src/lib/projects/templates.ts` — 8 built-in templates (Blank, Sprint, Marketing, Product Launch, Content, Event, Sales, Kanban)
- `src/lib/pm/schemas.ts` (359L) — All Zod schemas: ProjectCreate/Update, TaskCreate/Patch/Put, Epic, Milestone, CustomField, Comment, DailySummary
- `src/lib/pm/guards.ts` — Project/task access control
- `src/lib/pm/history.ts` — Task history logging
- `src/lib/pm/events.ts` — Socket.IO event type definitions
- `src/lib/pm/project-space-helpers.ts` — Legacy ProjectSpace CRUD utilities

### API Routes — 29 total

**Projects (`/api/projects/` — 19 routes):**
- `route.ts` — GET list (cached, team-filtered for non-admins), POST create
- `[projectId]/route.ts` — GET/PUT/DELETE single project
- `[projectId]/tasks/route.ts` — GET (paginated, filterable by epic/milestone/status/priority/assignee), POST create
- `[projectId]/epics/route.ts`, `[projectId]/epics/[epicId]/route.ts` — Epic CRUD
- `[projectId]/milestones/route.ts`, `[projectId]/milestones/[milestoneId]/route.ts` — Milestone CRUD
- `[projectId]/documentation/route.ts`, `[projectId]/documentation/[docId]/route.ts` — Wiki attachment
- `[projectId]/custom-fields/route.ts`, `[projectId]/custom-fields/[fieldId]/route.ts` — Custom field CRUD
- `[projectId]/members/route.ts`, `[projectId]/people/route.ts`, `[projectId]/people/[userId]/route.ts` — Member management
- `[projectId]/assignees/route.ts`, `[projectId]/daily-summaries/route.ts`, `[projectId]/daily-summary-settings/route.ts`, `[projectId]/duplicate/route.ts`, `[projectId]/reports/route.ts`
- `/api/projects-optimized/route.ts` — Cached list with pagination (no ContextObjects)

**Tasks (`/api/tasks/` — 10 routes):**
- `route.ts` — GET list (requires projectId)
- `[id]/route.ts` — GET/PATCH/PUT/DELETE with full includes (assignee, epic, milestone, comments, subtasks, wikiLinks, customFieldValues)
- `[id]/comments/route.ts` — Comment CRUD with mentions
- `[id]/subtasks/route.ts` — Subtask CRUD
- `[id]/dependencies/route.ts` — Dependency management
- `[id]/custom-fields/route.ts` — Custom field values
- `[id]/wiki-links/route.ts` — Wiki page links
- `[id]/assignments/{epic,milestone,points}/route.ts` — Assignment operations

All routes follow: `getUnifiedAuth → assertAccess → setWorkspaceContext → Zod validate`.

### UI — Projects (`src/components/projects/` — 26 files)
- `create-project-dialog.tsx` — Template/space/member selector
- `TaskTableView.tsx` — Data table with inline editing
- `project-edit-dialog.tsx` — Edit metadata, owner, team, color, slack channel
- `epics-view.tsx` (680L) — Epic management (timeline/settings STUBBED)
- `ProjectLoopbrainPanel.tsx` — AI context panel
- `task-drawer.tsx` — Side panel task editor
- `gantt-chart.tsx` — Timeline visualization
- `project-documentation-section.tsx` — Wiki attachment manager
- `project-reports.tsx` — Analytics dashboard
- `project-daily-summaries.tsx` — AI summary toggle

### UI — Tasks (`src/components/tasks/` — 10 files)
- `task-sidebar.tsx` (44KB) — Main task editor (replacement for deprecated dialog)
- `create-task-dialog.tsx` — New task modal
- `task-list.tsx` — Kanban/list renderer
- `calendar-view.tsx` — Calendar grid
- `timeline-view.tsx` — Gantt-style timeline
- `dependency-manager.tsx` — Dependency graph UI
- `task-comments.tsx` — Comment thread with mentions

### Pages (8 under `/projects`)
- `/projects` — Project list with cards + search/filter
- `/projects/new` — New project page
- `/projects/[id]` — **Main view with 9 dynamic tabs:** KanbanBoard, TaskTableView, EpicsView, CalendarView, TimelineView, ProjectDocumentation, ProjectTodos, ProjectLoopbrainPanel, ProjectOrgStatus
- `/projects/[id]/settings/custom-fields` — Custom field management
- `/projects/[id]/tasks/new`, `/projects/[id]/tasks/[taskId]` — Task pages

## Data Models (24 Prisma models)

**Core:** Project (`status`: ACTIVE/ON_HOLD/COMPLETED/CANCELLED, `priority`, `dailySummaryEnabled`, `ownerId`, `teamId`, `spaceId`)

**Tasks:** Task (`status`: TODO/IN_PROGRESS/IN_REVIEW/DONE/BLOCKED, `priority`, `points` 0-100, `blocks[]`, `dependsOn[]`, `epicId`, `milestoneId`), Subtask, TaskComment (with `mentions[]`), TaskHistory, TaskWikiLink

**Structure:** Epic (`title`, `color`, `order`), Milestone (`title`, `startDate`, `endDate`)

**Custom Fields:** CustomFieldDef (`key`, `label`, `type`: text/number/select/date/boolean, `options`), CustomFieldVal (`taskId`, `fieldId`, `value` Json)

**Members:** ProjectMember (`role`: VIEWER/MEMBER/ADMIN/OWNER), ProjectAssignee, ProjectPersonLink (`role`: OWNER/CONTRIBUTOR/REVIEWER/STAKEHOLDER, `allocatedHours`), ProjectWatcher

**Accountability:** ProjectAccountability (owner, decision, escalation, backup — each with personId + role)

**Content:** ProjectDocumentation (`projectId` + `wikiPageId`, unique), ProjectDailySummary (`projectId` + `date`, unique)

**Templates:** ProjectTemplate (`templateData` Json), TaskTemplate, TaskTemplateItem

**Legacy:** ProjectSpace (deprecated → use Space)

## Loopbrain Integration — LIVE

| Source | File | What |
|--------|------|------|
| Projects | `src/lib/loopbrain/context-sources/pm/projects.ts` (124L) | `buildProjectContext()` — name, status, tasksTotal/Done, documentation |
| Tasks | `src/lib/loopbrain/context-sources/pm/tasks.ts` (160L) | `buildTaskContext()` — status, priority, assignee, epic, subtask counts |
| Epics | `src/lib/loopbrain/context-sources/pm/epics.ts` (111L) | `buildEpicContext()` — project, task counts, color. Status hardcoded 'active' |
| Project Health | `/api/loopbrain/project-health/[projectId]` | Returns `ProjectHealthSnapshotV0` |
| UI Panel | `ProjectLoopbrainPanel.tsx` | Per-project AI insights tab |

## Known Gaps

| Gap | Severity | Location |
|-----|----------|----------|
| TaskEditDialog deprecated | P1 | `src/components/tasks/task-edit-dialog.tsx:3` — migrate callers to TaskSidebar |
| Epic timeline view | BACKLOG | `epics-view.tsx:329` — TODO: per-epic timeline view |
| Epic settings panel | BACKLOG | `epics-view.tsx:349` — TODO: epic settings panel |
| Epic status hardcoded | P3 | `context-sources/pm/epics.ts` — status always 'active' (no field on model) |
| ProjectSpace deprecated | P3 | `/api/project-spaces/` logs deprecation warning |

## Dependencies

**Foundation:** `db.ts`, `unified-auth.ts`, `assertAccess.ts`, `scopingMiddleware.ts`, `api-errors.ts`, `cache.ts`

**Validations:** `src/lib/pm/schemas.ts` (16+ Zod schemas)

**Real-time:** Socket.IO events to `project:${projectId}` rooms (epicCreated, taskEpicAssigned, taskCommentAdded, etc.)

## Integration Points

| Consumer | How | What |
|----------|-----|------|
| **Loopbrain** | Context sources (pm/) | Projects, tasks, epics as ContextObjects |
| **Loopbrain** | Project health API | `ProjectHealthSnapshotV0` scoring |
| **Loopbrain Agent** | `createTask` tool | Agent can create tasks from plans |
| **Wiki** | ProjectDocumentation + TaskWikiLink | Bi-directional wiki ↔ project/task links |
| **Goals** | ProjectGoalLink | Goals sync progress from linked projects |
| **Org** | ProjectMember.orgPositionId, ProjectPersonLink.orgPositionId | People tied to org positions |
| **Org Capacity** | ProjectAllocation | Capacity tracking per project |
| **Spaces** | Project.spaceId FK | Projects organized into spaces |
| **Dashboard** | Project stats | Bootstrap data for workspace home |
