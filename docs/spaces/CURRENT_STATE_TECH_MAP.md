# Current State Technical Map: Workspaces, Projects, Wiki Pages, and Spaces

**Generated:** 2025-01-XX  
**Purpose:** Document the current implementation architecture for another engineer to understand in 10 minutes  
**Scope:** Facts only, no proposals

---

## Phase 0: Source of Truth

### Stack & Runtime

**Framework:**
- Next.js 15.5.7 with App Router (`package.json`)
- React 19.1.0
- TypeScript

**Authentication:**
- NextAuth v4.24.11 (`src/lib/auth.ts`)
- Google OAuth provider (optional, requires credentials)
- JWT session strategy
- Session stored in database (`Session` model)

**Database:**
- PostgreSQL (via `DATABASE_URL` env var)
- Prisma ORM v6.17.0 (`prisma/schema.prisma`)
- Direct connection + connection pooling support (`directUrl`)

**API Style:**
- Next.js Route Handlers (`src/app/api/**/route.ts`)
- Server Actions (limited usage)
- No tRPC

### Key Conventions

**Workspace Context Resolution:**
- Priority order (from `src/lib/unified-auth.ts:190-352`):
  1. URL path slug (`/w/[workspaceSlug]/...`) - highest priority
  2. URL query params (`?workspaceId=...` or `?projectId=...`)
  3. `x-workspace-id` header
  4. User's default workspace (first workspace membership)

**WorkspaceId Passing:**
- API routes: Retrieved via `getUnifiedAuth(request)` → `auth.workspaceId`
- Never accepted from client request body (security)
- Set via `setWorkspaceContext(workspaceId)` for Prisma middleware scoping

**Access Control:**
- `assertAccess()` in `src/lib/auth/assertAccess.ts` for workspace-level checks
- `assertProjectAccess()` in `src/lib/pm/guards.ts` for project-level checks
- Both verify workspace membership via `WorkspaceMember` table
- Project access also checks `ProjectSpace` visibility (PUBLIC/TARGETED)

---

## Phase 1: Data Model Audit

### Entity: Workspace

**Schema Location:** `prisma/schema.prisma:107-142`

```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  logo        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  ownerId     String   // Required FK to User
  // Relations...
}
```

**Key Fields:**
- `id`: Primary key (cuid)
- `slug`: Unique identifier for URL routing (`/w/[slug]/...`)
- `ownerId`: Required FK to `User` (cascade delete)

**Relations:**
- `owner` → `User` (WorkspaceOwner relation)
- `members` → `WorkspaceMember[]`
- `projects` → `Project[]`
- `wikiPages` → `WikiPage[]`
- `projectSpaces` → `ProjectSpace[]`

**Constraints:**
- `slug` is unique
- `ownerId` required (cascade delete)

### Entity: WorkspaceMember (Membership)

**Schema Location:** `prisma/schema.prisma:144-157`

```prisma
model WorkspaceMember {
  id          String        @id @default(cuid())
  workspaceId String
  userId      String
  role        WorkspaceRole @default(MEMBER)
  joinedAt    DateTime      @default(now())
  // Relations...
}
```

**Key Fields:**
- Composite unique: `[workspaceId, userId]`
- `role`: Enum (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)

**Indexes:**
- `idx_workspace_members_user` on `userId`
- `idx_workspace_members_user_workspace` on `[userId, workspaceId]`

**Cascade:** Delete on user or workspace delete

### Entity: Project

**Schema Location:** `prisma/schema.prisma:686-725`

```prisma
model Project {
  id              String          @id @default(cuid())
  workspaceId     String          // Required FK to Workspace
  name            String
  description     String?
  status          ProjectStatus   @default(ACTIVE)
  priority        Priority        @default(MEDIUM)
  projectSpaceId  String?         // Optional FK to ProjectSpace
  wikiPageId      String?         // Optional FK to WikiPage (primary wiki)
  ownerId         String?         // Optional FK to User
  createdById     String          // Required FK to User
  // Relations...
}
```

**Key Fields:**
- `workspaceId`: Required (cascade delete)
- `projectSpaceId`: Optional (set null on delete)
- `wikiPageId`: Optional (legacy primary wiki link)
- `createdById`: Required (cascade delete)

**Relations:**
- `workspace` → `Workspace`
- `projectSpace` → `ProjectSpace?`
- `wikiPage` → `WikiPage?` (primary wiki relation)
- `documentationLinks` → `ProjectDocumentation[]` (many-to-many with WikiPage)
- `members` → `ProjectMember[]`
- `owner` → `User?`

**Indexes:**
- `idx_projects_workspace_status` on `[workspaceId, status]`
- `idx_projects_project_space` on `projectSpaceId`

**Cascade:** Delete on workspace delete

### Entity: ProjectSpace

**Schema Location:** `prisma/schema.prisma:656-670`

```prisma
model ProjectSpace {
  id          String                 @id @default(cuid())
  workspaceId String                 // Required FK to Workspace
  name        String
  description String?
  visibility  ProjectSpaceVisibility @default(PUBLIC)
  createdAt   DateTime               @default(now())
  updatedAt   DateTime               @updatedAt
  // Relations...
}
```

**Key Fields:**
- `workspaceId`: Required (cascade delete)
- `visibility`: Enum (`PUBLIC`, `TARGETED`)
  - `PUBLIC`: All workspace members can see projects
  - `TARGETED`: Only `ProjectSpaceMember` can see projects

**Relations:**
- `workspace` → `Workspace`
- `projects` → `Project[]`
- `members` → `ProjectSpaceMember[]`

**Indexes:**
- `idx_project_spaces_workspace` on `workspaceId`

**Cascade:** Delete on workspace delete

### Entity: ProjectSpaceMember

**Schema Location:** `prisma/schema.prisma:672-684`

```prisma
model ProjectSpaceMember {
  id             String       @id @default(cuid())
  projectSpaceId String
  userId         String
  joinedAt       DateTime     @default(now())
  // Relations...
}
```

**Key Fields:**
- Composite unique: `[projectSpaceId, userId]`

**Cascade:** Delete on user or ProjectSpace delete

### Entity: WikiPage

**Schema Location:** `prisma/schema.prisma:187-244`

```prisma
model WikiPage {
  id            String         @id @default(cuid())
  workspaceId   String         // Required FK to Workspace
  title         String
  slug          String
  content       String         // Legacy HTML content
  contentJson   Json?          // TipTap/ProseMirror JSON (new format)
  contentFormat ContentFormat  @default(HTML) // 'HTML' or 'JSON'
  textContent   String?        // Plain text extraction for search
  workspace_type String?       @default("team") // Space identifier (string, not FK)
  permissionLevel String      @default("team") // Legacy: 'team' or 'personal'
  // Relations...
}
```

**Key Fields:**
- `workspaceId`: Required (cascade delete)
- `workspace_type`: String field (not FK) - identifies which "Space" the page belongs to
  - Values: `"personal"`, `"team"`, or custom space ID (from `wiki_workspaces` table)
- `contentFormat`: Enum (`HTML`, `JSON`)
  - `HTML`: Legacy format (stored in `content` field)
  - `JSON`: New TipTap format (stored in `contentJson` field)
- Composite unique: `[workspaceId, slug]`

**Relations:**
- `workspace` → `Workspace`
- `projectLinks` → `ProjectDocumentation[]` (many-to-many with Project)
- `projects` → `Project[]` (via `wikiPageId` - legacy primary wiki)
- `versions` → `WikiVersion[]`
- `createdBy` → `User`

**Indexes:**
- `idx_wiki_pages_workspace_slug` (unique constraint)
- `idx_wiki_pages_workspace_type` on `workspace_type`
- `idx_wiki_pages_workspace_updated` on `[workspaceId, updatedAt]`

**Cascade:** Delete on workspace delete

### Entity: ProjectDocumentation (Join Table)

**Schema Location:** `prisma/schema.prisma:1088-1101`

```prisma
model ProjectDocumentation {
  id         String   @id @default(cuid())
  projectId  String   // FK to Project
  wikiPageId String   // FK to WikiPage
  order      Int      @default(0)
  createdAt  DateTime @default(now())
  // Relations...
}
```

**Key Fields:**
- Composite unique: `[projectId, wikiPageId]`
- `order`: For sorting attached docs

**Relations:**
- `project` → `Project` (cascade delete)
- `wikiPage` → `WikiPage` (cascade delete)

**Indexes:**
- `idx_project_documentation_project` on `projectId`
- `idx_project_documentation_wiki_page` on `wikiPageId`

**Cascade:** Delete on project or wiki page delete

### Entity: wiki_workspaces (Spaces)

**Schema Location:** `prisma/schema.prisma:976-994`

```prisma
model wiki_workspaces {
  id            String    @id @db.VarChar(50)
  workspace_id  String    @db.VarChar(50) // FK to Workspace
  name          String    @db.VarChar(255)
  type          String?   @default("team") @db.VarChar(50)
  color         String?   @default("#3b82f6")
  icon          String?   @default("layers")
  description   String?
  is_private    Boolean?  @default(false)
  created_by_id String    @db.VarChar(50) // FK to User
  created_at    DateTime? @default(now())
  updated_at    DateTime? @default(now())
  // Relations...
}
```

**Key Fields:**
- `workspace_id`: FK to `Workspace` (cascade delete)
- `type`: String identifier (`"personal"`, `"team"`, or custom)
- `id`: Used as `workspace_type` value in `WikiPage` (string matching, not FK)

**Note:** This table stores "Spaces" metadata, but `WikiPage.workspace_type` references it via string matching (not a foreign key relationship).

### Entity Relationship Diagram (Text)

```
Workspace (tenant)
  ├── WorkspaceMember (membership)
  │   └── User
  ├── Project
  │   ├── ProjectSpace? (visibility container)
  │   │   └── ProjectSpaceMember (TARGETED space members)
  │   ├── ProjectMember (project-level membership)
  │   ├── ProjectDocumentation (many-to-many with WikiPage)
  │   └── wikiPageId? (legacy primary wiki link)
  └── WikiPage
      ├── workspace_type (string reference to wiki_workspaces.id)
      ├── ProjectDocumentation[] (many-to-many with Project)
      └── projects[] (via wikiPageId - legacy)

wiki_workspaces (Spaces metadata)
  └── id used as WikiPage.workspace_type value (string match, not FK)
```

---

## Phase 2: UI Routing + Entry Points

### A) Projects View

**Project List:**
- **Route:** `/w/[workspaceSlug]/projects` (`src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx`)
- **Component:** `ProjectsDashboard` (client component)
- **Data Fetch:** `GET /api/projects?workspaceId=...` (filtered by workspace)
- **Filtering:** Server-side filters by `workspaceId` + `ProjectSpace` visibility
  - PUBLIC spaces: visible to all workspace members
  - TARGETED spaces: only visible to `ProjectSpaceMember`
  - Legacy (no space): visible to all workspace members

**Project Detail:**
- **Route:** `/w/[workspaceSlug]/projects/[id]` (`src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/page.tsx`)
- **Component:** `ProjectDetailPage` (client component)
- **Data Fetch:** `GET /api/projects/[projectId]`
- **Documentation Section:** `ProjectDocumentationSection` component
  - Shows attached docs via `GET /api/projects/[projectId]/documentation`
  - "Attach Documentation" button opens `WikiPageSelector` dialog

**Legacy Routes (without workspace slug):**
- `/projects` → redirects or uses default workspace
- `/projects/[id]` → same as above but without workspace context in URL

### B) Wiki View

**Wiki Home:**
- **Route:** `/wiki/home` (`src/app/(dashboard)/wiki/home/page.tsx`)
- **Component:** `SpacesHomePage`
- **Shows:** List of Spaces (from `wiki_workspaces` table)
- **"New Space" Button:** Creates new workspace (not wiki space)

**Wiki Page Creation:**
- **Route:** `/wiki/new` (`src/app/(dashboard)/wiki/new/page.tsx`)
- **Component:** `NewWikiPage` (uses `WikiEditorShell` - TipTap)
- **Data Fetch:** `POST /api/wiki/pages`
- **Format:** Always JSON (`contentFormat: 'JSON'`, `contentJson` required)
- **WorkspaceId:** Retrieved from `/api/auth/user-status` → `workspaceId`

**Wiki Page Detail:**
- **Route:** `/wiki/[slug]` (`src/app/(dashboard)/wiki/[slug]/page.tsx`)
- **Component:** `WikiPageDetail`
- **Data Fetch:** `GET /api/wiki/pages/[id]` (by slug lookup)
- **Format Detection:** Checks `page.contentFormat`:
  - `JSON`: Renders via `WikiReadView` (TipTap renderer)
  - `HTML`: Renders via `dangerouslySetInnerHTML`
- **Edit Mode:** Uses `WikiEditorShell` for JSON pages, `RichTextEditor` for HTML (legacy)

**Personal Space:**
- **Route:** `/wiki/personal-space` (`src/app/(dashboard)/wiki/personal-space/page.tsx`)
- **Component:** `PersonalWorkspacePage`
- **Filtering:** Client-side filters pages where `workspace_type === 'personal'` OR (`workspace_type` is null AND `permissionLevel === 'personal'`)

**Team Workspace:**
- **Route:** `/wiki/team-workspace` (`src/app/(dashboard)/wiki/team-workspace/page.tsx`)
- **Component:** `TeamWorkspacePage`
- **Filtering:** Client-side filters pages where `workspace_type === 'team'` OR (`workspace_type` is null AND `permissionLevel !== 'personal'`)

**Custom Space:**
- **Route:** `/wiki/workspace/[id]` (`src/app/(dashboard)/wiki/workspace/[id]/page.tsx`)
- **Component:** `WorkspacePage`
- **Filtering:** Server-side via `GET /api/wiki/recent-pages?workspace_type=${id}`

### C) Spaces UI (Current)

**What "Spaces" Currently Shows:**
- Left nav "Projects" link (`src/components/layout/navigation.tsx:33-37`) → `/projects`
- Left nav "Wiki" link (`src/components/layout/navigation.tsx:39-45`) → `/wiki`
- **No dedicated "Spaces" nav item** - Spaces are accessed via Wiki routes

**"Personal Space":**
- Route: `/wiki/personal-space`
- Shows: Wiki pages filtered by `workspace_type === 'personal'`
- Created via: Wiki page creation with `workspace_type: 'personal'` or `permissionLevel: 'personal'`

**"New Workspace" Button:**
- Location: `/wiki/home` page (`src/app/(dashboard)/wiki/home/page.tsx:275-283`)
- Action: `handleCreateWorkspace()` → Creates new `Workspace` (not wiki space)
- API: `POST /api/workspace/create`

**"Open in Spaces" Button:**
- Location: `WikiPageBody` component (`src/components/wiki/wiki-page-body.tsx:74`)
- Action: Opens wiki page in new tab (`window.open('/wiki/${page.slug}', '_blank')`)
- **Does NOT attach to project** - just opens the page

**Project-Wiki Attachment:**
- Component: `ProjectDocumentationSection` (`src/components/projects/project-documentation-section.tsx`)
- Button: "Attach Documentation" → Opens `WikiPageSelector` dialog
- API: `POST /api/projects/[projectId]/documentation` with `{ wikiPageId }`
- Validation: Checks `wikiPage.workspaceId === project.workspaceId` (same workspace required)

---

## Phase 3: API Endpoints + Server Logic

### Workspace Endpoints

**GET /api/workspaces/[workspaceId]**
- **File:** `src/app/api/workspaces/[workspaceId]/route.ts`
- **Auth:** `getUnifiedAuth()` → `assertAccess()` (workspace scope, MEMBER+)
- **DB Writes:** None (read-only)
- **Filtering:** Returns workspace if user is member

**POST /api/workspace/create**
- **File:** `src/app/api/workspace/create/route.ts`
- **Auth:** `getUnifiedAuth()` → requires authenticated user
- **DB Writes:** Creates `Workspace` + `WorkspaceMember` (OWNER role)
- **Input:** `{ name, slug?, description? }`

### Project Endpoints

**GET /api/projects**
- **File:** `src/app/api/projects/route.ts:26-347`
- **Auth:** `getUnifiedAuth()` → `auth.workspaceId`
- **DB Writes:** None (read-only)
- **Filtering:**
  - `workspaceId: auth.workspaceId` (required)
  - `ProjectSpace` visibility:
    - `projectSpaceId: null` (legacy) OR
    - `projectSpace.visibility: 'PUBLIC'` OR
    - `projectSpace.visibility: 'TARGETED'` AND user is `ProjectSpaceMember` OR
    - User is creator/owner

**POST /api/projects**
- **File:** `src/app/api/projects/route.ts:349-576`
- **Auth:** `getUnifiedAuth()` → `assertAccess()` (workspace scope, MEMBER+)
- **DB Writes:** Creates `Project` (+ `ProjectSpace` if TARGETED)
- **Input:** `{ name, description?, status?, priority?, visibility?, memberUserIds?, projectSpaceId? }`
- **Authorization:** Requires workspace MEMBER role

**GET /api/projects/[projectId]**
- **File:** `src/app/api/projects/[projectId]/route.ts`
- **Auth:** `getUnifiedAuth()` → `assertProjectAccess()` (project scope)
- **DB Writes:** None (read-only)
- **Authorization:** Checks `ProjectSpace` visibility + `ProjectMember` role

**POST /api/projects/[projectId]/documentation**
- **File:** `src/app/api/projects/[projectId]/documentation/route.ts:156-356`
- **Auth:** `getUnifiedAuth()` → `assertProjectAccess()` (MEMBER+)
- **DB Writes:** Creates `ProjectDocumentation` record
- **Input:** `{ wikiPageId }`
- **Validation:**
  - Verifies `wikiPage.workspaceId === project.workspaceId` (same workspace)
  - Checks unique constraint `[projectId, wikiPageId]`
- **Authorization:** Requires project MEMBER role

**GET /api/projects/[projectId]/documentation**
- **File:** `src/app/api/projects/[projectId]/documentation/route.ts:27-154`
- **Auth:** `getUnifiedAuth()` → `assertProjectAccess()` (VIEWER+)
- **DB Writes:** None (read-only)
- **Returns:** Array of `ProjectDocumentation` with `wikiPage` included

### Wiki Endpoints

**POST /api/wiki/pages**
- **File:** `src/app/api/wiki/pages/route.ts:157-312`
- **Auth:** `getUnifiedAuth()` → `assertAccess()` (workspace scope, MEMBER+)
- **DB Writes:** Creates `WikiPage`
- **Input:** `{ title, contentJson?, contentFormat?, workspace_type?, permissionLevel?, tags?, category? }`
- **Enforcement:** All new pages use `contentFormat: 'JSON'` (hardcoded)
- **WorkspaceId:** Set from `auth.workspaceId` (never from request body)

**GET /api/wiki/pages/[id]**
- **File:** `src/app/api/wiki/pages/[id]/route.ts`
- **Auth:** `getUnifiedAuth()` → workspace membership check
- **DB Writes:** None (read-only)
- **Returns:** WikiPage with `contentFormat` and `contentJson`/`content` fields

**PUT /api/wiki/pages/[id]**
- **File:** `src/app/api/wiki/pages/[id]/route.ts:150-321`
- **Auth:** `getUnifiedAuth()` → workspace membership check
- **DB Writes:** Updates `WikiPage` + creates `WikiVersion` (version history)
- **Input:** `{ title?, contentJson?, contentFormat?, ... }`
- **Format:** Can update format (HTML → JSON upgrade supported)

**GET /api/wiki/recent-pages**
- **File:** `src/app/api/wiki/recent-pages/route.ts`
- **Auth:** `getUnifiedAuth()` → workspace membership check
- **DB Writes:** None (read-only)
- **Filtering:** Optional `workspace_type` query param
- **Returns:** Pages filtered by `workspaceId` + optional `workspace_type`

**GET /api/wiki/workspaces**
- **File:** `src/app/api/wiki/workspaces/route.ts`
- **Auth:** `getUnifiedAuth()` → workspace membership check
- **DB Writes:** None (read-only)
- **Returns:** List of `wiki_workspaces` entries for current workspace

### ProjectSpace Endpoints

**GET /api/project-spaces**
- **File:** `src/app/api/project-spaces/route.ts`
- **Auth:** `getUnifiedAuth()` → workspace membership check
- **DB Writes:** None (read-only)
- **Filtering:** Returns `ProjectSpace` entries for `auth.workspaceId`

**POST /api/project-spaces**
- **File:** `src/app/api/project-spaces/route.ts`
- **Auth:** `getUnifiedAuth()` → `assertAccess()` (workspace scope, MEMBER+)
- **DB Writes:** Creates `ProjectSpace`
- **Input:** `{ name, description?, visibility? }`

---

## Phase 4: Access Control and Cross-Container Edge Cases

### Server-Side Checks

**Workspace Isolation:**
- **Location:** `src/lib/auth/assertAccess.ts:17-83`
- **Check:** Verifies `WorkspaceMember` exists for `[workspaceId, userId]`
- **Enforcement:** All API routes call `assertAccess()` or `assertProjectAccess()`

**Project Access:**
- **Location:** `src/lib/pm/guards.ts:12-183`
- **Checks:**
  1. Workspace membership (via `workspaceId` param)
  2. `ProjectSpace` visibility:
     - `PUBLIC`: All workspace members can access
     - `TARGETED`: Only `ProjectSpaceMember` can access
  3. `ProjectMember` role (fallback)
  4. Creator/owner check (fallback)

**Wiki Page Access:**
- **Location:** `src/app/api/wiki/pages/[id]/route.ts`
- **Check:** Verifies `workspaceId` matches `auth.workspaceId`
- **Enforcement:** Wiki pages filtered by `workspaceId` in all queries

**Project-Wiki Attachment:**
- **Location:** `src/app/api/projects/[projectId]/documentation/route.ts:211-215`
- **Check:** `if (wikiPage.workspaceId !== project.workspaceId) { return 400 }`
- **Prevents:** Attaching page from workspace A to project in workspace B

### UI-Side Filtering

**Project List:**
- **Location:** `src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx`
- **Filtering:** Server-side via `GET /api/projects` (already filtered by workspace + ProjectSpace)

**Wiki Pages:**
- **Location:** `src/app/(dashboard)/wiki/personal-space/page.tsx`, `team-workspace/page.tsx`
- **Filtering:** Client-side filters by `workspace_type` field
- **Risk:** Client-side filtering can be bypassed (but server enforces workspaceId)

**Wiki Page Selector:**
- **Location:** `src/components/projects/wiki-page-selector.tsx`
- **Data Fetch:** `GET /api/wiki/pages?workspaceId=${workspaceId}` (server-filtered)
- **Filtering:** Server-side by `workspaceId` (safe)

### Missing Checks (Potential Issues)

**1. Wiki Page Cross-Workspace Access:**
- **Evidence:** `GET /api/wiki/pages/[id]` checks workspace membership but doesn't verify page belongs to workspace
- **File:** `src/app/api/wiki/pages/[id]/route.ts`
- **Uncertainty:** Need to verify if page lookup includes workspaceId filter

**2. ProjectSpace Member Assignment:**
- **Evidence:** `POST /api/project-spaces/[id]/members` exists but need to verify workspace isolation
- **File:** `src/app/api/project-spaces/[id]/members/route.ts`
- **Uncertainty:** May allow adding members from different workspace

**3. Wiki Space (wiki_workspaces) Cross-Workspace:**
- **Evidence:** `wiki_workspaces.workspace_id` is FK but `WikiPage.workspace_type` is string match
- **Uncertainty:** No FK constraint means `workspace_type` could reference non-existent space or space from different workspace

---

## Phase 5: Current Behavior Summary (Facts Only)

### 1. What is a "Workspace" Today?

**Definition:** A top-level tenant/organization container.

**Evidence:**
- `Workspace` model (`prisma/schema.prisma:107-142`)
- Has `ownerId` (User), `slug` (URL identifier), `name`
- Contains: Projects, WikiPages, ProjectSpaces, Members
- All resources belong to exactly one Workspace via `workspaceId` FK

**Access:** Users join via `WorkspaceMember` with role (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)

**Routing:** Workspaces accessed via `/w/[workspaceSlug]/...` URLs

### 2. What is a "Space" Today?

**Two Different Concepts:**

**A) ProjectSpace:**
- **Model:** `ProjectSpace` (`prisma/schema.prisma:656-670`)
- **Purpose:** Visibility container for Projects within a Workspace
- **Visibility:** `PUBLIC` (all workspace members) or `TARGETED` (only members)
- **Relationship:** Projects can belong to one `ProjectSpace` (optional)

**B) Wiki Space (wiki_workspaces):**
- **Model:** `wiki_workspaces` (`prisma/schema.prisma:976-994`)
- **Purpose:** Organizational container for WikiPages (like folders)
- **Relationship:** `WikiPage.workspace_type` references `wiki_workspaces.id` via string matching (not FK)
- **Types:** `"personal"`, `"team"`, or custom space IDs

**Current UI:** "Spaces" in left nav refers to Projects (not wiki spaces). Wiki spaces are accessed via `/wiki/home`, `/wiki/personal-space`, etc.

### 3. Where Do Projects Live Today?

**Scoping:** Projects belong to exactly one `Workspace` via `workspaceId` (required FK).

**Optional Scoping:** Projects can belong to one `ProjectSpace` via `projectSpaceId` (optional FK).

**Visibility Rules:**
- No `ProjectSpace`: Visible to all workspace members (legacy)
- `ProjectSpace.visibility === 'PUBLIC'`: Visible to all workspace members
- `ProjectSpace.visibility === 'TARGETED'`: Only visible to `ProjectSpaceMember`

**Evidence:** `src/app/api/projects/route.ts:119-151` (filtering logic)

### 4. Where Do Wiki Pages Live Today?

**Scoping:** Wiki pages belong to exactly one `Workspace` via `workspaceId` (required FK).

**Space Organization:** Wiki pages are organized into "Spaces" via `workspace_type` field (string, not FK):
- `"personal"`: Personal space pages
- `"team"`: Team workspace pages
- Custom space ID: References `wiki_workspaces.id` (string match)

**Evidence:** `prisma/schema.prisma:214` (`workspace_type String? @default("team")`)

**Note:** `workspace_type` is a string field, not a foreign key. The relationship to `wiki_workspaces` is maintained via string matching in application code.

### 5. How Does Project↔Wiki Attachment Work Today?

**Model:** Many-to-many via `ProjectDocumentation` join table.

**Relations:**
- `Project` ↔ `ProjectDocumentation` ↔ `WikiPage`
- One project can have multiple attached wiki pages
- One wiki page can be attached to multiple projects

**Legacy:** `Project.wikiPageId` exists but is separate (one-to-one primary wiki link).

**Attachment Process:**
1. User clicks "Attach Documentation" in project detail page
2. `WikiPageSelector` dialog opens, shows pages from same workspace
3. User selects page → `POST /api/projects/[projectId]/documentation` with `{ wikiPageId }`
4. Server validates: `wikiPage.workspaceId === project.workspaceId`
5. Creates `ProjectDocumentation` record

**Evidence:** `src/app/api/projects/[projectId]/documentation/route.ts:211-215`

### 6. Biggest Inconsistencies Currently

**1. Naming Confusion:**
- "Spaces" in UI refers to Projects (left nav "Projects" link)
- Wiki "Spaces" (`wiki_workspaces`) are separate concept
- `ProjectSpace` is yet another concept (visibility container)
- **Evidence:** No dedicated "Spaces" nav item; Projects and Wiki are separate

**2. Wiki Space Relationship:**
- `WikiPage.workspace_type` is string field, not FK to `wiki_workspaces`
- No database constraint ensures `workspace_type` references valid space
- Could reference non-existent space or space from different workspace
- **Evidence:** `prisma/schema.prisma:214` (string field) vs `wiki_workspaces` table

**3. Dual Wiki Linking:**
- `Project.wikiPageId` (legacy primary wiki - one-to-one)
- `ProjectDocumentation` (new many-to-many attachment)
- Both exist simultaneously, unclear which to use
- **Evidence:** `prisma/schema.prisma:699` (`wikiPageId`) and `1088-1101` (`ProjectDocumentation`)

**4. Workspace Context Resolution:**
- Multiple ways to determine workspace: URL slug, query param, header, default
- Priority order documented but may be inconsistent across routes
- **Evidence:** `src/lib/unified-auth.ts:190-352` (priority order)

**5. Content Format Handling:**
- New pages always JSON (`contentFormat: 'JSON'` enforced)
- Legacy pages remain HTML
- UI must check `contentFormat` to render correctly
- **Evidence:** `src/app/api/wiki/pages/route.ts:183` (hardcoded JSON), `src/components/wiki/wiki-page-body.tsx:88` (format check)

---

## Evidence Files

**Key Files Referenced:**
- `prisma/schema.prisma` - Complete data model
- `src/lib/unified-auth.ts` - Workspace context resolution
- `src/lib/auth/assertAccess.ts` - Workspace access control
- `src/lib/pm/guards.ts` - Project access control
- `src/app/api/projects/route.ts` - Project list/create
- `src/app/api/projects/[projectId]/documentation/route.ts` - Project-wiki attachment
- `src/app/api/wiki/pages/route.ts` - Wiki page CRUD
- `src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx` - Projects UI
- `src/app/(dashboard)/wiki/[slug]/page.tsx` - Wiki page UI
- `src/components/projects/project-documentation-section.tsx` - Attachment UI

---

**End of Document**
