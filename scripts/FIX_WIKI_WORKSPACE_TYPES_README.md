# Wiki Workspace Type Migration - Safety Guide

## ✅ What This Script Does

**ONLY UPDATES** the `workspace_type` field on existing wiki pages. It:
- ✅ Updates incorrect `workspace_type` values
- ✅ Fixes legacy pages (null/empty workspace_type)
- ✅ Logs all changes for review
- ❌ **NEVER deletes any data**
- ❌ **NEVER modifies page content, titles, or other fields**
- ❌ **NEVER touches any other tables**

## 🔒 Safety Guarantees

1. **Read-Only Analysis First**: The script shows you exactly what will change before making any updates
2. **Idempotent**: Safe to run multiple times - won't cause issues if run twice
3. **Reversible**: All changes are simple field updates that can be manually reverted if needed
4. **No Data Loss**: Only updates one field (`workspace_type`), all other data remains untouched

## 📊 What Gets Updated

The script will fix:
- Pages with `workspace_type = null` → Set to 'team' or 'personal' based on `permissionLevel`
- Pages with `workspace_type = ''` (empty string) → Set to 'team' or 'personal'
- Pages with invalid `workspace_type` values → Reset to 'team'

**Pages that are already correct are NOT touched.**

## 🚀 How to Run Safely

### Option 1: Run the Safe Wrapper Script
```bash
./scripts/fix-wiki-workspace-types-safe.sh
```

### Option 2: Run Directly (for inspection)
```bash
npx tsx scripts/fix-wiki-workspace-types.ts
```

## 🔍 Before Running

The script will:
1. Show you a list of all pages that will be updated
2. Display the old and new `workspace_type` values
3. Explain why each page needs updating
4. Ask for confirmation before making changes

## 📝 Example Output

```
📊 Found 5 total wiki pages

📝 Found 2 pages that need updates:

1. "My Page"
   Old: (null)
   New: team
   Reason: Legacy page without workspace_type, defaulting to team

2. "Another Page"
   Old: (null)
   New: personal
   Reason: Legacy page with permissionLevel=personal, setting workspace_type=personal

⚠️  This will update 2 pages.
   The changes are safe and reversible.
```

## 🛡️ Backup Recommendation

While the script is safe, it's always good practice to backup your database first:

```bash
# PostgreSQL backup example
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 🔄 Rollback (if needed)

If you need to revert changes, you can manually update pages back:

```sql
-- Example: Revert a page back to null
UPDATE "WikiPage" SET workspace_type = NULL WHERE id = 'page-id';
```

## ❓ FAQ

**Q: Will this delete my pages?**  
A: No, it only updates the `workspace_type` field. All page content, titles, and other data remain unchanged.

**Q: Will this break my app?**  
A: No, it fixes incorrect values. The app will work better after this migration.

**Q: Can I run it multiple times?**  
A: Yes, it's idempotent. Running it multiple times won't cause issues.

**Q: What if something goes wrong?**  
A: The script updates pages one at a time and logs everything. You can manually revert specific pages if needed.

**Q: Does it affect other tables?**  
A: No, it only touches the `WikiPage` table and only the `workspace_type` field.

## ✅ Verification After Migration

After running the migration:
1. Check your wiki pages in the app
2. Verify pages appear in the correct workspaces
3. Confirm no pages are missing
4. Check that pages don't appear in multiple workspaces

