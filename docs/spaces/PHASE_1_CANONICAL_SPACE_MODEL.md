# Phase 1: Canonical Space Model

**Status:** ✅ Implemented  
**Date:** 2025-01-XX  
**Purpose:** Introduce unified Space model without breaking existing functionality

---

## Overview

Phase 1 introduces a canonical `Space` model that unifies the concepts of:
- `ProjectSpace` (project visibility containers)
- `wiki_workspaces` + `WikiPage.workspace_type` (wiki organization)

This is done **in parallel** with existing systems - no breaking changes. Legacy fields remain functional.

---

## Data Model

### Space Model

```prisma
model Space {
  id          String          @id @default(cuid())
  workspaceId String         // FK to Workspace (required)
  name        String
  description String?
  type        SpaceType      // PERSONAL | TEAM | CUSTOM
  visibility  SpaceVisibility // PUBLIC | TARGETED | PRIVATE
  ownerId     String?        // Required for PERSONAL, null for TEAM/CUSTOM
  legacySource Json?          // Stores mapping to legacy sources
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  // Relations...
}
```

**Enums:**
- `SpaceType`: `PERSONAL`, `TEAM`, `CUSTOM`
- `SpaceVisibility`: `PUBLIC`, `TARGETED`, `PRIVATE`

### SpaceMember Model

```prisma
model SpaceMember {
  id        String   @id @default(cuid())
  spaceId   String   // FK to Space
  userId    String   // FK to User
  role      String?  // Optional role
  joinedAt  DateTime @default(now())
  // Relations...
}
```

**Unique Constraint:** `[spaceId, userId]`

### New Fields on Existing Models

**Project:**
- `spaceId String?` - FK to Space (nullable in Phase 1)

**WikiPage:**
- `spaceId String?` - FK to Space (nullable in Phase 1)

**Indexes:**
- `idx_projects_workspace_space` on `[workspaceId, spaceId]`
- `idx_wiki_pages_workspace_space` on `[workspaceId, spaceId]`

---

## Backfill Rules

### Canonical Spaces Creation

**1. TEAM Space (per Workspace)**
- **Type:** `TEAM`
- **Visibility:** `PUBLIC`
- **Name:** "Team Space"
- **Owner:** `null`
- **Created:** One per workspace (idempotent)

**2. PERSONAL Space (per User per Workspace)**
- **Type:** `PERSONAL`
- **Visibility:** `PRIVATE`
- **Name:** "Personal Space"
- **Owner:** User ID (required)
- **Created:** One per `WorkspaceMember` (idempotent)

### Legacy Mapping

**ProjectSpace → Space:**
- Maps each `ProjectSpace` to a `Space` (type `CUSTOM`)
- `ProjectSpace.visibility` → `Space.visibility`:
  - `PUBLIC` → `PUBLIC`
  - `TARGETED` → `TARGETED`
- `ProjectSpaceMember` → `SpaceMember` (copied)
- Mapping stored in `Space.legacySource.projectSpaceId`

**wiki_workspaces → Space:**
- Maps each `wiki_workspaces` entry to a `Space`
- Type determination:
  - `type === 'personal'` → `PERSONAL` (with `ownerId`)
  - `type === 'team'` → `TEAM`
  - Otherwise → `CUSTOM`
- Visibility: `is_private ? PRIVATE : PUBLIC`
- Mapping stored in `Space.legacySource.wikiWorkspaceId`

### Backfill FK Fields

**Project.spaceId:**
- If `projectSpaceId` exists → map via `ProjectSpace` → `Space`
- Else → set to canonical `TEAM` space

**WikiPage.spaceId:**
- `workspace_type === 'personal'` → user's `PERSONAL` space (if `createdById` exists)
- `workspace_type === 'team'` or `null` → canonical `TEAM` space
- Custom `workspace_type` → map via `wiki_workspaces` → `Space`
- Fallback → canonical `TEAM` space

---

## API Endpoints

### GET /api/spaces

**Returns:** List of spaces user can access in current workspace

**Access Rules:**
- `PUBLIC` spaces: All workspace members
- `TARGETED` spaces: Only `SpaceMember`
- `PERSONAL` spaces: Only owner

**Response:**
```json
{
  "spaces": [
    {
      "id": "...",
      "name": "Team Space",
      "type": "TEAM",
      "visibility": "PUBLIC",
      "ownerId": null,
      "_count": {
        "members": 0,
        "projects": 5,
        "wikiPages": 12
      }
    }
  ]
}
```

### POST /api/spaces

**Creates:** A `CUSTOM` space

**Input:**
```json
{
  "name": "My Custom Space",
  "description": "Optional description",
  "visibility": "TARGETED",
  "memberUserIds": ["user1", "user2"]
}
```

**Rules:**
- Only `CUSTOM` type can be created via API
- `TEAM` and `PERSONAL` spaces are auto-created by backfill
- If `visibility === 'TARGETED'`, `memberUserIds` are added as `SpaceMember`
- Creator is automatically added as member for `TARGETED` spaces

---

## Enforcement Rules

### Project-Wiki Attachment

**Current (Phase 1):**
- ✅ Must match `workspaceId` (existing)
- ✅ If both `project.spaceId` and `wikiPage.spaceId` are populated, they must match
- ⚠️ If one/both are `null` (legacy), allow but log warning

**Error Message:**
```
"Wiki page must belong to the same space as the project. Project space and wiki page space do not match."
```

### WikiPageSelector Filtering

**When `project.spaceId` is provided:**
- Filters pages by `spaceId` (server-side)
- Includes pages without `spaceId` (legacy) if `includeLegacy=true`
- Visual indicators can be added in Phase 2 to mark legacy pages

---

## What Is Still Legacy

**Not Changed in Phase 1:**
- ✅ `ProjectSpace` model (still functional)
- ✅ `ProjectSpaceMember` model (still functional)
- ✅ `Project.projectSpaceId` field (still functional)
- ✅ `wiki_workspaces` table (still functional)
- ✅ `WikiPage.workspace_type` field (still functional)
- ✅ `WikiPage.permissionLevel` field (still functional)

**These will be deprecated in Phase 2+**

---

## How to Run Backfill

### Prerequisites

1. Run Prisma migration:
```bash
npx prisma migrate dev --name add_canonical_spaces
```

2. Generate Prisma client:
```bash
npx prisma generate
```

### Run Backfill Script

**Via npm (if added to package.json):**
```bash
npm run backfill:spaces
```

**Directly:**
```bash
ts-node scripts/backfill-canonical-spaces.ts
```

### Idempotency

The backfill script is **idempotent** - safe to run multiple times:
- Checks for existing spaces before creating
- Uses `upsert` for memberships
- Only updates records where `spaceId IS NULL`

### Verification

After running backfill, verify:
```sql
-- Check canonical spaces created
SELECT type, COUNT(*) FROM spaces GROUP BY type;

-- Check Projects with spaceId
SELECT COUNT(*) FROM projects WHERE spaceId IS NOT NULL;

-- Check WikiPages with spaceId
SELECT COUNT(*) FROM wiki_pages WHERE spaceId IS NOT NULL;
```

---

## Known Limitations

### Phase 1 Limitations

1. **No UI Changes**
   - Spaces are not exposed in UI yet
   - Users cannot see/manage spaces
   - Only API endpoints available

2. **Legacy Data Coexistence**
   - `workspace_type` and `spaceId` both exist
   - No automatic sync between them
   - Backfill is one-time (doesn't keep them in sync)

3. **wiki_workspaces Mapping**
   - Uses raw SQL queries (not Prisma model)
   - Some edge cases may not map correctly
   - Custom spaces without clear owner → `CUSTOM PRIVATE` with `ownerId=null`

4. **Default Space Assignment**
   - New projects default to `TEAM` space (if not specified)
   - New wiki pages default to `TEAM` space (if not specified)
   - Personal page detection not yet implemented in creation flows

5. **Attachment Enforcement**
   - Only enforced when both `spaceId` values are populated
   - Legacy attachments (with nulls) still allowed
   - Warning logged but not blocking

### Migration Path

**Phase 2 (Future):**
- Add UI for space management
- Update creation flows to explicitly set space context
- Remove legacy fields
- Enforce spaceId matching strictly (no nulls allowed)

---

## Testing Checklist

### Acceptance Criteria Verification

- [x] Prisma migrate runs successfully
- [x] Backfill script can run twice without duplicating spaces
- [x] Creating a project continues to work (no UI changes)
- [x] Creating a wiki page continues to work (no UI changes)
- [x] New projects get `spaceId` (defaults to TEAM)
- [x] New wiki pages get `spaceId` (defaults to TEAM)
- [x] Attaching page with `spaceId` to project with different `spaceId` is blocked (400)
- [x] Existing attachments continue to work (legacy nulls allowed)

### Manual Testing

1. **Run Migration:**
   ```bash
   npx prisma migrate dev --name add_canonical_spaces
   ```

2. **Run Backfill:**
   ```bash
   ts-node scripts/backfill-canonical-spaces.ts
   ```

3. **Verify Spaces Created:**
   - Check `/api/spaces` endpoint returns spaces
   - Verify TEAM space exists for workspace
   - Verify PERSONAL spaces exist for users

4. **Test Project Creation:**
   - Create new project via UI
   - Verify `spaceId` is set (check database)
   - Should default to TEAM space

5. **Test Wiki Page Creation:**
   - Create new wiki page via UI
   - Verify `spaceId` is set (check database)
   - Should default to TEAM space

6. **Test Attachment Enforcement:**
   - Create project in TEAM space
   - Create wiki page in PERSONAL space
   - Try to attach → should fail with 400 error
   - Create wiki page in same TEAM space
   - Try to attach → should succeed

---

## Files Changed

### Schema
- `prisma/schema.prisma` - Added `Space`, `SpaceMember` models, enums, and FK fields

### Scripts
- `scripts/backfill-canonical-spaces.ts` - Backfill utility

### API Routes
- `src/app/api/spaces/route.ts` - GET/POST endpoints
- `src/app/api/projects/[projectId]/documentation/route.ts` - Updated attachment enforcement
- `src/app/api/wiki/pages/route.ts` - Added `spaceId` filter support

### Components
- `src/components/projects/wiki-page-selector.tsx` - Added `spaceId` prop and filtering
- `src/components/projects/project-documentation-section.tsx` - Passes `spaceId` to selector

---

## Next Steps (Phase 2)

1. Add UI for space management
2. Update creation flows to explicitly set space context
3. Remove legacy fields (`projectSpaceId`, `workspace_type`, `permissionLevel`)
4. Enforce strict spaceId matching (no nulls)
5. Add space selection in project/wiki creation dialogs

---

**End of Phase 1 Documentation**
