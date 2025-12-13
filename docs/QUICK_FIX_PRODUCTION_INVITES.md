# Quick Fix: Production Invites Migration

## Current Situation

- ✅ Table `workspace_invites` was created manually via Supabase SQL Editor
- ❌ Prisma migration history doesn't know about it
- ❌ Pooler connection times out when trying to mark migration as applied

## Solution: Use Direct Connection or Manual SQL

### Option 1: Direct Connection (Best)

Get your **direct connection URL** from Supabase:
1. Supabase Dashboard → Project Settings → Database
2. "Connection string" → "Direct connection" (port **5432**, not 6543)
3. Use that URL:

```bash
# Replace with your direct connection URL (port 5432)
DATABASE_URL="postgresql://postgres.ozpfuynytrnxazwxvrsg:dkgjkkdkdjgkdkjsks@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" \
DIRECT_URL="postgresql://postgres.ozpfuynytrnxazwxvrsg:dkgjkkdkdjgkdkjsks@aws-1-eu-north-1.pooler.supabase.com:5432/postgres" \
npx prisma migrate resolve --applied 20250116140000_add_workspace_invites
```

### Option 2: Manual SQL (If Direct Connection Not Available)

Run this in **Supabase SQL Editor**:

```sql
-- Mark migration as applied
INSERT INTO "_prisma_migrations" (
    "migration_name",
    "finished_at",
    "started_at",
    "applied_steps_count",
    "checksum"
)
SELECT 
    '20250116140000_add_workspace_invites',
    NOW(),
    NOW(),
    1,
    ''  -- Prisma will update checksum automatically
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" 
    WHERE "migration_name" = '20250116140000_add_workspace_invites'
);
```

## After Marking Migration

1. **Restart your production application**
2. **Test invites** - should work now!

The table exists, so once Prisma knows the migration is applied, everything will work.
