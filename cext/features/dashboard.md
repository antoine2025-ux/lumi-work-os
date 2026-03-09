# Dashboard Module

> Audited 2026-03-09 from live code. 2 API routes, 13 widget components, 11 layout components, 245L prefetch lib.

## Purpose

Workspace home screen aggregating tasks, projects, todos, activity, AI insights, calendar, email, and quick actions into a 3x3 widget grid with aggressive prefetching and performance guardrails.

## Current State

| Feature | Status | Notes |
|---------|--------|-------|
| Bootstrap API | **LIVE** | Single endpoint loads all dashboard data. Max 10 projects, 4 pages, 50 todos, 6 drafts. 60s edge cache. |
| Activity feed | **LIVE** | Recent activity with entity URLs (goals, tasks, wiki, projects). Max 20 items. |
| My Tasks widget | **LIVE** | Assigned tasks (10 max), color-coded status, overdue detection |
| Today's Todos | **LIVE** | Schedule filter (today/week/all), toggle/create via modal |
| Projects card | **LIVE** | Recent projects (5 max) with task completion progress bars |
| Project Health Alerts | **LIVE** | Blocker visualization with action links |
| Loopbrain Insights | **LIVE** | AI insights by category (CAPACITY/WORKLOAD/PROJECT/PROCESS/COMMUNICATION), severity levels |
| Daily Briefing | **LIVE** | Loopbrain daily briefing (shown once/day), collapsible sections |
| Onboarding Briefing | **LIVE** | 30-day post-signup briefing, dismissible |
| Welcome Card | **LIVE** | First-visit Loopbrain welcome, company-type-specific greetings, starter prompts |
| Meetings card | **LIVE** | Google Calendar today's events via OAuth |
| Email widget | **LIVE** | Gmail inbox preview (5 latest) via OAuth |
| Notifications | **LIVE** | Recent activity (10 items) with entity links |
| Quick Actions | **PARTIAL** | Add Todo, New Page, Loopbrain toggle — LIVE. Analytics button DISABLED. |
| Data prefetching | **LIVE** | Cache warming on app load: workspaces, pages, projects, drafts |
| Command palette | **LIVE** | Cmd+K global search (wiki, projects, tasks, people) |
| Global sidebar | **LIVE** | Spaces tree, teams, company wiki, favorites, create dialog |
| Workspace switcher | **LIVE** | Switch workspaces, account menu |
| Feature-gated nav | **LIVE** | LoopBrain, Analytics, Workflows gated by FeatureFlag |
| Analytics page | **STUBBED** | Nav item exists (feature-gated). Quick action button disabled. No implementation. |

## Key Files

### Pages
- `src/app/home/page.tsx` (259L) — Server component: 8 parallel DB queries (capacity, tasks, projects, manager links, pages, todos, counts, overdue)
- `src/app/home/DashboardClient.tsx` (259L) — Client: 3x3 widget grid with dynamic imports
- `src/app/(dashboard)/w/[workspaceSlug]/page.tsx` — Redirects to `/home` (TODO: consolidate)
- `src/app/(dashboard)/layout.tsx` — Top-level dashboard layout with auth
- `src/app/(dashboard)/DashboardLayoutClient.tsx` — Minimal loading state for fast LCP
- `src/app/(dashboard)/DashboardProviders.tsx` — OrgContext for dashboard components

### API Routes (2)
- `src/app/api/dashboard/bootstrap/route.ts` (542L) — All-in-one data load with enforced limits + 60s cache + perf logging
- `src/app/api/dashboard/activity/route.ts` (79L) — Activity feed with entity URL mapping

### Widgets (`src/components/dashboard/` — 13 files, 2,233L)
- `daily-briefing-card.tsx` (316L) — Loopbrain daily briefing
- `meetings-card.tsx` (210L) — Google Calendar integration
- `insights-card.tsx` (202L) — Loopbrain AI insights by severity/category
- `email-widget.tsx` (200L) — Gmail inbox preview
- `project-health-alerts.tsx` (192L) — Project blockers
- `todays-todos-card.tsx` (185L) — Todo list with schedule filter
- `loopbrain-welcome-card.tsx` (178L) — First-visit welcome (company-type variants)
- `my-tasks-widget.tsx` (170L) — Assigned tasks
- `onboarding-briefing-card.tsx` (160L) — Post-signup briefing
- `notifications-widget.tsx` (125L) — Activity feed
- `projects-card.tsx` (122L) — Recent projects with progress
- `project-status-card.tsx` (110L) — Single project health
- `quick-actions.tsx` (63L) — Action buttons (Analytics DISABLED)

### Layout (`src/components/layout/` — 11 files, 2,549L)
- `GlobalSidebar.tsx` (542L) — Spaces tree, teams, wiki, favorites
- `workspace-account-menu.tsx` (409L) — Workspace switcher + account
- `navigation.tsx` (253L) — Nav items with feature flags
- `header.tsx` (211L) — Top bar: search, switcher, user menu
- `breadcrumbs.tsx` (275L), `workspace-switcher.tsx` (218L), `GlobalNav.tsx` (173L), `sidebar.tsx` (146L)

### Prefetching
- `src/lib/prefetch.ts` (245L) — Cache warming: workspaces (5min stale), pages (2min), projects (2min), drafts (1min). On-demand page content prefetch on hover.
- `src/components/data-prefetcher.tsx` (60L) — Runs on app load, skips public routes, non-fatal errors
- `src/components/ui/command-palette.tsx` (26L) — Wraps UnifiedSearchDialog (Cmd+K)

### Related Pages
- `/calendar` — `CalendarPageClient` with Google Calendar OAuth
- `/ask` — Loopbrain chat with session management, source citations
- `/settings` — Workspace data, Slack, notifications, members, policies
- `/my-tasks` — Redirect shim to canonical route

## Data Models

Dashboard doesn't own models — it aggregates from:
- **Activity** — workspace activity feed (note: missing `workspaceId` field — known gap)
- **Todo** — personal todos
- **Task** — assigned tasks
- **Project** — project list + health
- **WikiPage** — recent pages + drafts
- **ChatSession** — draft sessions (for drafts widget)
- **PersonManagerLink** — manager relationships (for capacity)
- **FeatureFlag** — nav item gating

## API Routes — 2 total

| Route | Method | Purpose | Cache |
|-------|--------|---------|-------|
| `/api/dashboard/bootstrap` | GET | All-in-one dashboard data | 60s edge, 120s stale |
| `/api/dashboard/activity` | GET | Activity feed (max 20) | None |

Both follow: `getUnifiedAuth → assertAccess → setWorkspaceContext`.

## Loopbrain Integration — LIVE

| Widget | Source | Behavior |
|--------|--------|----------|
| `insights-card.tsx` | `GET /api/loopbrain/insights` | AI insights by severity + category |
| `daily-briefing-card.tsx` | `GET /api/loopbrain/insights` | Once-daily briefing with sections |
| `onboarding-briefing-card.tsx` | `GET /api/loopbrain/insights` | 30-day post-signup briefing |
| `loopbrain-welcome-card.tsx` | Local (no API) | First-visit starter prompts |
| `project-health-alerts.tsx` | `GET /api/projects/[id]/blockers` | Project-level blockers |

## Known Gaps

| Gap | Severity | Location |
|-----|----------|----------|
| Analytics not implemented | P2 | `quick-actions.tsx:55` — button disabled; nav item feature-gated |
| Dashboard not in workspace URL | P2 | `/home` is canonical; `/w/[slug]` redirects. TODO: consolidate. |
| Activity model no workspaceId | P1 | Carried from ARCHITECTURE.md — critical isolation gap |
| FeatureFlag nav gating not wired | P3 | `navigation.tsx` — TODO: check FeatureFlag model when implemented |
| Legacy route redirects | P3 | `/settings`, `/ask`, `/projects`, `/my-tasks` → workspace-scoped (BACKLOG TODOs to remove) |

## Dependencies

**Foundation:** `db.ts`, `unified-auth.ts`, `assertAccess.ts`, `scopingMiddleware.ts`, `api-errors.ts`, `cache.ts`

**Consumes:** Projects API, Tasks API, Wiki API, Todos API, Loopbrain Insights API, Calendar Events, Gmail API, Activity model

**Providers:** SessionProvider, QueryClientProvider, UserStatusProvider, WorkspaceProvider, SocketWrapper

## Integration Points

| Source | How | What |
|--------|-----|------|
| **Loopbrain** | Insights API | Daily briefing, AI insights, onboarding briefing |
| **Projects** | Bootstrap + direct API | Project cards, health alerts |
| **Tasks** | Bootstrap + my-tasks API | Assigned tasks widget |
| **Wiki** | Bootstrap + prefetch | Recent pages, drafts |
| **Todos** | Bootstrap + direct API | Today's todos |
| **Calendar** | Google Calendar OAuth | Meetings card |
| **Gmail** | Gmail OAuth | Email widget |
| **Org** | PersonManagerLink, capacity | Capacity data for home page |
| **Activity** | `/api/dashboard/activity` | Notifications widget |

## Performance Notes

- **Server:** 8 parallel DB queries via `Promise.all`. Typical load ~500-800ms.
- **Bootstrap:** Strict limits enforced (10 projects, 4 pages, 50 todos, 6 drafts). Warns if >1000ms.
- **Client:** Heavy widgets lazy-loaded (`dynamic({ ssr: false })`). Skeleton loaders during mount.
- **Stale times:** Tasks/Todos/Notifications: 30s. Email: 5min. Prefetch: 1-5min by type.
- **Edge cache:** Bootstrap response cached 60s with 120s stale-while-revalidate.
