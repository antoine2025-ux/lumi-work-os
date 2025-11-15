# Production Database Fix - Missing Org Tables

## Problem
The production database is missing the `org_departments` and `org_teams` tables, causing errors when trying to create departments.

## Solution Options

### Option 1: Automatic Fix (Recommended)
The build process now includes `prisma db push` which will automatically create missing tables during deployment.

**What happens:**
- Vercel will run `prisma db push` during build
- This syncs your Prisma schema with the production database
- Missing tables will be created automatically

**Next Steps:**
1. Push the updated code (already done)
2. Wait for Vercel to redeploy
3. The tables will be created automatically

### Option 2: Manual SQL Script (If Option 1 Fails)
If the automatic fix doesn't work, run the SQL script manually:

1. **Connect to your production database**
   - Use your database admin tool (pgAdmin, DBeaver, etc.)
   - Or use `psql` command line

2. **Run the SQL script**
   ```bash
   psql $DATABASE_URL -f scripts/create-org-tables.sql
   ```

   Or copy the contents of `scripts/create-org-tables.sql` and run it in your database admin tool.

### Option 3: Use Prisma Studio (Quick Fix)
```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Push schema to production
npx prisma db push --accept-data-loss
```

## Verification

After fixing, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('org_departments', 'org_teams');

-- Should return:
-- org_departments
-- org_teams
```

## Important Notes

⚠️ **Data Loss Warning:**
- `prisma db push --accept-data-loss` may drop and recreate tables
- This is safe for new tables that don't exist yet
- Existing data in other tables will NOT be affected

✅ **Safe to Run:**
- Since `org_departments` and `org_teams` don't exist yet, there's no data to lose
- This is the safest way to create the new tables

## After Fix

Once tables are created:
1. Test creating a department in production
2. Test creating a team
3. Verify the org chart works correctly

