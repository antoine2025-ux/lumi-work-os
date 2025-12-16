# Production Migration: workspace_invites Table

## Issue
Production error: `The table public.workspace_invites does not exist in the current database.`

## Root Cause
The migration that creates the `workspace_invites` table has not been applied to the production database.

## Solution

### Step 1: Verify Migration Status

Check which migrations are pending in production:

```bash
# Connect to production database and check migration status
npx prisma migrate status
```

Expected output will show:
- `20250116140000_add_workspace_invites` as pending (not applied)

### Step 2: Apply Migration

**Option A: Using Prisma Migrate Deploy (Recommended)**

```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Apply all pending migrations
npx prisma migrate deploy
```

This will:
- Apply the `20250116140000_add_workspace_invites` migration
- Create the `workspace_invites` table
- Create all indexes and foreign keys

**Option B: Manual SQL Execution (If migrate deploy fails)**

If `prisma migrate deploy` fails due to migration conflicts, you can manually execute the migration SQL:

```bash
# Connect to production database
psql $DATABASE_URL

# Then execute the migration SQL
\i prisma/migrations/20250116140000_add_workspace_invites/migration.sql
```

Or using Prisma:

```bash
npx prisma db execute --file prisma/migrations/20250116140000_add_workspace_invites/migration.sql --schema prisma/schema.prisma
```

### Step 3: Verify Table Creation

After applying the migration, verify the table exists:

```bash
# Using Prisma
npx prisma db execute --stdin <<< "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workspace_invites') as exists;"

# Or using psql
psql $DATABASE_URL -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspace_invites';"
```

Expected: Table should exist.

### Step 4: Regenerate Prisma Client (If Needed)

After migration, ensure Prisma client is up to date:

```bash
npx prisma generate
```

### Step 5: Restart Application

Restart your production application to ensure it picks up the new table:

```bash
# Your deployment restart command
# e.g., for Vercel: redeploy
# e.g., for Docker: docker-compose restart
# e.g., for PM2: pm2 restart app
```

### Step 6: Verify Invites Work

1. Navigate to workspace settings → Members tab
2. Try creating an invite
3. Should succeed without 500 error

## Migration Details

**Migration**: `20250116140000_add_workspace_invites`

**Creates**:
- Table: `workspace_invites`
- Columns: `id`, `workspaceId`, `email`, `role`, `token`, `expiresAt`, `acceptedAt`, `revokedAt`, `createdAt`, `createdByUserId`
- Indexes: `token` (unique), `workspaceId + email`, `workspaceId + status`, `token`
- Foreign keys: `workspaceId` → `workspaces.id`, `createdByUserId` → `users.id`

**Safe to apply**: Yes - this is a new table, no data conflicts.

## Rollback (If Needed)

If you need to rollback (unlikely, but documented):

```sql
-- WARNING: This will delete all invite data
DROP TABLE IF EXISTS workspace_invites CASCADE;
```

Then mark migration as rolled back:
```bash
npx prisma migrate resolve --rolled-back 20250116140000_add_workspace_invites
```

## Troubleshooting

### Issue: Migration already applied but table doesn't exist

**Cause**: Migration state is out of sync with database

**Fix**:
```bash
# Mark migration as applied (if table was created manually)
npx prisma migrate resolve --applied 20250116140000_add_workspace_invites

# OR manually create table using migration SQL
npx prisma db execute --file prisma/migrations/20250116140000_add_workspace_invites/migration.sql
```

### Issue: Foreign key constraint errors

**Cause**: Referenced tables (`workspaces`, `users`) don't exist or have different structure

**Fix**: Ensure all prerequisite migrations are applied first:
```bash
npx prisma migrate deploy
```

### Issue: Permission errors

**Cause**: Database user doesn't have CREATE TABLE permissions

**Fix**: Grant necessary permissions or use a user with DDL permissions

## Prevention

To prevent this in the future:

1. **Always run migrations before deployment**:
   ```bash
   npx prisma migrate deploy
   ```

2. **Include migrations in deployment pipeline**:
   - Add `npx prisma migrate deploy` as a deployment step
   - Run before application restart

3. **Verify migration status**:
   ```bash
   npx prisma migrate status
   ```
   Should show "All migrations have been applied"

## Related Documentation

- `docs/INVITES_SMOKE_TEST_CHECKLIST.md` - Test invites after migration
- `docs/WORKSPACE_INVITES_VERIFICATION.md` - Full feature verification
- `prisma/migrations/20250116140000_add_workspace_invites/migration.sql` - Migration SQL
