# Production Migration Commands - workspace_invites

## Your Production Database URL

```
postgresql://postgres.ozpfuynytrnxazwxvrsg:dkgjkkdkdjgkdkjsks@aws-1-eu-north-1.pooler.supabase.com:6543/postgres
```

## Important: Supabase Pooler

Your database URL uses Supabase's **pooler** (port 6543). For migrations, you may need to use the **direct connection** instead.

### Option 1: Use Direct Connection (Recommended for Migrations)

Supabase provides a direct connection URL (usually port 5432, not 6543). Check your Supabase dashboard:
- Go to Project Settings → Database
- Look for "Connection string" → "Direct connection" (not "Session mode" or "Transaction mode")
- Use that URL for migrations

**If you have the direct connection URL**, use it instead:
```bash
export DATABASE_URL="postgresql://postgres.ozpfuynytrnxazwxvrsg:dkgjkkdkdjgkdkjsks@aws-1-eu-north-1.pooler.supabase.com:5432/postgres"
```

### Option 2: Use Pooler with Prisma (May Work)

Try with the pooler URL first - Prisma may handle it:

```bash
export DATABASE_URL="postgresql://postgres.ozpfuynytrnxazwxvrsg:dkgjkkdkdjgkdkjsks@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

npx prisma migrate deploy
```

## Step-by-Step Migration

### Step 1: Set Database URL

```bash
export DATABASE_URL="postgresql://postgres.ozpfuynytrnxazwxvrsg:dkgjkkdkdjgkdkjsks@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
```

### Step 2: Check Migration Status

```bash
npx prisma migrate status
```

This will show which migrations are pending.

### Step 3: Apply Migration

```bash
npx prisma migrate deploy
```

Expected output:
```
Applying migration `20250116140000_add_workspace_invites`
```

### Step 4: Verify Table Created

```bash
npx prisma db execute --stdin <<< "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'workspace_invites';"
```

Should return: `workspace_invites`

### Step 5: Test Invites

1. Restart your production application
2. Navigate to workspace settings → Members tab
3. Try creating an invite
4. Should work without 500 errors

## Alternative: Manual SQL (If Prisma Fails)

If `prisma migrate deploy` fails with pooler, you can execute the SQL directly via Supabase SQL Editor:

1. Go to Supabase Dashboard → SQL Editor
2. Paste this SQL:

```sql
-- CreateTable
CREATE TABLE IF NOT EXISTS "workspace_invites" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invites_token_key" ON "workspace_invites"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_invites_workspace_email" ON "workspace_invites"("workspaceId", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_invites_workspace_status" ON "workspace_invites"("workspaceId", "revokedAt", "acceptedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "idx_invites_token" ON "workspace_invites"("token");

-- AddForeignKey (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workspace_invites_workspaceId_fkey'
    ) THEN
        ALTER TABLE "workspace_invites" 
        ADD CONSTRAINT "workspace_invites_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (only if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'workspace_invites_createdByUserId_fkey'
    ) THEN
        ALTER TABLE "workspace_invites" 
        ADD CONSTRAINT "workspace_invites_createdByUserId_fkey" 
        FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
```

3. Click "Run" to execute

4. Mark migration as applied:
```bash
export DATABASE_URL="your-database-url"
npx prisma migrate resolve --applied 20250116140000_add_workspace_invites
```

## Troubleshooting

### Error: "prepared statement" or "PgBouncer"

**Cause**: Pooler doesn't support prepared statements

**Fix**: Use direct connection URL (port 5432) or add `?pgbouncer=true&connection_limit=1` to pooler URL

### Error: "connection limit exceeded"

**Cause**: Pooler connection limit

**Fix**: Use direct connection URL for migrations

### Error: "relation already exists"

**Cause**: Table was created manually

**Fix**: Mark migration as applied:
```bash
npx prisma migrate resolve --applied 20250116140000_add_workspace_invites
```

## After Migration

1. ✅ Verify table exists
2. ✅ Restart application
3. ✅ Test creating an invite
4. ✅ Monitor logs for errors
