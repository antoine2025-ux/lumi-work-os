# Phase 1 Completion Checklist

**Follow these steps to complete Phase 1 validation**

---

## 1. Unblock Schema Deployment Locally

### Option A: Reset and Migrate (Dev Only - Destroys Data)

```bash
# 1. Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# 2. Create migration
npx prisma migrate dev --name add_canonical_spaces

# 3. Generate Prisma client
npx prisma generate

# 4. Run backfill
npm run backfill:spaces
```

### Option B: Direct Push (Preserves Data)

```bash
# 1. Push schema changes directly
npx prisma db push

# 2. Generate Prisma client
npx prisma generate

# 3. Run backfill
npm run backfill:spaces
```

**Note:** If `db push` warns about data loss, review the warnings. The Space model additions should be safe (new tables/columns only).

---

## 2. Confirm DB State (Minimum Proof)

### Check Space Table Exists

**Prisma Studio:**
- Open: `npx prisma studio`
- Navigate to `Space` table
- Should see spaces listed

**SQL:**
```sql
SELECT COUNT(*) FROM spaces;
-- Should return > 0 after backfill
```

### Check TEAM Space Per Workspace

**SQL:**
```sql
SELECT workspace_id, COUNT(*) 
FROM spaces 
WHERE type = 'TEAM'
GROUP BY workspace_id;
-- Should return 1 row per workspace
```

**Expected:** Each workspace has exactly 1 TEAM space

### Check PERSONAL Space Per User

**SQL:**
```sql
SELECT workspace_id, owner_id, COUNT(*) 
FROM spaces 
WHERE type = 'PERSONAL'
GROUP BY workspace_id, owner_id;
-- Should return 1 row per user per workspace
```

**Expected:** Each workspace member has exactly 1 PERSONAL space

### Check Project.spaceId Column Exists and Populated

**SQL:**
```sql
-- Check column exists
SELECT space_id FROM projects LIMIT 1;

-- Check population rate
SELECT 
  COUNT(*) FILTER (WHERE space_id IS NOT NULL) as with_space_id,
  COUNT(*) FILTER (WHERE space_id IS NULL) as without_space_id,
  COUNT(*) as total
FROM projects;
```

**Expected:** Most/all projects have `space_id` populated (nulls are legacy)

### Check WikiPage.spaceId Column Exists and Populated

**SQL:**
```sql
-- Check column exists
SELECT space_id FROM wiki_pages LIMIT 1;

-- Check population rate
SELECT 
  COUNT(*) FILTER (WHERE space_id IS NOT NULL) as with_space_id,
  COUNT(*) FILTER (WHERE space_id IS NULL) as without_space_id,
  COUNT(*) as total
FROM wiki_pages;
```

**Expected:** Most/all pages have `space_id` populated (nulls are legacy)

### Verify New Items Get spaceId

**Test:**
1. Create a new project via UI
2. Check database:
   ```sql
   SELECT id, name, space_id 
   FROM projects 
   WHERE created_at > NOW() - INTERVAL '5 minutes'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
3. Create a new wiki page via UI
4. Check database:
   ```sql
   SELECT id, title, space_id 
   FROM wiki_pages 
   WHERE created_at > NOW() - INTERVAL '5 minutes'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

**Expected:** Both have `space_id` populated (not null)

---

## 3. Fixed: Attach Success Payload Includes spaceId

**File:** `src/app/api/projects/[projectId]/documentation/route.ts`

**Changes Made:**
- ✅ Added `spaceId` to `wikiPage` select in GET endpoint
- ✅ Added `spaceId` to `wikiPage` select in POST endpoint
- ✅ Added `spaceId` to `ProjectDocumentationDto` type
- ✅ Included `spaceId` in all response DTOs

**Updated Response Format:**

**GET /api/projects/[projectId]/documentation:**
```json
[
  {
    "id": "doc-123",
    "wikiPageId": "page-456",
    "order": 0,
    "createdAt": "2025-01-XXT...",
    "wikiPage": {
      "id": "page-456",
      "title": "My Doc",
      "slug": "my-doc",
      "workspace_type": "team",
      "spaceId": "space-team-789",  // ✅ Now included
      "updatedAt": "2025-01-XXT..."
    }
  }
]
```

**POST /api/projects/[projectId]/documentation (Success):**
```json
{
  "id": "doc-123",
  "wikiPageId": "page-456",
  "order": 0,
  "createdAt": "2025-01-XXT...",
  "wikiPage": {
    "id": "page-456",
    "title": "My Doc",
    "slug": "my-doc",
    "workspace_type": "team",
    "spaceId": "space-team-789",  // ✅ Now included
    "updatedAt": "2025-01-XXT..."
  }
}
```

**Future (Phase 2):** Can add `space.name` to response for UI display: "Doc belongs to: Team Space"

---

## 4. Quick Verification Commands

### Verify Schema Changes Applied

```bash
# Check if Space table exists
npx prisma studio
# Navigate to "Space" table - should exist

# OR via SQL
psql $DATABASE_URL -c "SELECT COUNT(*) FROM spaces;"
```

### Verify Backfill Ran

```bash
# Check TEAM spaces created
psql $DATABASE_URL -c "SELECT workspace_id, COUNT(*) FROM spaces WHERE type = 'TEAM' GROUP BY workspace_id;"

# Check PERSONAL spaces created
psql $DATABASE_URL -c "SELECT COUNT(*) FROM spaces WHERE type = 'PERSONAL';"

# Check Projects with spaceId
psql $DATABASE_URL -c "SELECT COUNT(*) FROM projects WHERE space_id IS NOT NULL;"

# Check WikiPages with spaceId
psql $DATABASE_URL -c "SELECT COUNT(*) FROM wiki_pages WHERE space_id IS NOT NULL;"
```

### Test API Endpoints

```bash
# Test GET /api/spaces
curl -H "Cookie: ..." http://localhost:3000/api/spaces

# Test creating a space
curl -X POST http://localhost:3000/api/spaces \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"name": "Test Space", "visibility": "PUBLIC"}'
```

---

## 5. Validation Summary

### ✅ Code Changes Complete

- [x] Schema updated with Space models
- [x] Backfill script created
- [x] API endpoints implemented
- [x] Enforcement logic added
- [x] Component updates complete
- [x] **Response payloads include spaceId** (just fixed)

### ⏳ Remaining Steps

1. [ ] Run migrations (`prisma migrate dev` or `prisma db push`)
2. [ ] Run backfill (`npm run backfill:spaces`)
3. [ ] Verify database state (checklists above)
4. [ ] Test creation flows (project + wiki page)
5. [ ] Test attachment enforcement (cross-space error, same-space success)

---

## 6. Troubleshooting

### Migration Fails with Shadow DB Error

**Solution:** Use `prisma db push` instead:
```bash
npx prisma db push
npx prisma generate
```

### Backfill Fails with "Table does not exist"

**Solution:** Run migrations first:
```bash
npx prisma db push
npx prisma generate
npm run backfill:spaces
```

### Backfill Creates Duplicate Spaces

**Solution:** Script is idempotent - safe to run again. It checks before creating.

### spaceId Not Populated on New Items

**Check:**
1. Verify helper functions exist: `src/lib/spaces/canonical-space-helpers.ts`
2. Check console for errors during creation
3. Verify Space table exists and has TEAM spaces

---

**Once all checks pass → Phase 1 is complete!**

**End of Completion Checklist**
