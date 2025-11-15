# Database Migration Instructions

## Current Issue
The production database is missing the `org_departments` and `org_teams` tables.

## Automatic Fix (Recommended)
The build process will automatically:
1. Try to run `prisma migrate deploy` (applies pending migrations)
2. If that fails, fall back to `prisma db push` (syncs schema directly)

**This happens automatically on the next Vercel deployment.**

## Manual Fix (If Needed)

If automatic migration fails, you can manually create the tables:

### Option 1: Run Migration Manually

```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Deploy migrations
npx prisma migrate deploy
```

### Option 2: Use DB Push

```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Push schema directly (creates missing tables)
npx prisma db push --accept-data-loss
```

### Option 3: Run SQL Script

Connect to your production database and run:
```bash
psql $DATABASE_URL -f scripts/create-org-tables.sql
```

Or copy the SQL from `scripts/create-org-tables.sql` and run it in your database admin tool.

## Verification

After running migrations, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('org_departments', 'org_teams');
```

Should return:
- `org_departments`
- `org_teams`

## Next Steps

1. Wait for Vercel to redeploy (automatic migration will run)
2. Check Vercel build logs to confirm migration succeeded
3. Test creating a department
4. If still failing, use manual options above

