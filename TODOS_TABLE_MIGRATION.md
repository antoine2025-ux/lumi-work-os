# Todos Table Migration Guide

## Problem
The `todos` table doesn't exist in production Supabase database, causing errors:
```
The table `public.todos` does not exist in the current database.
```

## Solution Options

### Option 1: Run Prisma Migration (Recommended)

The migration file has been created at:
- `prisma/migrations/20251227134402_add_todos/migration.sql`

**To apply in production:**

1. **Via Vercel (Automatic):**
   - The migration will run automatically on the next deployment
   - Vercel runs `prisma migrate deploy` during build

2. **Manual via CLI:**
   ```bash
   # Set production DATABASE_URL
   export DATABASE_URL="your-production-database-url"
   
   # Deploy migration
   npx prisma migrate deploy
   ```

### Option 2: Quick Fix via Supabase SQL Editor (Fastest)

If you need an immediate fix:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `scripts/create-todos-table.sql`
4. Click **Run**

This script is idempotent (safe to run multiple times) and will:
- Create the enums (TodoStatus, TodoPriority, TodoAnchorType)
- Create the todos table
- Create all indexes
- Add foreign key constraints

### Option 3: Prisma DB Push (Quick Sync)

If migrations aren't working:

```bash
export DATABASE_URL="your-production-database-url"
npx prisma db push --accept-data-loss
```

⚠️ **Warning:** This doesn't create migration history, but will sync the schema.

## Verification

After applying the migration, verify the table exists:

```sql
-- Run in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'todos';
```

Or check via Prisma:

```bash
npx prisma migrate status
```

## What This Migration Creates

- **Enums:**
  - `TodoStatus`: OPEN, DONE
  - `TodoPriority`: LOW, MEDIUM, HIGH
  - `TodoAnchorType`: NONE, PROJECT, TASK, PAGE

- **Table:** `todos` with fields:
  - id, workspaceId, title, note
  - status, dueAt, priority
  - createdById, assignedToId
  - anchorType, anchorId
  - createdAt, updatedAt

- **Indexes:**
  - idx_todos_workspace_assignee_status_due
  - idx_todos_workspace_anchor
  - idx_todos_workspace_creator

- **Foreign Keys:**
  - todos → workspaces
  - todos → users (createdBy)
  - todos → users (assignedTo)

## Next Steps

1. Apply the migration using one of the options above
2. Verify the table was created successfully
3. Test the todos API endpoints
4. Commit the migration files to git (already done)

