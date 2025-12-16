# Running ProjectSpace Migration in Production

## Issue
The `project_spaces` table doesn't exist in production, causing workspace creation to fail.

## Migration to Run
`20250113000000_add_project_spaces/migration.sql`

## Safe Migration Steps

### Option 1: Using Prisma Migrate (Recommended)
```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Run the specific migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

### Option 2: Direct SQL (If migrate deploy doesn't work)
```bash
# Connect to production database and run:
psql $DATABASE_URL -f prisma/migrations/20250113000000_add_project_spaces/migration.sql
```

### Option 3: Manual SQL Execution
Run the contents of `prisma/migrations/20250113000000_add_project_spaces/migration.sql` directly in your production database.

## What This Migration Does
1. Creates `ProjectSpaceVisibility` enum (PUBLIC, TARGETED)
2. Creates `project_spaces` table
3. Creates `project_space_members` table
4. Adds nullable `projectSpaceId` column to `projects` table
5. Creates indexes and foreign keys

## Safety Notes
- ✅ The `projectSpaceId` column is nullable, so existing projects won't break
- ✅ No data is deleted or modified
- ✅ Only adds new tables and a nullable column
- ✅ Safe to run on production

## Verification
After running the migration, verify:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('project_spaces', 'project_space_members');

-- Check if column was added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'projectSpaceId';
```

## Post-Migration
After the migration runs successfully:
1. Restart your production application
2. Test workspace creation
3. Existing projects will work (they'll have NULL projectSpaceId, treated as PUBLIC)
