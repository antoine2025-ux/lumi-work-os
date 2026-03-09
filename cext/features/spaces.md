# Spaces & Wiki Module

> Audited 2026-03-09 from live code. Spaces: 773L lib, 15 API routes, 18 UI components. Wiki: 1,630L lib, 16 API routes, 38 UI components.

## Purpose

Unified workspace navigation layer (Spaces) + collaborative knowledge base with rich-text editing and AI integration (Wiki). Spaces aggregate personal, team, and company-wide content; Wiki provides the document engine.

## Current State

| Feature | Status | Notes |
|---------|--------|-------|
| Space CRUD | **LIVE** | Create, update, delete with visibility (PUBLIC/PERSONAL/PRIVATE) |
| Space hierarchy | **LIVE** | Parent-child subspaces via `parentId` |
| Auto-created spaces | **LIVE** | General (TEAM), Personal (per-user), Company Wiki — auto-created on first access |
| Space permissions | **LIVE** | Visibility + SpaceMember role (OWNER/EDITOR/VIEWER) |
| Personal Space dashboard | **LIVE** | Due tasks, recent pages, projects, quick actions |
| Team Space view | **LIVE** | Members, projects, wiki pages, subspaces |
| Wiki page CRUD | **LIVE** | Create, read, update, delete with JSON format (TipTap) |
| Rich text editor | **LIVE** | TipTap with slash commands, embeds, mentions, tables, bubble menu |
| Wiki search | **LIVE** | Query + type/author/tag filtering, visibility-scoped |
| Page versioning | **LIVE** | Version history with restore |
| Favorites | **LIVE** | Per-user favorites with personal page filtering |
| Templates | **LIVE** | JSON-based TipTap templates — CRUD + apply |
| File uploads | **LIVE** | Attachment management, URL extraction from content |
| Personal page isolation | **LIVE** | `createdById` ownership, per-user cache keys, 404 for others' pages |
| RLS defense | **LIVE** | `wiki_pages` RLS policy via `set_config('app.user_id')` |
| Collaborative presence | **LIVE** | Real-time indicators via Socket.IO (`CollabPresence.tsx`) |
| AI Assistant | **LIVE** | Ask, Search, Generate, Extract Tasks, Tag Pages via Loopbrain |
| Company Wiki view | **LIVE** | Section hierarchy with icons |
| Legacy wiki_workspaces | **LIVE** | Dual schema — string `workspace_type` maps to `wiki_workspaces` |
| Space-based page filtering | **STUBBED** | `WikiPage.spaceId` FK exists (nullable) but not used for filtering yet |

## Key Files

### Spaces Lib (`src/lib/spaces/` — 773L)
- `queries.ts` (347L) — Aggregation: `getMyProjects()`, `getMyRecentPages()`, `getMyDueTasks()`, `getMyTeamProjects()`
- `permissions.ts` (108L) — `canAccessSpace()`, `canEditSpace()`, `canDeleteSpace()`
- `personal.ts` (29L) — `getOrCreatePersonalSpace()` per-user
- `company-wiki.ts` (68L) — `getOrCreateCompanyWikiSpace()` one per workspace
- `general.ts` (27L) — `ensureGeneralSpace()` workspace-level PUBLIC TEAM space
- `get-default-space.ts` (60L) — Default space logic (single team → team space, else General)

### Wiki Lib (`src/lib/wiki/` — 1,630L)
- `templates.ts` (544L) — Template management (CRUD + apply + validate)
- `html-to-tiptap.ts` (388L) — HTML → TipTap JSON conversion
- `content-processor.ts` (187L) — Content processing/cleaning
- `embed-utils.ts` (159L) — Embed handling in wiki content
- `create-page.ts` (136L) — Centralized page creation helper
- `text-extract.ts` (108L) — Plaintext extraction for indexing
- `attachments.ts` (66L) — File attachment management

### Spaces API (`src/app/api/spaces/` — 15 route.ts files)
- `route.ts` — GET list accessible spaces, POST create space
- `[id]/route.ts` — GET/PUT/DELETE single space
- `[id]/members/route.ts`, `[id]/members/[userId]/route.ts` — Member management
- `[id]/docs/route.ts`, `[id]/projects/route.ts`, `[id]/collaborations/route.ts` — Subresources
- `personal/{due-tasks,recent-pages,notes,projects}/route.ts` — Personal aggregation
- `team/{recent-pages,projects,due-tasks}/route.ts` — Team aggregation
- `default/route.ts` — Get default space for user

### Wiki API (`src/app/api/wiki/` — 16 route.ts files)
- `pages/route.ts` — GET list (paginated), POST create
- `pages/[id]/route.ts` — GET/PUT/DELETE single page (security: workspaceId + personal ownership)
- `pages/[id]/favorite/route.ts`, `pages/[id]/upgrade/route.ts`, `pages/[id]/versions/route.ts`
- `search/route.ts` — Full-text search with visibility scoping
- `workspaces/route.ts` — Wiki workspace CRUD (legacy model)
- `favorites/route.ts`, `favorites/check/route.ts` — Favorites with personal filtering
- `templates/route.ts`, `templates/[id]/route.ts` — Template CRUD
- `upload/route.ts` — File upload
- `recent-pages/route.ts`, `page-counts/route.ts`, `company-wiki/route.ts`

### Spaces UI (`src/components/spaces/` — 18 files, 3,298L)
- `PersonalSpaceView.tsx` (423L) — Personal dashboard: tasks, pages, projects
- `TeamSpaceView.tsx` (411L) — Team space detail view
- `CompanyWikiView.tsx` (396L) — Company wiki section hierarchy
- `SpacesSidebar.tsx` (235L) — Sidebar navigation
- `space-tree-nav.tsx` (267L) — Hierarchical space tree
- `create-space-dialog.tsx` (250L), `create-page-dialog.tsx` (183L), `QuickNoteModal.tsx` (204L)

### Wiki UI (`src/components/wiki/` — 38 files, 11,430L)
- `wiki-ai-assistant.tsx` (1,815L) — AI assistant (Ask, Search, Generate, Extract Tasks, Tag Pages)
- `wiki-layout.tsx` (1,407L) — Main page editor/viewer with sidebar
- `rich-text-editor.tsx` (901L) — Legacy editor
- `tiptap-editor.tsx` (454L) — TipTap editor + toolbar
- `enhanced-rich-text-editor.tsx` (360L) — Enhanced editor with embeds + mentions
- `tiptap/slash-command.ts` (337L) — Slash command definitions
- `wiki-editor-shell.tsx` (315L) — Editor wrapper + collaboration
- `ai-preview-card.tsx` (401L) — AI suggestion display
- `CollabPresence.tsx` (195L) — Real-time presence

### Pages (4 under `/spaces`)
- `/spaces/home` → `PersonalSpaceView`
- `/spaces/[id]` → `TeamSpaceView`
- `/spaces/team` → Team space list (server-filtered)
- Layout: `SpacesLayoutShell` (client wrapper)

## Data Models

**Space:** `id`, `workspaceId`, `name`, `slug`, `visibility` (PUBLIC/PERSONAL/PRIVATE), `isPersonal`, `type` (TEAM/WIKI/null), `ownerId`, `parentId`, `color`, `icon`
- Relations: workspace, owner, parent ↔ children, members, projects, wikiPages

**SpaceMember:** `spaceId`, `userId`, `role` (OWNER/EDITOR/VIEWER). @@unique([spaceId, userId])

**WikiPage:** `id`, `workspaceId`, `title`, `slug`, `content`, `contentJson` (TipTap JSON), `contentFormat` (HTML/JSON/MARKDOWN), `parentId`, `tags[]`, `createdById`, `permissionLevel` (personal/team), `workspace_type`, `type` (TEAM_DOC/COMPANY_WIKI/PERSONAL_NOTE/PROJECT_DOC), `isSection`, `spaceId` (nullable FK — Phase 1 migration), `ai_analysis`, `quality_score`
- @@unique([workspaceId, slug])

**wiki_workspaces** (legacy): `id`, `workspace_id`, `name`, `type`, `visibility`, `created_by_id`

**WikiWorkspaceMember:** `wikiWorkspaceId`, `userId`, `role` (OWNER/EDITOR/VIEWER)

**Supporting:** WikiVersion, WikiTemplate, WikiFavorite, WikiComment, WikiAttachment, WikiChunk, WikiPagePermission, WikiEmbed

## API Routes — 31 total (15 spaces + 16 wiki)

All follow: `getUnifiedAuth → assertAccess → setWorkspaceContext`. Cache keys include `userId` for personal visibility.

## Loopbrain Integration — LIVE

| Integration | Mechanism | Location |
|-------------|-----------|----------|
| Page indexing | `buildContextObjectForPage()` → ContextObject | `src/lib/loopbrain/indexing/builders/page.ts` |
| Context conversion | `pageToContext(page)` — slug, category, permissions, viewCount | `src/lib/context/context-builders.ts:382-457` |
| AI Assistant | `callSpacesLoopbrainAssistant()` — Ask, Search, Generate, Extract Tasks, Tag Pages | `src/components/wiki/wiki-ai-assistant.tsx` |
| Embedding | Pages embedded via `embedding-service.ts` for semantic search | `src/lib/loopbrain/embedding-service.ts` |

## Known Gaps

| Gap | Severity | Location |
|-----|----------|----------|
| `spaceId` filter not used for page queries | P1 | `api/wiki/pages/route.ts:43` — TODO: Add `?spaceId=` filter once pages migrated to space-based nav |
| Dual schema (WikiPage + wiki_workspaces) | P2 | `workspace_type` is string, not FK — legacy relationship |
| Legacy rich-text-editor still present | P3 | `rich-text-editor.tsx` (901L) — superseded by TipTap editor |
| `WikiPage.spaceId` nullable | P3 | Phase 1 migration incomplete — not all pages linked to spaces |

## Dependencies

**Foundation:** `db.ts`, `unified-auth.ts`, `assertAccess.ts`, `scopingMiddleware.ts`, `api-errors.ts`, `cache.ts`

**Validations:** `src/lib/validations/wiki.ts`

**Real-time:** Socket.IO for collaborative presence (`wikiPageEditing`, `wikiPageStoppedEditing` events)

## Integration Points

| Consumer | How | What |
|----------|-----|------|
| **Loopbrain** | Page indexing + embedding | Wiki pages as ContextObjects for Q&A |
| **Loopbrain Agent** | `extract_tasks` action | Creates tasks from wiki content |
| **Projects** | `WikiPage.type = PROJECT_DOC` | Project documentation pages |
| **Tasks** | `TaskWikiLink` model | Tasks linked to wiki pages |
| **Spaces** | `WikiPage.spaceId` FK | Pages organized into spaces |
| **Onboarding** | Company wiki auto-created | Initial workspace setup creates wiki space |
