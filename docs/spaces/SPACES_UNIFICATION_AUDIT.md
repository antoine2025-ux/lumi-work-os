# Spaces Unification Audit

**Date:** 2025-01-XX  
**Purpose:** Audit current space/workspace enforcement, wiki page filtering, and project attachment flows to design unified Spaces model without breaking access control.

---

## 1. Confirmed Security Checks

### ✅ Fixed: Wiki Page Read Security Bug

**File:** `src/app/api/wiki/pages/[id]/route.ts`

**Issue Found:**
- When looking up wiki pages by ID (line 32), the query did NOT filter by `workspaceId`
- Only the slug lookup (line 79) filtered by `workspaceId`
- **Risk:** User could access wiki pages from different workspaces if they knew the page ID

**Fix Applied:**
```typescript
// BEFORE (INSECURE):
let page = await prisma.wikiPage.findUnique({
  where: { id: pageIdOrSlug },
  // ... no workspaceId filter
})

// AFTER (SECURE):
let page = await prisma.wikiPage.findFirst({
  where: { 
    id: pageIdOrSlug,
    workspaceId: auth.workspaceId  // ✅ Added workspaceId filter
  },
  // ...
})
```

**Note:** Changed from `findUnique` to `findFirst` because we're now filtering by both `id` and `workspaceId` (composite filter).

**Status:** ✅ Fixed

### ✅ Confirmed Secure: Other Wiki Endpoints

**GET /api/wiki/pages** (`src/app/api/wiki/pages/route.ts:54-64`)
- ✅ Filters by `workspaceId: auth.workspaceId`
- ✅ Server-enforced

**GET /api/wiki/recent-pages** (`src/app/api/wiki/recent-pages/route.ts:48-50`)
- ✅ Filters by `workspaceId: auth.workspaceId`
- ✅ Server-enforced
- ✅ Optional `workspace_type` filter (additional, not replacement)

**PUT /api/wiki/pages/[id]** (`src/app/api/wiki/pages/[id]/route.ts:170`)
- ✅ Uses `findUnique` by ID, but workspaceId is enforced via `setWorkspaceContext()` middleware
- ⚠️ **Note:** Relies on Prisma scoping middleware - verify this is working correctly

**DELETE /api/wiki/pages/[id]** (`src/app/api/wiki/pages/[id]/route.ts:342`)
- ✅ Uses `findUnique` by ID, but workspaceId is enforced via `setWorkspaceContext()` middleware
- ⚠️ **Note:** Relies on Prisma scoping middleware - verify this is working correctly

### ✅ Confirmed Secure: Project-Wiki Attachment

**POST /api/projects/[projectId]/documentation** (`src/app/api/projects/[projectId]/documentation/route.ts:211-215`)
- ✅ Explicitly checks: `if (wikiPage.workspaceId !== project.workspaceId) { return 400 }`
- ✅ Server-enforced workspace isolation

**GET /api/projects/[projectId]/documentation** (`src/app/api/projects/[projectId]/documentation/route.ts:81`)
- ✅ Uses `findMany` with `projectId` filter
- ✅ Project access check via `assertProjectAccess()` ensures workspace isolation

**DELETE /api/projects/[projectId]/documentation/[docId]** (`src/app/api/projects/[projectId]/documentation/[docId]/route.ts`)
- ✅ Project access check via `assertProjectAccess()` ensures workspace isolation

---

## 2. All Current "Spaces" Concepts and Where They Live

### A) `workspace_type` (WikiPage field)

**Type:** String field (not FK)  
**Purpose:** Identifies which "Space" a wiki page belongs to  
**Values:** `"personal"`, `"team"`, or custom space ID (from `wiki_workspaces` table)

**Usage Locations:**

| File | What It Does | Server/UI Filtering |
|------|--------------|-------------------|
| `prisma/schema.prisma:214` | Field definition: `workspace_type String? @default("team")` | N/A |
| `src/app/api/wiki/pages/route.ts:177,232-251` | Sets `workspace_type` on page creation (from request body or inferred from `permissionLevel`) | Server |
| `src/app/api/wiki/recent-pages/route.ts:25,57-80` | Filters pages by `workspace_type` query param (optional, additional to workspaceId) | Server |
| `src/app/api/wiki/pages/[id]/route.ts:204` | Returns `workspace_type` in response | Server |
| `src/components/wiki/wiki-layout.tsx:440-457` | Sets `workspace_type` when creating page (from URL path or state) | UI → Server |
| `src/components/wiki/wiki-ai-assistant.tsx:896-928` | Determines `workspace_type` from selected workspace metadata | UI → Server |
| `src/lib/wiki/create-page.ts:56,92-93` | Passes `workspace_type` to API | UI → Server |
| `src/app/(dashboard)/wiki/personal-space/page.tsx:112` | Filters pages client-side: `workspace_type === 'personal'` | UI-only (also server-filtered) |
| `src/app/(dashboard)/wiki/team-workspace/page.tsx:111` | Filters pages client-side: `workspace_type === 'team'` | UI-only (also server-filtered) |
| `src/app/(dashboard)/wiki/workspace/[id]/page.tsx:84` | Filters pages server-side: `workspace_type=${id}` | Server |
| `src/components/projects/project-documentation-section.tsx:126` | Displays `workspace_type` in UI | UI-only |

**Key Finding:** `workspace_type` is a **string field**, not a foreign key. The relationship to `wiki_workspaces` is maintained via string matching in application code.

### B) `permissionLevel` (WikiPage field)

**Type:** String field  
**Purpose:** Legacy field for access control (`"team"` or `"personal"`)  
**Values:** `"team"` (default), `"personal"`

**Usage Locations:**

| File | What It Does | Server/UI Filtering |
|------|--------------|-------------------|
| `prisma/schema.prisma:210` | Field definition: `permissionLevel String @default("team")` | N/A |
| `src/app/api/wiki/pages/route.ts:177,230-251` | Sets `permissionLevel` on creation (from request body or inferred from `workspace_type`) | Server |
| `src/app/api/wiki/recent-pages/route.ts:66,70` | Used in legacy fallback: `permissionLevel: { not: 'personal' }` for team pages | Server |
| `src/app/(dashboard)/wiki/personal-space/page.tsx:112` | Client-side filter: `permissionLevel === 'personal'` (fallback) | UI-only |
| `src/components/wiki/wiki-layout.tsx:456` | Sets `permissionLevel: isPersonalPage ? 'personal' : 'team'` | UI → Server |
| `src/lib/wiki/create-page.ts:55,89-90` | Passes `permissionLevel` to API | UI → Server |

**Key Finding:** `permissionLevel` is used as a **fallback** when `workspace_type` is null/empty. The logic tries to infer `workspace_type` from `permissionLevel` and vice versa.

### C) `wiki_workspaces` (Table)

**Type:** Database table (not Prisma model with relations)  
**Purpose:** Stores metadata about wiki "Spaces" (like folders)  
**Fields:** `id`, `workspace_id`, `name`, `type`, `color`, `icon`, `description`, `is_private`, `created_by_id`

**Usage Locations:**

| File | What It Does | Server/UI Filtering |
|------|--------------|-------------------|
| `prisma/schema.prisma:976-994` | Model definition (legacy table, not fully integrated) | N/A |
| `src/app/api/wiki/workspaces/route.ts` | CRUD endpoints for `wiki_workspaces` table | Server |
| `src/app/(dashboard)/wiki/home/page.tsx` | Lists all `wiki_workspaces` for current workspace | Server |
| `src/components/wiki/wiki-ai-assistant.tsx:899-915` | Uses `wiki_workspaces.type` to determine `workspace_type` | UI → Server |
| `src/lib/workspace-onboarding.ts:287-425` | Creates default `wiki_workspaces` entries on workspace creation | Server |

**Key Finding:** `wiki_workspaces.id` is used as the value for `WikiPage.workspace_type` (string matching), but there's **no foreign key constraint**. This means:
- `workspace_type` could reference non-existent spaces
- `workspace_type` could reference spaces from different workspaces
- No database-level referential integrity

### D) `ProjectSpace` (Model)

**Type:** Prisma model with FK relations  
**Purpose:** Visibility container for Projects within a Workspace  
**Fields:** `id`, `workspaceId`, `name`, `description`, `visibility` (PUBLIC/TARGETED)

**Usage Locations:**

| File | What It Does | Server/UI Filtering |
|------|--------------|-------------------|
| `prisma/schema.prisma:656-670` | Model definition | N/A |
| `src/app/api/project-spaces/route.ts` | CRUD endpoints for ProjectSpaces | Server |
| `src/app/api/projects/route.ts:119-151` | Filters projects by ProjectSpace visibility (PUBLIC/TARGETED) | Server |
| `src/lib/pm/guards.ts:83-125` | Checks ProjectSpace visibility in `assertProjectAccess()` | Server |
| `src/lib/pm/project-space-helpers.ts` | Helper functions for creating/managing ProjectSpaces | Server |
| `src/components/projects/create-project-dialog.tsx` | UI for selecting ProjectSpace | UI → Server |
| `src/components/projects/project-space-badge.tsx` | Displays ProjectSpace visibility badge | UI-only |

**Key Finding:** `ProjectSpace` is **properly normalized** with FK to `Workspace`. This is the model to follow for unified Spaces.

### E) `projectSpaceId` (Project field)

**Type:** Optional FK to `ProjectSpace`  
**Purpose:** Links a Project to a ProjectSpace (visibility container)

**Usage Locations:**

| File | What It Does | Server/UI Filtering |
|------|--------------|-------------------|
| `prisma/schema.prisma:701` | Field definition: `projectSpaceId String?` | N/A |
| `src/app/api/projects/route.ts:119-151` | Used in filtering logic (projects without space are legacy/PUBLIC) | Server |
| `src/lib/pm/guards.ts:83-125` | Used to check ProjectSpace visibility | Server |
| `src/components/projects/create-project-dialog.tsx` | Sets `projectSpaceId` on project creation | UI → Server |

**Key Finding:** `projectSpaceId` is **properly normalized** with FK constraint. This is the model to follow.

---

## 3. Wiki Page Creation + workspace_type Behavior

### Entry Points

| Entry Point | File | How `workspace_type` is Set | How `permissionLevel` is Set | Format |
|------------|------|----------------------------|------------------------------|--------|
| **POST /api/wiki/pages** | `src/app/api/wiki/pages/route.ts:157-312` | From request body `workspace_type`, or inferred from `permissionLevel`, or defaults to `'team'` | From request body `permissionLevel`, or inferred from `workspace_type`, or defaults to `'team'` | Always `'JSON'` (hardcoded) |
| **WikiLayout create** | `src/components/wiki/wiki-layout.tsx:451-458` | From URL path (`/wiki/workspace/[id]`) or state (`workspaceType`), or `'personal'` if `isPersonalPage` | `'personal'` if `isPersonalPage`, else `'team'` | `'JSON'` (via `createWikiPage`) |
| **Wiki AI Assistant** | `src/components/wiki/wiki-ai-assistant.tsx:896-933` | From `workspaces` array: `workspace.type === 'personal'` → `'personal'`, `workspace.type === 'team'` → `'team'`, else uses `workspaceId` as `workspace_type` | Inferred from `workspace_type` | `'JSON'` (via `createWikiPage`) |
| **Wiki New Page** | `src/app/(dashboard)/wiki/new/page.tsx:63-69` | **NOT SET** (defaults to `'team'` in API) | **NOT SET** (defaults to `'team'` in API) | `'JSON'` (via `createWikiPage`) |
| **Assistant Publish** | `src/app/api/assistant/publish/route.ts` | From request body or defaults | From request body or defaults | `'JSON'` |

### Logic Flow (from `src/app/api/wiki/pages/route.ts:230-251`)

```typescript
if (workspace_type) {
  // Explicit workspace_type provided - use it
  finalWorkspaceType = workspace_type
  // If permissionLevel matches workspace_type, use it; otherwise infer from workspace_type
  if (permissionLevel && (permissionLevel === 'personal' || permissionLevel === 'team')) {
    finalPermissionLevel = permissionLevel
  } else {
    finalPermissionLevel = workspace_type === 'personal' ? 'personal' : 'team'
  }
} else if (permissionLevel === 'personal') {
  // No workspace_type but permissionLevel is 'personal' - infer personal workspace
  finalWorkspaceType = 'personal'
  finalPermissionLevel = 'personal'
} else {
  // Default fallback
  finalWorkspaceType = 'team'
  finalPermissionLevel = permissionLevel || 'team'
}
```

### Key Findings

1. **All new pages use `contentFormat='JSON'`** ✅
   - Enforced in `POST /api/wiki/pages` (line 183)
   - All UI entry points use `createWikiPage()` helper which sets `contentFormat: 'JSON'`

2. **`workspace_type` defaults to `'team'`** if not provided
   - This may cause incorrect classification for pages created via `/wiki/new`

3. **Inconsistent `workspace_type` setting:**
   - `/wiki/new` page doesn't set `workspace_type` → defaults to `'team'`
   - WikiLayout infers from URL path or state
   - AI Assistant infers from workspace metadata
   - No unified way to determine which space a page belongs to

4. **`permissionLevel` and `workspace_type` are interdependent:**
   - If one is set, the other is inferred
   - This creates confusion and potential inconsistencies

---

## 4. Project Attachment Behavior + Filtering

### Attachment Endpoints

| Endpoint | File | What It Does | Filtering |
|----------|------|--------------|-----------|
| **GET /api/projects/[projectId]/documentation** | `src/app/api/projects/[projectId]/documentation/route.ts:27-154` | Lists all attached wiki pages for a project | Server: Filters by `projectId` (workspace isolation via `assertProjectAccess()`) |
| **POST /api/projects/[projectId]/documentation** | `src/app/api/projects/[projectId]/documentation/route.ts:156-356` | Attaches a wiki page to a project | Server: Validates `wikiPage.workspaceId === project.workspaceId` |
| **DELETE /api/projects/[projectId]/documentation/[docId]** | `src/app/api/projects/[projectId]/documentation/[docId]/route.ts` | Detaches a wiki page from a project | Server: Workspace isolation via `assertProjectAccess()` |

### WikiPageSelector Component

**File:** `src/components/projects/wiki-page-selector.tsx`

**Current Filtering:**
- **Line 99:** Fetches `/api/wiki/pages?workspaceId=${workspaceId}`
- **Server-side:** Filters by `workspaceId` only (see `src/app/api/wiki/pages/route.ts:54-64`)
- **Client-side:** Filters by search query, category, and `excludePageIds` (lines 128-138)
- **Does NOT filter by `workspace_type`** - shows all pages from the workspace

**Key Finding:** The selector shows **all wiki pages from the same workspace**, regardless of which "space" they belong to. There's no filtering by `workspace_type` or `ProjectSpace`.

### Attachment Flow

1. User clicks "Attach Documentation" in project detail page
2. `WikiPageSelector` dialog opens
3. Fetches all pages from workspace: `GET /api/wiki/pages?workspaceId=${workspaceId}`
4. User selects a page
5. `POST /api/projects/[projectId]/documentation` with `{ wikiPageId }`
6. Server validates: `wikiPage.workspaceId === project.workspaceId` ✅
7. Creates `ProjectDocumentation` record

### Current Rules

**✅ Enforced:**
- Wiki page and project must belong to the same workspace (`workspaceId` match)

**❌ NOT Enforced:**
- Wiki page and project do NOT need to belong to the same "space"
- A page from "personal" space can be attached to a project in "team" space
- A page from custom space `"wiki-123"` can be attached to any project in the workspace

### Recommended Safe Rule (Future)

**Minimal safe rule for unified Spaces:**
1. ✅ **Same workspace** (existing) - `wikiPage.workspaceId === project.workspaceId`
2. ✅ **Same space** (future) - `wikiPage.spaceId === project.spaceId` (when unified)

**Note:** Currently, there's no `spaceId` field on `WikiPage` or `Project`. This will need to be added in the unified Spaces model.

---

## 5. Risks / Migration Blockers

### Critical Risks

**1. String-Based Wiki Space Relationship**
- **Risk:** `WikiPage.workspace_type` is a string field, not a FK to `wiki_workspaces`
- **Impact:** No referential integrity, can reference non-existent spaces or spaces from different workspaces
- **Migration Blocker:** Must convert to FK relationship in unified Spaces model

**2. Inconsistent Space Classification**
- **Risk:** `/wiki/new` page doesn't set `workspace_type`, defaults to `'team'`
- **Impact:** Pages may be misclassified
- **Migration Blocker:** Need to determine space context for all creation flows

**3. Dual Space Concepts**
- **Risk:** `ProjectSpace` (for projects) and `wiki_workspaces` (for wiki pages) are separate concepts
- **Impact:** Confusion, no unified way to organize both projects and pages
- **Migration Blocker:** Must unify into single `Space` model

**4. PermissionLevel vs workspace_type Confusion**
- **Risk:** Two fields (`permissionLevel` and `workspace_type`) serve overlapping purposes
- **Impact:** Inconsistent data, hard to reason about
- **Migration Blocker:** Must consolidate into single space concept

### Medium Risks

**5. Client-Side Filtering Fallback**
- **Risk:** Some UI components filter by `workspace_type` client-side (e.g., `personal-space/page.tsx:112`)
- **Impact:** Can be bypassed, but server also filters so less critical
- **Migration Blocker:** Ensure all filtering is server-enforced

**6. Legacy Pages Without workspace_type**
- **Risk:** Old pages may have `workspace_type: null` and rely on `permissionLevel` fallback
- **Impact:** Need migration script to backfill `workspace_type` for legacy pages
- **Migration Blocker:** Must handle legacy data gracefully

**7. ProjectSpace Visibility Not Applied to Wiki Pages**
- **Risk:** `ProjectSpace` visibility (PUBLIC/TARGETED) only applies to projects, not wiki pages
- **Impact:** Wiki pages don't respect project space visibility rules
- **Migration Blocker:** Must extend visibility model to wiki pages in unified Spaces

### Low Risks

**8. No Reorder Endpoint for Documentation**
- **Risk:** `ProjectDocumentation.order` field exists but no endpoint to reorder
- **Impact:** Limited UX, but not a security issue
- **Migration Blocker:** Nice to have, not critical

**9. Cache Invalidation**
- **Risk:** Wiki page caches may not be invalidated when `workspace_type` changes
- **Impact:** Stale data, but not a security issue
- **Migration Blocker:** Ensure cache keys include space context

### Migration Recommendations

**Phase 1: Security Hardening**
- ✅ Fix wiki page read endpoint (DONE)
- Verify Prisma scoping middleware is working for PUT/DELETE endpoints
- Add explicit `workspaceId` filter to all wiki queries (don't rely only on middleware)

**Phase 2: Data Model Unification**
- Create unified `Space` model (replaces both `ProjectSpace` and `wiki_workspaces`)
- Add `spaceId` FK to both `Project` and `WikiPage`
- Migrate `workspace_type` string values to FK relationships
- Backfill `spaceId` for legacy pages

**Phase 3: Access Control Unification**
- Extend `ProjectSpace` visibility rules to wiki pages
- Ensure project-wiki attachment respects space boundaries
- Update `assertProjectAccess()` to check space membership for wiki pages

**Phase 4: UI Unification**
- Update all creation flows to explicitly set space context
- Remove `permissionLevel` field (replaced by space)
- Update filtering to use `spaceId` instead of `workspace_type` string

---

## Summary

**Current State:**
- ✅ Workspace isolation is enforced (via `workspaceId` FK)
- ✅ Project-wiki attachment validates same workspace
- ⚠️ Space organization is inconsistent (string-based for wiki, FK-based for projects)
- ⚠️ No unified space concept

**Security Status:**
- ✅ Fixed: Wiki page read endpoint now filters by `workspaceId`
- ✅ Confirmed: Other endpoints properly filter by workspace
- ⚠️ Verify: Prisma scoping middleware for PUT/DELETE endpoints

**Migration Path:**
1. Unify `ProjectSpace` and `wiki_workspaces` into single `Space` model
2. Convert `workspace_type` string to `spaceId` FK
3. Extend visibility rules to wiki pages
4. Update all creation/fltering flows to use unified space model

---

**End of Audit**
