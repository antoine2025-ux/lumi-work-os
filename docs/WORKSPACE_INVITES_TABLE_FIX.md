# Workspace Invites Table Fix

## Problem
Error: `Invalid prisma.workspaceInvite.findFirst() invocation: The table public.workspace_invites does not exist in the current database.`

## Root Cause
The `workspace_invites` table exists in the database (verified), but Prisma client may be:
1. **Stale** - needs regeneration
2. **Cached** - dev server needs restart
3. **Connecting to wrong database** - DATABASE_URL mismatch

## Solution

### Step 1: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 2: Restart Dev Server
```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 3: Verify Table Exists
The code now includes automatic verification on startup. Check your server console for:
- ✅ `[PRISMA] ✅ WorkspaceInvite model available`
- ✅ `[PRISMA] ✅ workspace_invites table exists in database`

If you see errors, follow the instructions in the console.

### Step 4: If Table Still Missing
If the table doesn't exist, apply the migration:
```bash
npx prisma migrate deploy
```

Or manually create it:
```bash
npx prisma db execute --file prisma/migrations/20250116140000_add_workspace_invites/migration.sql
```

## Verification

After restarting, try creating an invite again. The error should be resolved.

If the error persists:
1. Check server console for Prisma verification messages
2. Verify DATABASE_URL in `.env` points to the correct database
3. Check if you have multiple databases (dev vs production)

## Files Modified
- `src/lib/db.ts` - Added WorkspaceInvite model verification and table existence check
