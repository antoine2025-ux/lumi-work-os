# Implementation Plan: Make Activity Model Workspace-Scoped

## Current State Summary

### How Workspaces and Memberships Work
- **`Workspace`** model: Primary tenant container with `id`, `name`, `slug`, `ownerId`
- **`WorkspaceMember`** model: Links users to workspaces with roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)
- **Membership validation**: Done via `WorkspaceMember.findUnique()` using composite key `[workspaceId, userId]`

### How `getUnifiedAuth` + `assertAccess` Work
- **`getUnifiedAuth(request)`**: Resolves `workspaceId` from URL params → header → user's first workspace → creates default if needed
- **`assertAccess()`**: Validates workspace membership via `WorkspaceMember` table, throws 403 if unauthorized
- **Pattern**: All API routes call `getUnifiedAuth()` → `assertAccess()` → query with `where: { workspaceId: auth.workspaceId }`

### Current Problems
1. **Activity model missing `workspaceId`**: No workspace scoping - potential data leak
2. **Prisma scoping middleware disabled**: No automatic filtering (relies on manual `where` clauses)
3. **`/api/workspaces` returns only first workspace**: Blocks multi-workspace UX (not fixing in this PR)

---

## Files to Modify

### 1. `prisma/schema.prisma`
**Changes**:
- Add `workspaceId String` field to `Activity` model
- Add `workspace Workspace @relation(fields: [workspaceId], references: [id])` relation
- Add `@@index([workspaceId])` for efficient workspace queries
- Add `@@index([workspaceId, createdAt(sort: Desc)])` for common activity feed queries
- Update `Workspace` model to include `activities Activity[]` relation

### 2. `src/lib/loopbrain/context-engine.ts`
**Changes**:
- **Line 714**: Update `getActivityContext()` to filter by `workspaceId` directly instead of workaround
- Remove the workaround logic (lines 730-761) that fetches all activities and filters client-side
- Replace with direct `where: { workspaceId }` query
- Update comment on line 704-706 to reflect fix

### 3. `src/app/api/ai/chat/route.ts`
**Changes**:
- **Line 312**: Add `workspaceId` filter to Activity query
- Currently filters by `actorId` only - add `workspaceId: workspaceId` to `where` clause
- Note: This query uses `chatSession.userId` - need to ensure `workspaceId` is available from auth context

### 4. Migration File (to be generated)
**File**: `prisma/migrations/[timestamp]_add_workspace_to_activity/migration.sql`
**Changes**:
- Add `workspaceId` column (nullable initially for data migration)
- Add foreign key constraint to `workspaces` table
- Add indexes
- Data migration: Backfill `workspaceId` from related entities (Project, Task, WikiPage) based on `entity` and `entityId`
- Set `workspaceId` to NOT NULL after backfill
- Handle orphaned activities (if any) - either delete or set to a default workspace

---

## Implementation Steps

### Step A: Schema Changes

1. **Update `prisma/schema.prisma`**:
   - Add `workspaceId` field to Activity model
   - Add Workspace relation
   - Add indexes
   - Add reverse relation to Workspace model

2. **Generate migration**:
   ```bash
   npx prisma migrate dev --name add_workspace_to_activity --create-only
   ```

3. **Edit migration SQL**:
   - Make `workspaceId` nullable initially
   - Add data migration logic to backfill from related entities
   - Set NOT NULL constraint after backfill

### Step B: Code Updates

1. **Update `src/lib/loopbrain/context-engine.ts`**:
   - Replace workaround with direct `workspaceId` filter
   - Remove client-side filtering logic
   - Update comments

2. **Update `src/app/api/ai/chat/route.ts`**:
   - Add `workspaceId` filter to Activity query
   - Ensure `workspaceId` is available from auth context

### Step C: Data Migration

1. **Backfill strategy** (deterministic only):
   - For `entity = 'project'`: Join with `projects` table to get `workspaceId`
   - For `entity = 'task'`: Join with `tasks` table to get `workspaceId` (tasks have workspaceId directly)
   - For `entity = 'wiki_page'`: Join with `wiki_pages` table to get `workspaceId`
   - **Do NOT infer from actor's workspace membership** - unsafe when user belongs to multiple workspaces

2. **Handle orphaned activities**:
   - After deterministic backfill, **delete** any Activity rows that still have NULL `workspaceId`
   - Acceptable to lose legacy rows to guarantee tenant safety

---

## Data Migration SQL (to be added to migration file)

```sql
-- Step 1: Add workspaceId column (nullable)
ALTER TABLE "activities" ADD COLUMN "workspaceId" TEXT;

-- Step 2: Backfill workspaceId from related entities (deterministic only)
UPDATE "activities" a
SET "workspaceId" = (
  CASE 
    WHEN a."entity" = 'project' THEN (SELECT p."workspaceId" FROM "projects" p WHERE p."id" = a."entityId")
    WHEN a."entity" = 'task' THEN (SELECT t."workspaceId" FROM "tasks" t WHERE t."id" = a."entityId")
    WHEN a."entity" = 'wiki_page' THEN (SELECT w."workspaceId" FROM "wiki_pages" w WHERE w."id" = a."entityId")
    ELSE NULL
  END
)
WHERE a."workspaceId" IS NULL;

-- Step 3: Delete activities that still have NULL workspaceId (orphaned)
-- This ensures tenant safety - we accept losing legacy rows
DELETE FROM "activities" WHERE "workspaceId" IS NULL;

-- Step 4: Add NOT NULL constraint
ALTER TABLE "activities" ALTER COLUMN "workspaceId" SET NOT NULL;

-- Step 5: Add foreign key constraint
ALTER TABLE "activities" ADD CONSTRAINT "activities_workspaceId_fkey" 
  FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Add indexes
CREATE INDEX "idx_activities_workspace" ON "activities"("workspaceId");
CREATE INDEX "idx_activities_workspace_created" ON "activities"("workspaceId", "createdAt" DESC);
```

---

## Scope Confirmation

**This PR will ONLY:**
- ✅ Update Activity model schema (add `workspaceId` field, relation, indexes)
- ✅ Update Activity queries in `src/lib/loopbrain/context-engine.ts` to filter by `workspaceId`
- ✅ Update Activity queries in `src/app/api/ai/chat/route.ts` to filter by `workspaceId`

**This PR will NOT:**
- ❌ Modify `/api/workspaces` endpoint (handled in later step)
- ❌ Re-enable Prisma scoping middleware (handled in later step)

---

## Testing Checklist

- [ ] Migration runs successfully on dev database
- [ ] All existing activities get `workspaceId` backfilled correctly
- [ ] `getActivityContext()` returns only activities for the requested workspace
- [ ] `/api/ai/chat` returns only activities for the user's workspace
- [ ] No activities leak across workspaces
- [ ] Orphaned activities are handled appropriately

---

## Notes

- **Activity creation**: Currently no code creates Activity records, but schema must be ready for future use
- **Backward compatibility**: Migration handles existing data gracefully
- **Performance**: Indexes added for efficient workspace-scoped queries
- **Safety**: Foreign key ensures referential integrity
