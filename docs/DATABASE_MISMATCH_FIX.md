# Database Mismatch Fix - workspace_invites Table

## Problem
Error: `Invalid prisma.workspaceInvite.findFirst() invocation: The table public.workspace_invites does not exist in the current database.`

## Root Cause
The application has **two databases**:
1. `lumi_work_os` - Production/main database (table exists ✅)
2. `lumi_work_os_dev` - Development database (table was missing ❌)

The dev server was connecting to `lumi_work_os_dev` but the `workspace_invites` table only existed in `lumi_work_os`.

## Solution Applied

Created the `workspace_invites` table in the `lumi_work_os_dev` database by running the migration SQL.

## Verification

After running the fix script, verify:
```bash
node scripts/create-workspace-invites-in-dev-db.js
```

You should see:
- ✅ Table workspace_invites created successfully in lumi_work_os_dev!

## Next Steps

1. **Restart your dev server** to ensure it picks up the new table
2. **Try creating an invite again** - it should work now

## Prevention

To ensure both databases stay in sync:

1. **Apply migrations to both databases**:
   ```bash
   # For main database
   DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public" npx prisma migrate deploy
   
   # For dev database
   DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os_dev?schema=public" npx prisma migrate deploy
   ```

2. **Or use a single database** - Update `.env` to use only one database for both dev and production

## Files Created
- `scripts/create-workspace-invites-in-dev-db.js` - Script to create table in dev database
- `scripts/check-database-connection.js` - Diagnostic script to check database state
