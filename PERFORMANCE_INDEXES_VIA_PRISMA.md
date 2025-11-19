# ✅ Performance Indexes - Using Prisma (RECOMMENDED)

Instead of running SQL directly, I've added the indexes to your Prisma schema. This is the **safest and most reliable** way to create indexes.

## What I Did

I've added the following indexes directly in `prisma/schema.prisma`:

### ✅ Added Indexes:

1. **WorkspaceMember**: `@@index([userId, workspaceId])`
2. **WikiPage**: 
   - `@@index([workspaceId, isPublished])`
   - `@@index([workspaceId, workspace_type])`
   - `@@index([updatedAt(sort: Desc)])`
3. **Project**: `@@index([updatedAt(sort: Desc)])`
4. **Task**: `@@index([workspaceId, status])`
5. **ChatSession**: 
   - `@@index([workspaceId, userId, phase])`
   - `@@index([updatedAt(sort: Desc)])`
6. **WikiFavorite**: `@@index([user_id, page_id])`

## How to Apply

Run this command in your terminal:

```bash
npx prisma db push
```

This will:
- ✅ Create all the indexes using Prisma's column name handling
- ✅ Avoid SQL quoting issues
- ✅ Ensure indexes match your exact schema
- ✅ Show you what will be created before applying

## Alternative: Generate Migration

If you prefer to create a migration file:

```bash
npx prisma migrate dev --name add_performance_indexes
```

Then apply it:
```bash
npx prisma migrate deploy
```

## Why This is Better

1. **No SQL errors** - Prisma handles column names correctly
2. **Schema consistency** - Indexes are part of your schema definition
3. **Version controlled** - Changes are tracked in migrations
4. **Safe** - Prisma validates everything before applying

## Step 2: Add Partial Indexes (Optional but Recommended)

After running `prisma db push`, run `scripts/add-partial-indexes-only.sql` in Supabase SQL Editor to add indexes with WHERE clauses (which Prisma can't create).

These partial indexes are more efficient for filtered queries.

## Verify Indexes Were Created

After running both steps, verify in Supabase SQL Editor:

```sql
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

You should see all the new indexes listed!

