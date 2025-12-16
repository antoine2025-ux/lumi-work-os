# Post-Manual SQL Migration Steps

## What You Did

You manually created the `workspace_invites` table using SQL in Supabase SQL Editor. The table now exists, but Prisma's migration history doesn't know about it.

## Next Steps

### Step 1: Mark Migration as Applied

Tell Prisma that the migration has been applied (since you created the table manually):

```bash
export DATABASE_URL="postgresql://postgres.ozpfuynytrnxazwxvrsg:dkgjkkdkdjgkdkjsks@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

npx prisma migrate resolve --applied 20250116140000_add_workspace_invites
```

This tells Prisma: "The migration `20250116140000_add_workspace_invites` has been applied, don't try to apply it again."

### Step 2: Verify Table Structure

Check that the table was created correctly:

```bash
npx prisma db execute --stdin <<< "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspace_invites' ORDER BY ordinal_position;"
```

Expected columns:
- `id` (text)
- `workspaceId` (text)
- `email` (varchar)
- `role` (WorkspaceRole enum)
- `token` (text)
- `expiresAt` (timestamp)
- `acceptedAt` (timestamp, nullable)
- `revokedAt` (timestamp, nullable)
- `createdAt` (timestamp)
- `createdByUserId` (text)

### Step 3: Verify Indexes

Check that indexes were created:

```bash
npx prisma db execute --stdin <<< "SELECT indexname FROM pg_indexes WHERE tablename = 'workspace_invites';"
```

Expected indexes:
- `workspace_invites_token_key` (unique)
- `idx_invites_workspace_email`
- `idx_invites_workspace_status`
- `idx_invites_token`

### Step 4: Verify Foreign Keys

Check that foreign keys were created:

```bash
npx prisma db execute --stdin <<< "SELECT conname, confrelid::regclass FROM pg_constraint WHERE conrelid = 'workspace_invites'::regclass AND contype = 'f';"
```

Expected foreign keys:
- `workspace_invites_workspaceId_fkey` → `workspaces(id)`
- `workspace_invites_createdByUserId_fkey` → `users(id)`

### Step 5: Regenerate Prisma Client (If Needed)

If you're running this locally, regenerate the Prisma client:

```bash
npx prisma generate
```

### Step 6: Restart Production Application

Restart your production application so it picks up the new table.

### Step 7: Test Invites

1. Navigate to workspace settings → Members tab
2. Try creating an invite
3. Should work without 500 errors

## Verification Commands

Run these to verify everything is set up correctly:

```bash
# Set your database URL
export DATABASE_URL="postgresql://postgres.ozpfuynytrnxazwxvrsg:dkgjkkdkdjgkdkjsks@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Check migration status (should show migration as applied)
npx prisma migrate status

# Verify table exists
npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invites') as exists;"

# Test Prisma can access the table
npx prisma db execute --stdin <<< "SELECT COUNT(*) as count FROM workspace_invites;"
```

All should succeed without errors.

## Troubleshooting

### Error: "Migration not found"

If `migrate resolve` says migration not found, check the exact migration name:

```bash
ls prisma/migrations/ | grep invite
```

Use the exact name shown.

### Error: "Table still doesn't exist"

If Prisma still can't see the table:
1. Verify table exists in Supabase dashboard
2. Check you're using the correct database (not a different schema)
3. Try using direct connection URL (port 5432) instead of pooler

### Error: "Cannot connect to database"

Check:
- DATABASE_URL is correct
- Database is accessible
- Pooler parameters are correct (`?pgbouncer=true&connection_limit=1`)

## Summary

After running `npx prisma migrate resolve --applied 20250116140000_add_workspace_invites`, your production database will be in sync with Prisma's migration history, and invites should work.
