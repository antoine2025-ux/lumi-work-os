# Performance Fix: Database Indexes

**Date:** January 2025  
**Issue:** Database queries taking 1.3+ seconds for simple lookups  
**Root Cause:** Missing composite indexes on frequently queried columns

---

## Problem Identified

From production logs:
- `getUnifiedAuth`: **1.36 seconds** (db: 1.35s)
  - User query: 0.56s
  - Workspace query: 0.79s
- `/api/org/positions`: **3.3 seconds** (db: 1.37s for just 4 positions!)

**This is NOT a payload size issue** - it's a **database performance issue**.

---

## Missing Indexes

### 1. OrgPosition: `workspaceId + isActive` (CRITICAL)

**Query:**
```sql
SELECT * FROM org_positions 
WHERE workspaceId = ? AND isActive = true
```

**Current:** Only has index on `workspaceId` (single column)  
**Needed:** Composite index on `(workspaceId, isActive)` with partial index for `isActive = true`

**Impact:** This query runs on EVERY org page load. Without the composite index, PostgreSQL has to:
1. Use `workspaceId` index to find all positions
2. Filter by `isActive = true` in memory (slow!)

**Fix:**
```sql
CREATE INDEX IF NOT EXISTS "idx_org_positions_workspace_active" 
ON "org_positions"("workspaceId", "isActive") 
WHERE "isActive" = true;
```

---

### 2. OrgPosition: `parentId` (CRITICAL)

**Query:**
```sql
SELECT parentId, COUNT(*) 
FROM org_positions 
WHERE workspaceId = ? AND isActive = true AND parentId IS NOT NULL
GROUP BY parentId
```

**Current:** No index on `parentId`  
**Needed:** Index on `parentId` (for GROUP BY)

**Impact:** The `groupBy` query for `childCount` is doing a full table scan.

**Fix:**
```sql
CREATE INDEX IF NOT EXISTS "idx_org_positions_parent_id" 
ON "org_positions"("parentId") 
WHERE "parentId" IS NOT NULL;
```

---

### 3. Workspace: `slug` (VERIFY)

**Query:**
```sql
SELECT * FROM workspaces WHERE slug = ?
```

**Current:** Should have index from `@unique`, but verify  
**Needed:** Ensure index exists

**Fix:**
```sql
CREATE INDEX IF NOT EXISTS "idx_workspaces_slug" 
ON "workspaces"("slug");
```

---

### 4. User: `email` (VERIFY)

**Query:**
```sql
SELECT * FROM users WHERE email = ?
```

**Current:** Should have index from `@unique`, but verify  
**Needed:** Ensure index exists

**Fix:**
```sql
CREATE INDEX IF NOT EXISTS "idx_users_email" 
ON "users"("email");
```

---

## Query Optimization

### Workspace Lookup by Slug

**Before (SLOW):**
```typescript
const workspace = await prisma.workspace.findUnique({
  where: { slug: workspaceSlug },
  include: {
    members: {
      where: { userId }  // Loads all members, filters client-side
    }
  }
})
```

**After (FAST):**
```typescript
const workspace = await prisma.workspace.findUnique({
  where: { slug: workspaceSlug },
  select: { id: true }  // Only need ID
})

const member = await prisma.workspaceMember.findUnique({
  where: {
    workspaceId_userId: {  // Uses composite index directly
      workspaceId: workspace.id,
      userId
    }
  }
})
```

**Why faster:**
- Doesn't load all workspace members
- Uses composite index `(workspaceId, userId)` directly
- Two simple queries instead of one complex query with filtering

---

## Migration

Created migration: `prisma/migrations/20250112150000_add_critical_performance_indexes/migration.sql`

**To apply:**
```bash
# Option 1: Run migration via Prisma
npx prisma migrate deploy

# Option 2: Run SQL directly in Supabase
# Copy contents of migration.sql and run in SQL Editor
```

---

## Expected Impact

### Before:
- `getUnifiedAuth`: 1,360ms
- `/api/org/positions`: 3,293ms (db: 1,369ms)

### After (estimated):
- `getUnifiedAuth`: 200-400ms (70-85% faster)
- `/api/org/positions`: 200-400ms (85-90% faster)

**Total improvement:** 2.5-3 seconds faster page load!

---

## Verification

After applying indexes, check logs for:
- `dbDurationMs` should drop from 1,300ms+ to <300ms
- `getUnifiedAuth` should be <500ms
- `/api/org/positions` should be <500ms

---

## Notes

1. **Partial indexes** (`WHERE isActive = true`) are smaller and faster than full indexes
2. **Composite indexes** are essential for multi-column WHERE clauses
3. **ANALYZE** command updates query planner statistics (included in migration)
4. Indexes may take a few minutes to build on large tables, but queries will be instant after

---

## Rollback

If indexes cause issues (unlikely), drop them:
```sql
DROP INDEX IF EXISTS "idx_org_positions_workspace_active";
DROP INDEX IF EXISTS "idx_org_positions_parent_id";
DROP INDEX IF EXISTS "idx_workspaces_slug";
DROP INDEX IF EXISTS "idx_users_email";
```
