# Documentation Architecture Analysis

## Executive Summary

This document provides a comprehensive analysis of how documentation/wiki pages are modeled and used in the Loopwell 2.0 codebase, with a focus on their relationships to Workspaces, Spaces, and Projects.

**Key Finding**: Projects currently have a **one-to-many relationship** with WikiPages (one wiki page can be linked to multiple projects via `wikiPageId`), but there is **no many-to-many relationship** allowing a project to attach multiple documentation pages from Spaces.

---

## 1️⃣ Core Data Models (Prisma)

### Primary Documentation Model: `WikiPage`

**Location**: `prisma/schema.prisma` (lines 155-202)

**Key Fields**:
- `id`: String (primary key)
- `workspaceId`: String (links to Workspace)
- `title`: String
- `slug`: String (unique per workspace)
- `content`: String (full markdown/HTML content)
- `excerpt`: String? (auto-generated summary)
- `parentId`: String? (for hierarchical pages)
- `order`: Int (for sorting)
- `isPublished`: Boolean
- `tags`: String[]
- `workspace_type`: String? (values: `'personal'`, `'team'`, or custom workspace IDs)
- `permissionLevel`: String (default: `'team'`, can be `'personal'`)
- `category`: String (default: `'general'`)
- `createdById`: String (links to User)
- `createdAt`, `updatedAt`: DateTime

**Relations**:
- `workspace`: Workspace (many-to-one via `workspaceId`)
- `createdBy`: User (many-to-one via `createdById`)
- `parent`: WikiPage? (self-referential for hierarchy)
- `children`: WikiPage[] (reverse of parent)
- **`projects`: Project[]** (reverse relation - one wiki page can be linked to multiple projects)
- `attachments`: WikiAttachment[]
- `comments`: WikiComment[]
- `versions`: WikiVersion[]
- `chunks`: WikiChunk[] (for AI/vector search)
- `permissions`: WikiPagePermission[]
- `favorites`: WikiFavorite[]

**Indexes**:
- Unique constraint on `[workspaceId, slug]`
- Indexes on `workspace_type`, `workspaceId`, `tags`, `view_count`, `updatedAt`

### Supporting Models

**`wiki_workspaces`** (lines 888-906):
- Represents "Spaces" - organizational containers for wiki pages
- Fields: `id`, `workspace_id` (links to Workspace), `name`, `type` (`'personal'`, `'team'`, or null for custom), `color`, `icon`, `description`, `is_private`, `created_by_id`
- **Note**: This is NOT a direct relation to WikiPage. Instead, WikiPage uses `workspace_type` field to indicate which space it belongs to.

**`Workspace`** (lines 105-138):
- Top-level organization container
- Has `wikiPages: WikiPage[]` relation
- All wiki pages belong to a Workspace

**`Project`** (lines 602-637):
- **`wikiPageId`: String?** (optional foreign key to WikiPage)
- **`wikiPage`: WikiPage?** (optional relation - the "primary" documentation page)
- **`projects`: Project[]** (reverse relation on WikiPage - shows all projects using this wiki page)

**Key Insight**: The relationship between Project and WikiPage is:
- **One-to-Many from WikiPage's perspective**: One wiki page can be linked to multiple projects
- **Many-to-One from Project's perspective**: One project can have ONE wiki page (via `wikiPageId`)

---

## 2️⃣ API / Backend Layer for Documents

### Main Wiki Pages API

**`GET /api/wiki/pages`** (`src/app/api/wiki/pages/route.ts`)

**Purpose**: List all wiki pages for a workspace

**Query Parameters**:
- `page`, `limit`: Pagination
- `sortBy`, `sortOrder`: Sorting
- `includeContent`: Boolean (default: false, only returns metadata)

**Filtering**:
- Filters by `workspaceId` (from auth context)
- Only returns `isPublished: true` pages
- Does NOT filter by `workspace_type` or space - returns ALL pages in workspace

**Response Shape**:
```typescript
{
  data: WikiPage[], // Array of pages (metadata only unless includeContent=true)
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

**`POST /api/wiki/pages`** - Create new wiki page
- Accepts: `title`, `content`, `parentId`, `tags`, `category`, `permissionLevel`, `workspace_type`
- Creates page with `workspaceId` from auth context

**`GET /api/wiki/pages/[id]`** (`src/app/api/wiki/pages/[id]/route.ts`)
- Get single page by ID or slug
- Returns full page with relations (parent, children, comments, attachments, versions)

**`PUT /api/wiki/pages/[id]`** - Update page
**`DELETE /api/wiki/pages/[id]`** - Delete page

### Space-Specific APIs

**`GET /api/wiki/workspaces`** (`src/app/api/wiki/workspaces/route.ts`)
- Lists all wiki workspaces (Spaces) for the current workspace
- Auto-creates "Personal Space" if missing
- Returns array of `wiki_workspaces` records

**`GET /api/wiki/recent-pages`** (`src/app/api/wiki/recent-pages/route.ts`)
- **Key endpoint for space filtering**
- Query parameter: `workspace_type` (filters pages by space)
- Logic:
  - If `workspace_type='team'`: Returns pages with `workspace_type='team'` OR legacy pages (null `workspace_type` with non-personal permission)
  - If `workspace_type='personal'`: Returns pages with `workspace_type='personal'` OR legacy pages (null `workspace_type` with `permissionLevel='personal'`)
  - Otherwise: Returns pages with exact `workspace_type` match

**`GET /api/wiki/search`** - Search pages by query
**`GET /api/wiki/favorites`** - Get user's favorite pages
**`GET /api/wiki/page-counts`** - Get page counts per space

### Project APIs

**`GET /api/projects`** (`src/app/api/projects/route.ts`)
- Returns projects with `wikiPage` relation included (if `wikiPageId` is set)
- Does NOT filter or search by wiki pages

**`GET /api/projects/[projectId]`** (`src/app/api/projects/[projectId]/route.ts`)
- Returns single project with `wikiPage` relation:
  ```typescript
  wikiPage: {
    id: string,
    title: string,
    slug: string,
    content: string,
    updatedAt: string
  }
  ```

**`PUT /api/projects/[projectId]`**
- Accepts `wikiPageId` in request body (can be set to `null` to unlink)
- Updates the project's `wikiPageId` field

**`POST /api/projects`**
- Accepts `wikiPageId` in `ProjectCreateSchema` (optional)
- Can create project with wiki page linked from the start

---

## 3️⃣ Frontend Components for Documents in Spaces

### Main Wiki UI Components

**`src/components/wiki/wiki-layout.tsx`**
- Main layout component for wiki pages
- Loads pages via `/api/wiki/recent-pages?workspace_type=...`
- Filters pages client-side by `workspace_type` field:
  - Personal Space: `workspace_type === 'personal'` OR (null `workspace_type` AND `permissionLevel === 'personal'`)
  - Team Workspace: `workspace_type === 'team'` OR (null `workspace_type` AND `permissionLevel !== 'personal'`)
  - Custom Spaces: Exact `workspace_type` match

**`src/app/(dashboard)/wiki/workspace/[id]/page.tsx`**
- Space detail page
- Loads pages via `/api/wiki/recent-pages?limit=100&workspace_type=${id}`
- Displays all pages in that space

**`src/app/(dashboard)/wiki/personal-space/page.tsx`**
- Personal space page
- Filters pages with same logic as wiki-layout

**`src/app/(dashboard)/wiki/team-workspace/page.tsx`**
- Team workspace page
- Filters pages with same logic as wiki-layout

**`src/app/(dashboard)/wiki/[slug]/page.tsx`**
- Individual wiki page detail view
- Loads page via `/api/wiki/pages/[id]`

### Project-Wiki Integration Components

**`src/components/projects/wiki-page-selector.tsx`**
- Component for selecting a wiki page to link to a project
- Loads pages via `/api/wiki/pages?workspaceId=workspace-1` (hardcoded - needs fix)
- Shows searchable list of pages
- Calls `onWikiPageSelect(wikiPageId)` callback
- **Limitation**: Only allows selecting ONE page (current `wikiPageId` model)

**`src/components/projects/inline-wiki-viewer.tsx`**
- Displays the linked wiki page content in project detail view
- Loads page via `/api/wiki/pages/[id]`
- Shows markdown-rendered content
- Has fullscreen mode

**`src/app/(dashboard)/projects/[id]/page.tsx`** (lines 764-811)
- Project detail page
- Uses `InlineWikiViewer` to show linked wiki page
- Has dialog to select/change wiki page via `WikiPageSelector`
- Updates project via `PUT /api/projects/[projectId]` with `wikiPageId`

---

## 4️⃣ How Projects Currently Interact with Docs

### Current State: One-to-One Relationship

**Prisma Schema**:
```prisma
model Project {
  wikiPageId String?
  wikiPage   WikiPage? @relation(fields: [wikiPageId], references: [id])
}

model WikiPage {
  projects Project[]  // Reverse relation - shows all projects using this page
}
```

**What This Means**:
- ✅ A project can have **ONE** wiki page linked (via `wikiPageId`)
- ✅ A wiki page can be linked to **MULTIPLE** projects (reverse relation)
- ❌ A project **CANNOT** have multiple wiki pages attached
- ❌ There is **NO** many-to-many junction table

### Current Usage in Code

**Project Creation** (`src/app/api/projects/route.ts` line 247):
- `ProjectCreateSchema` includes optional `wikiPageId`
- Can create project with wiki page from the start

**Project Update** (`src/app/api/projects/[projectId]/route.ts` line 218):
- `ProjectUpdateSchema` includes optional `wikiPageId`
- Can set `wikiPageId` to `null` to unlink
- Can change `wikiPageId` to link a different page

**Project Detail Page** (`src/app/(dashboard)/projects/[id]/page.tsx`):
- Displays `project.wikiPage` if linked
- Has UI to select/change the linked page
- Shows wiki content inline below project description

**Frontend Components**:
- `WikiPageSelector`: Allows selecting ONE page
- `InlineWikiViewer`: Displays ONE page
- No UI exists for managing multiple linked pages

### Summary

**Projects currently DO have a direct link to docs/pages**, but it's:
- **One-to-one**: One project → one wiki page
- **Optional**: `wikiPageId` can be null
- **Bidirectional**: WikiPage can see all projects using it via reverse relation

**There is NO existing support for**:
- Multiple wiki pages per project
- Many-to-many relationship
- Junction table like `ProjectWikiPage` or `ProjectDocumentation`

---

## 5️⃣ Architecture Summary & Recommendation

### Where Do Docs Live?

**Storage Hierarchy**:
```
Workspace (top-level org)
  └── WikiPage (documentation pages)
       ├── workspaceId (required - links to Workspace)
       ├── workspace_type (optional - indicates which Space it belongs to)
       └── permissionLevel (team/personal - legacy support)
  
Wiki_workspaces (Spaces - organizational containers)
  ├── type: 'personal' (default Personal Space)
  ├── type: 'team' (Team Workspace - deprecated, not auto-created)
  └── type: null (custom spaces created by users)
```

**Key Points**:
- All wiki pages belong to a **Workspace** (via `workspaceId`)
- Pages are organized into **Spaces** via `workspace_type` field (not a direct foreign key)
- Spaces are stored in `wiki_workspaces` table but pages reference them via string matching on `workspace_type`

### Current Project-Documentation Relationship

**Model**: One-to-Many (WikiPage → Projects)
- One wiki page can be linked to multiple projects
- One project can have one wiki page
- Implemented via `Project.wikiPageId` foreign key

**Limitation**: Cannot attach multiple docs to one project

### Recommended Attachment Strategy

To implement **"Attach documentation to a project from existing docs in Spaces"** with support for **multiple pages**, you have two options:

#### Option A: Many-to-Many Junction Table (Recommended)

**Create new model**:
```prisma
model ProjectDocumentation {
  id        String   @id @default(cuid())
  projectId String
  pageId    String
  order     Int      @default(0)  // For ordering multiple docs
  createdAt DateTime @default(now())
  
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  page      WikiPage @relation(fields: [pageId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, pageId])
  @@index([projectId])
  @@index([pageId])
  @@map("project_documentation")
}
```

**Update existing models**:
```prisma
model Project {
  // Keep existing wikiPageId for backward compatibility (optional)
  wikiPageId String?
  wikiPage   WikiPage? @relation("ProjectPrimaryWiki", fields: [wikiPageId], references: [id])
  
  // Add new many-to-many relation
  documentation ProjectDocumentation[]
}

model WikiPage {
  // Keep existing reverse relation
  projects Project[] @relation("ProjectPrimaryWiki")
  
  // Add new reverse relation
  projectDocumentation ProjectDocumentation[]
}
```

**Benefits**:
- ✅ Supports multiple docs per project
- ✅ Maintains backward compatibility (existing `wikiPageId` still works)
- ✅ Can add metadata (order, created date) per attachment
- ✅ Clean separation of concerns

**Migration Path**:
1. Create `ProjectDocumentation` table
2. Optionally migrate existing `wikiPageId` values to new table
3. Keep `wikiPageId` for backward compatibility (or deprecate later)

#### Option B: Array Field (Simpler, Less Flexible)

**Update Project model**:
```prisma
model Project {
  linkedPageIds String[] @default([])  // Array of wiki page IDs
  // ... rest of fields
}
```

**Benefits**:
- ✅ Simpler - no junction table
- ✅ Faster queries (no joins)

**Drawbacks**:
- ❌ No metadata per attachment (order, created date)
- ❌ Harder to query "which projects use this page?"
- ❌ Array fields can be harder to work with in Prisma

### Files to Modify for Implementation

#### Prisma Schema
- **`prisma/schema.prisma`**: Add `ProjectDocumentation` model (Option A) or `linkedPageIds` field (Option B)

#### API Routes
- **`src/app/api/projects/[projectId]/route.ts`**:
  - GET: Include `documentation` relation with pages
  - PUT: Accept array of `pageIds` to attach/detach
  
- **`src/app/api/projects/[projectId]/documentation/route.ts`** (new):
  - POST: Attach a page to project
  - DELETE: Detach a page from project
  - GET: List all attached pages

- **`src/app/api/wiki/pages/route.ts`**:
  - Add query parameter to filter by space (`workspace_type`)
  - Return pages that can be attached to projects

#### Frontend Components

**`src/components/projects/documentation-attachment.tsx`** (new):
- Component to attach multiple docs from Spaces
- Shows list of available pages (filtered by space)
- Allows selecting multiple pages
- Shows attached pages with ability to remove/reorder

**`src/components/projects/documentation-list.tsx`** (new):
- Displays all attached documentation pages
- Shows page title, excerpt, last updated
- Links to full page view
- Allows removing attachments

**`src/app/(dashboard)/projects/[id]/page.tsx`**:
- Replace single `InlineWikiViewer` with `DocumentationList`
- Add "Attach Documentation" button/component
- Show attached docs below project description

**`src/components/projects/wiki-page-selector.tsx`**:
- Update to support multi-select (if using Option A)
- Filter pages by `workspace_type` (space)
- Show which space each page belongs to

#### Type Definitions
- **`src/types/wiki.ts`**: Add `ProjectDocumentation` type
- **`src/lib/pm/schemas.ts`**: Add schema for attaching/detaching docs

### Recommended Approach

**Use Option A (Junction Table)** because:
1. More flexible for future features (ordering, metadata, permissions)
2. Better query performance (indexed foreign keys)
3. Maintains backward compatibility
4. Follows existing patterns in codebase (similar to `ProjectMember`, `ProjectWatcher`)

### Implementation Checklist

1. ✅ **Database Migration**
   - Create `ProjectDocumentation` table
   - Add relations to `Project` and `WikiPage`
   - Optionally migrate existing `wikiPageId` values

2. ✅ **API Layer**
   - Update project GET to include `documentation` relation
   - Create documentation attachment endpoints
   - Update project PUT to handle documentation array

3. ✅ **Frontend Components**
   - Create documentation attachment picker (filters by space)
   - Create documentation list display
   - Update project detail page

4. ✅ **Backward Compatibility**
   - Keep `wikiPageId` field working (or migrate to new table)
   - Support both old and new attachment methods during transition

---

## Appendix: Key Files Reference

### Prisma Models
- `prisma/schema.prisma`: Lines 155-202 (WikiPage), 602-637 (Project), 888-906 (wiki_workspaces)

### API Routes
- `src/app/api/wiki/pages/route.ts`: Main wiki pages API
- `src/app/api/wiki/pages/[id]/route.ts`: Single page operations
- `src/app/api/wiki/recent-pages/route.ts`: Space-filtered pages
- `src/app/api/wiki/workspaces/route.ts`: Spaces management
- `src/app/api/projects/route.ts`: Project list/create
- `src/app/api/projects/[projectId]/route.ts`: Project detail/update

### Frontend Components
- `src/components/wiki/wiki-layout.tsx`: Main wiki layout with space filtering
- `src/components/projects/wiki-page-selector.tsx`: Single page selector
- `src/components/projects/inline-wiki-viewer.tsx`: Single page viewer
- `src/app/(dashboard)/projects/[id]/page.tsx`: Project detail page
- `src/app/(dashboard)/wiki/workspace/[id]/page.tsx`: Space detail page

### Type Definitions
- `src/types/wiki.ts`: WikiPage, Workspace types
- `src/lib/pm/schemas.ts`: Project create/update schemas

---

**End of Analysis**



