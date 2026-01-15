# Phase 1 - Step 1.2: Running the Migration

## Migration Ordering Fix (2025-12-29)

**Important:** The init migration has been renamed to ensure correct ordering:
- **Old name:** `20251005064746_init` (dated Oct 2025, ran after Jan 2025 migrations)
- **New name:** `20240101000000_init` (dated Jan 2024, runs first)

### Why This Was Necessary

Early 2025-01 migrations (e.g., `20250115000000_add_org_departments_teams`) depend on the `workspaces` table, which is created in the init migration. When the init migration was dated later (Oct 2025), Prisma's shadow database would fail with:

- **Error P3006/P1014:** "relation 'workspaces' does not exist"
- **Symptom:** `prisma migrate dev` fails during shadow database validation

### The Fix

The init migration folder was renamed to `20240101000000_init` so it sorts first alphabetically and runs before all other migrations. This ensures:
1. Core tables (`workspaces`, `users`, etc.) are created first
2. Dependent migrations can reference these tables safely
3. Shadow database validation passes

**This change is safe because:**
- The database had 0 applied migrations when the fix was made
- We fixed ordering before the first migration apply
- No production data was affected

## Prerequisites

1. **DATABASE_URL must be set** in your environment or `.env.local` file
2. Ensure your database is accessible
3. Have backup of your database (recommended for production)

## New Dev Setup

For fresh database setups, run migrations in order:

```bash
# 1. Ensure DATABASE_URL is set in .env.local
# DATABASE_URL="postgresql://user:password@localhost:5432/lumi_work_os?schema=public"

# 2. Apply all migrations (init runs first automatically)
npx prisma migrate dev

# 3. Generate Prisma Client
npx prisma generate

# 4. Restart dev server
npm run dev
```

## Running the Migration

### Option 1: Using Prisma Migrate (Recommended)

This will apply the migration and track it in Prisma's migration history:

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="your-database-url"

# Run the migration
npm run db:migrate:deploy
# OR
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

### Option 2: Using Prisma Migrate Dev (Development)

If you're in development and want Prisma to detect schema changes:

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="your-database-url"

# This will detect the schema changes and may prompt to create a migration
# If migration already exists, it will apply it
npx prisma migrate dev --name org_phase1_schema_truth

# Generate Prisma Client (usually done automatically)
npx prisma generate
```

### Option 3: Manual SQL Execution

If you prefer to run the SQL directly:

```bash
# Using psql
psql $DATABASE_URL -f prisma/migrations/20251227174218_org_phase1_schema_truth/migration.sql

# Or copy the SQL content and run it in your database client
# (Supabase SQL Editor, pgAdmin, DBeaver, etc.)
```

## What the Migration Does

1. Adds `ownerPersonId` column to `org_teams` table
2. Adds `workspaceId` column to `person_availability` table (with backfill)
3. Migrates `owner_assignments` from `orgId` to `workspaceId`
4. Migrates `person_manager_links` from `orgId` to `workspaceId`
5. Migrates `person_availability_health` from `orgId` to `workspaceId`
6. Updates all constraints, indexes, and foreign keys

## Verification

After running the migration, verify it worked:

```sql
-- Check that new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('org_teams', 'person_availability', 'owner_assignments', 'person_manager_links', 'person_availability_health')
AND column_name IN ('ownerPersonId', 'workspaceId');

-- Check that foreign keys exist
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY' 
AND table_name IN ('person_availability', 'owner_assignments', 'person_manager_links', 'person_availability_health');
```

## Notes

- The `orgId` columns remain in the tables temporarily (not dropped) to allow gradual code migration
- They should be removed in a future cleanup migration after all code paths are updated to use `workspaceId`
- The migration assumes `orgId == workspaceId` for backfill purposes
- If your data doesn't match this assumption, you may need to adjust the backfill logic

## Troubleshooting

### Error P3006/P1014: "relation 'workspaces' does not exist" (Shadow DB)
- **Cause:** Migration ordering issue - init migration must run first
- **Fix:** Ensure `prisma/migrations/20240101000000_init/` exists and `20251005064746_init/` does not
- **Verify:** `ls prisma/migrations | head -5` should show `20240101000000_init` first
- **Solution:** If you see the old init migration, rename it: `mv prisma/migrations/20251005064746_init prisma/migrations/20240101000000_init`

### Error: "relation does not exist"
- Ensure all previous migrations have been applied
- Check that your database schema is up to date
- Verify migration order: `ls prisma/migrations | head -10`

### Error: "duplicate key value violates unique constraint"
- This may occur if the migration is run twice
- Check the migration status: `npx prisma migrate status`

### Error: "column already exists"
- The migration uses `IF NOT EXISTS` clauses, but if a column was manually created, you may need to adjust the migration
- Check the current schema: `npx prisma db pull`

### Error: "Environment variable not found: DATABASE_URL"
- Ensure `.env.local` contains `DATABASE_URL`
- Check: `grep DATABASE_URL .env.local`
- See: `env.template` for format

