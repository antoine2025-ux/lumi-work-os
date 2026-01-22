# Database Safety Report

**Purpose:** Verify migration safety, data integrity, and Prisma client consistency  
**Status:** ⚠️ **NOT YET VERIFIED** - Commands defined, need execution

---

## Migration Analysis

### Activity Model Migration

**Migration File:** `prisma/migrations/20251210110313_add_workspace_to_activity/migration.sql`

**Steps:**
1. Add `workspaceId` column (nullable initially)
2. Backfill from related entities (projects, tasks, wiki_pages)
3. Delete orphaned activities (NULL workspaceId)
4. Set NOT NULL constraint
5. Add foreign key constraint
6. Add indexes

**Safety Checks:**
- ✅ Migration is idempotent (can be run multiple times safely)
- ⚠️ Deletes orphaned activities (data loss for un-scopable activities)
- ✅ Foreign key ensures referential integrity

---

## Migration Test Commands

### Test 1: Fresh Database

**Command:**
```bash
# Reset database
pnpm prisma migrate reset --force

# Apply all migrations
pnpm prisma migrate deploy

# Verify Activity table
pnpm prisma db execute --stdin <<EOF
SELECT 
  COUNT(*) as total_activities,
  COUNT(workspaceId) as with_workspace,
  COUNT(*) - COUNT(workspaceId) as without_workspace
FROM activities;
EOF
```

**Expected:**
- All migrations apply successfully
- Activity table has `workspaceId` column
- All activities have `workspaceId` (or table is empty)

**Actual:** ❓ **NOT TESTED**

---

### Test 2: Existing Database with Data

**Command:**
```bash
# Backup current database (if production-like)
# pg_dump $DATABASE_URL > backup.sql

# Check current Activity rows
pnpm prisma db execute --stdin <<EOF
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT "workspaceId") as unique_workspaces,
  COUNT(CASE WHEN "workspaceId" IS NULL THEN 1 END) as null_workspace
FROM activities;
EOF

# Apply migration
pnpm prisma migrate deploy

# Verify after migration
pnpm prisma db execute --stdin <<EOF
SELECT 
  COUNT(*) as total,
  COUNT(DISTINCT "workspaceId") as unique_workspaces,
  COUNT(CASE WHEN "workspaceId" IS NULL THEN 1 END) as null_workspace
FROM activities;
EOF
```

**Expected:**
- Migration applies without errors
- All activities have `workspaceId` (NULL rows deleted)
- No orphaned activities remain

**Actual:** ❓ **NOT TESTED**

---

### Test 3: Rollback Safety

**Command:**
```bash
# Check if migration can be rolled back
# Note: Prisma doesn't support automatic rollback, need manual SQL

# Manual rollback SQL (for testing only):
pnpm prisma db execute --stdin <<EOF
-- Remove foreign key
ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "activities_workspaceId_fkey";

-- Remove indexes
DROP INDEX IF EXISTS "idx_activities_workspace";
DROP INDEX IF EXISTS "idx_activities_workspace_created";

-- Make column nullable
ALTER TABLE "activities" ALTER COLUMN "workspaceId" DROP NOT NULL;

-- Remove column (data loss - only for testing)
-- ALTER TABLE "activities" DROP COLUMN "workspaceId";
EOF
```

**Expected:**
- Rollback SQL executes (for testing)
- ⚠️ Data loss if column is dropped (expected)

**Actual:** ❓ **NOT TESTED**

---

## Data Integrity Checks

### Check 1: Existing Activity Rows Without workspaceId

**Command:**
```bash
pnpm prisma db execute --stdin <<EOF
SELECT 
  id,
  "actorId",
  entity,
  "entityId",
  action,
  "createdAt"
FROM activities
WHERE "workspaceId" IS NULL
LIMIT 10;
EOF
```

**Expected:**
- No rows returned (all have workspaceId)
- Or rows returned (need backfill strategy)

**Actual:** ❓ **NOT TESTED**

**Backfill Strategy (if needed):**
- Migration already handles backfill
- Orphaned activities are deleted (acceptable data loss)

---

### Check 2: Foreign Key Integrity

**Command:**
```bash
pnpm prisma db execute --stdin <<EOF
SELECT 
  a.id,
  a."workspaceId",
  w.id as workspace_exists
FROM activities a
LEFT JOIN workspaces w ON a."workspaceId" = w.id
WHERE w.id IS NULL
LIMIT 10;
EOF
```

**Expected:**
- No rows returned (all workspaceIds are valid)
- Foreign key constraint prevents invalid references

**Actual:** ❓ **NOT TESTED**

---

## Environment Safety

### Check 1: Migration Command Safety

**Local Development:**
```bash
# Safe: Uses DATABASE_URL from .env.local
pnpm prisma migrate dev
```

**Production:**
```bash
# Safe: Only applies pending migrations
pnpm prisma migrate deploy
```

**Risk:** Running `migrate dev` in production could create new migrations

**Mitigation:**
- ✅ `migrate deploy` only applies existing migrations
- ⚠️ No explicit guardrails in code
- ✅ CI/CD should use `migrate deploy`, not `migrate dev`

---

### Check 2: Database Connection Safety

**Code Location:** `src/lib/db.ts:136`

**Safety Checks:**
- ✅ Warns if database name matches test patterns (`_shadow`, `_test`)
- ✅ Verifies DIRECT_URL matches DATABASE_URL
- ⚠️ Only warns, doesn't prevent connection

**Command to Test:**
```bash
# Should show warning if connected to wrong DB
pnpm dev
# Check console for: "[DB INIT] ❌ CRITICAL: Connected to wrong database!"
```

**Actual:** ❓ **NOT TESTED**

---

## Prisma Client Verification

### Check 1: Single Client Instance

**Command:**
```bash
# Search for Prisma client imports
grep -r "from.*@/lib/prisma" src/ | wc -l
# Should be 0 (legacy file deleted)

grep -r "from.*@/lib/db" src/ | grep "prisma" | wc -l
# Should be > 0 (new imports)
```

**Expected:**
- No imports from `@/lib/prisma` (legacy)
- All imports from `@/lib/db`

**Actual:** ❓ **NOT TESTED**

---

### Check 2: Edge Runtime Compatibility

**Code Location:** `src/lib/db.ts`

**Checks:**
- ✅ Uses `globalThis` for singleton (Edge-compatible)
- ✅ Handles PgBouncer (Supabase pooler)
- ✅ Disables prepared statements for pooler

**Test:**
```bash
# Build for Edge runtime
pnpm build
# Check for Edge runtime errors
```

**Actual:** ❓ **NOT TESTED**

---

## Verification Results

| Check | Status | Evidence |
|-------|--------|----------|
| Fresh DB migration | ❌ Not Tested | - |
| Existing DB migration | ❌ Not Tested | - |
| Rollback safety | ❌ Not Tested | - |
| Activity workspaceId integrity | ❌ Not Tested | - |
| Foreign key integrity | ❌ Not Tested | - |
| Migration command safety | ⚠️ Partial | Code review only |
| Database connection safety | ⚠️ Partial | Code review only |
| Prisma client consolidation | ⚠️ Partial | Grep search needed |
| Edge runtime compatibility | ❌ Not Tested | - |

---

## Commands to Execute

```bash
# 1. Test fresh database migration
pnpm prisma migrate reset --force
pnpm prisma migrate deploy

# 2. Check Activity table structure
pnpm prisma db execute --stdin <<EOF
\d activities
EOF

# 3. Verify Prisma client imports
grep -r "from.*@/lib/prisma" src/
grep -r "from.*@/lib/db" src/ | grep "prisma" | head -5

# 4. Test build
pnpm build

# 5. Test typecheck
pnpm typecheck
```

---

**Status:** ⚠️ **COMMANDS DEFINED - EXECUTION REQUIRED**
