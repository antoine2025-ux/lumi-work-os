# Fixed SQL: Mark Migration as Applied

## Corrected SQL Query

The `_prisma_migrations` table requires an `id` field. Use this corrected SQL:

```sql
-- Mark migration as applied in _prisma_migrations table
INSERT INTO "_prisma_migrations" (
    "id",
    "migration_name",
    "finished_at",
    "started_at",
    "applied_steps_count",
    "checksum"
)
SELECT 
    gen_random_uuid()::text,  -- Generate UUID for id
    '20250116140000_add_workspace_invites',
    NOW(),
    NOW(),
    1,
    ''  -- Prisma will update checksum automatically on next connection
WHERE NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" 
    WHERE "migration_name" = '20250116140000_add_workspace_invites'
);
```

## Run This in Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Paste the SQL above
3. Click "Run"
4. Should return: "Success. No rows returned" or "INSERT 0 1"

## Verify It Worked

After running the SQL, you can verify (optional):

```sql
-- Check if migration is recorded
SELECT "migration_name", "finished_at" 
FROM "_prisma_migrations" 
WHERE "migration_name" = '20250116140000_add_workspace_invites';
```

Should return one row with the migration name and timestamp.

## After This

1. ✅ Migration is marked as applied
2. ✅ Restart your production application
3. ✅ Test invites - should work now!

The table already exists, so once Prisma knows the migration is applied, everything will work.
