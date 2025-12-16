# Database Sync Guide

## Issue Found
The application uses **two databases**:
- `lumi_work_os` - Main/production database
- `lumi_work_os_dev` - Development database

The `workspace_invites` table existed in `lumi_work_os` but was missing from `lumi_work_os_dev`, causing errors when the dev server connected to the dev database.

## Solution Applied
Created the `workspace_invites` table in `lumi_work_os_dev` using:
```bash
node scripts/create-workspace-invites-in-dev-db.js
```

## Keeping Databases in Sync

### Option 1: Apply Migrations to Both Databases
When running migrations, apply them to both databases:

```bash
# Main database
DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public" npx prisma migrate deploy

# Dev database  
DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os_dev?schema=public" npx prisma migrate deploy
```

### Option 2: Use Single Database
Update `.env` to use only one database for both environments:

```env
DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public"
DIRECT_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public"
```

### Option 3: Check Which Database You're Using
Run the diagnostic script to see which database your app connects to:
```bash
node scripts/check-database-connection.js
```

## Verification

After applying migrations or creating tables, verify:
```bash
# Check main database
DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os?schema=public" node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.workspaceInvite.count().then(c => console.log('Main DB:', c)).finally(() => p.\$disconnect());"

# Check dev database
DATABASE_URL="postgresql://tonyem@localhost:5432/lumi_work_os_dev?schema=public" node -e "const {PrismaClient} = require('@prisma/client'); const p = new PrismaClient(); p.workspaceInvite.count().then(c => console.log('Dev DB:', c)).finally(() => p.\$disconnect());"
```

Both should work without errors.
