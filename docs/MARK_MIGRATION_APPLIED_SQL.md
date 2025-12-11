# Manually Mark Migration as Applied (SQL Method)

## When to Use This

If Prisma's `migrate resolve` command times out due to Supabase pooler limitations, you can manually mark the migration as applied using SQL.

## Step 1: Get Migration Checksum

The migration checksum is needed to insert into `_prisma_migrations` table. You can get it by:

1. Looking at the migration file name and content
2. Or letting Prisma calculate it (if you can connect)

For `20250116140000_add_workspace_invites`, the checksum will be calculated from the migration SQL.

## Step 2: Insert Migration Record

Run this SQL in Supabase SQL Editor:

```sql
-- Insert migration record into _prisma_migrations table
INSERT INTO "_prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
) VALUES (
    gen_random_uuid()::text,
    'a1b2c3d4e5f6...',  -- Replace with actual checksum (see below)
    NOW(),
    '20250116140000_add_workspace_invites',
    NULL,
    NULL,
    NOW(),
    1
)
ON CONFLICT DO NOTHING;
```

## Step 3: Get Actual Checksum

The checksum is a hash of the migration SQL. To get it:

**Option A: Let Prisma calculate it (if you can connect briefly)**

```bash
# Try to get migration info (may timeout, but might show checksum)
DATABASE_URL="your-direct-connection-url" npx prisma migrate status
```

**Option B: Calculate from migration file**

The checksum is typically a SHA-256 hash of the migration SQL. You can:

1. Copy the migration SQL from `prisma/migrations/20250116140000_add_workspace_invites/migration.sql`
2. Use an online SHA-256 calculator
3. Or use this command (if available):
   ```bash
   cat prisma/migrations/20250116140000_add_workspace_invites/migration.sql | shasum -a 256
   ```

**Option C: Use a placeholder and let Prisma fix it**

If you insert with a placeholder checksum, Prisma will update it on the next `migrate status` check:

```sql
INSERT INTO "_prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
) VALUES (
    gen_random_uuid()::text,
    'placeholder',  -- Prisma will update this
    NOW(),
    '20250116140000_add_workspace_invites',
    NULL,
    NULL,
    NOW(),
    1
)
ON CONFLICT DO NOTHING;
```

## Step 4: Verify

After inserting, verify the migration is marked:

```bash
DATABASE_URL="your-direct-connection-url" DIRECT_URL="your-direct-connection-url" npx prisma migrate status
```

Should show `20250116140000_add_workspace_invites` as applied.

## Alternative: Simple Approach

If you just want to mark it without worrying about checksum, use this simpler SQL:

```sql
-- Simple approach: Just mark it as applied
INSERT INTO "_prisma_migrations" (
    "migration_name",
    "finished_at",
    "started_at",
    "applied_steps_count"
)
SELECT 
    '20250116140000_add_workspace_invites',
    NOW(),
    NOW(),
    1
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" 
    WHERE "migration_name" = '20250116140000_add_workspace_invites'
);
```

Prisma will update the checksum automatically on the next connection.
