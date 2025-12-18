# PR2 Hardening Patch - Transactional Upgrade + Tests + Warnings

**Status:** ✅ Complete  
**Date:** 2025-12-17

---

## Changes Made

### 1. Transactional Upgrade (`src/app/api/wiki/pages/[id]/upgrade/route.ts`)

**Added:**
- ✅ Wrapped page update + version create in `prisma.$transaction()` for atomicity
- ✅ Ensures both operations succeed or both fail (no partial state)
- ✅ Improved error handling: returns 400 if already JSON, 422 if conversion fails
- ✅ Preserves original HTML content exactly (content field unchanged)
- ✅ Warnings handling:
  - Logs warnings to server logs (`logger.warn`, `console.warn`)
  - Includes warnings in JSON response (if any)
  - Does not break UI (warnings are informational)

**Code Changes:**
```typescript
// Before: Separate operations
const updatedPage = await prisma.wikiPage.update(...)
await prisma.wikiVersion.create(...)

// After: Atomic transaction
const updatedPage = await prisma.$transaction(async (tx) => {
  const updated = await tx.wikiPage.update(...)
  await tx.wikiVersion.create(...)
  return updated
})
```

### 2. Enhanced Embed Conversion Tests (`src/lib/wiki/__tests__/html-to-tiptap.test.ts`)

**Added Test Cases:**
- ✅ Attribute order swapped: `data-embed-id` before `class`
- ✅ Single quotes for attributes: `class='embed-placeholder'`
- ✅ Single quotes with swapped order
- ✅ Extra attributes on div (id, style, etc.)
- ✅ Combined variations test (all cases together)

**Test Coverage:**
- All 16 tests passing
- Covers edge cases for embed placeholder parsing
- Confirms resulting TipTap doc includes `{ type: 'embed', attrs: { embedId } }`

### 3. Improved Embed Regex (`src/lib/wiki/html-to-tiptap.ts`)

**Enhanced:**
- ✅ Handles attribute order variations (class before/after data-embed-id)
- ✅ Supports both double and single quotes
- ✅ Allows extra attributes anywhere in the div tag
- ✅ More robust pattern matching

**Regex Pattern:**
```typescript
/<div[^>]*class=["']embed-placeholder["'][^>]*data-embed-id=["']([^"']+)["'][^>]*>.*?<\/div>|
 <div[^>]*data-embed-id=["']([^"']+)["'][^>]*class=["']embed-placeholder["'][^>]*>.*?<\/div>/gis
```

---

## Manual Test Steps

### Test: Upgrade Page with Embed Placeholder

1. **Find or create an HTML page with embed placeholder:**
   ```sql
   -- Find existing HTML page with embed
   SELECT id, title, "contentFormat", content 
   FROM wiki_pages 
   WHERE "contentFormat" = 'HTML' 
   AND content LIKE '%embed-placeholder%'
   LIMIT 1;
   
   -- Or create test page
   INSERT INTO wiki_pages (title, slug, "workspaceId", "createdById", "contentFormat", content)
   VALUES (
     'Test Embed Page',
     'test-embed-page',
     '{workspaceId}',
     '{userId}',
     'HTML',
     '<p>Before embed</p><div class="embed-placeholder" data-embed-id="test-123">Embed</div><p>After embed</p>'
   );
   ```

2. **Navigate to the page:**
   - Go to `/wiki/{slug}` where the page is HTML format
   - Verify page loads with legacy editor

3. **Click "Upgrade" button:**
   - Upgrade button (FileText icon) should appear next to Edit button
   - Click to open confirmation modal

4. **Confirm upgrade:**
   - Review modal explanation
   - Click "Upgrade Page"
   - Wait for upgrade to complete (spinner shows)

5. **Verify upgrade results:**
   - ✅ Page now opens in TipTap editor (not legacy editor)
   - ✅ Embed placeholder converted to embed node
   - ✅ Formatting preserved (paragraphs, etc.)
   - ✅ Original HTML preserved in database

6. **Check database state:**
   ```sql
   -- Verify page format changed
   SELECT id, title, "contentFormat", 
          "contentJson" IS NOT NULL as has_json,
          "textContent" IS NOT NULL as has_text,
          LENGTH(content) as html_length
   FROM wiki_pages 
   WHERE id = '{pageId}';
   -- Expected: contentFormat='JSON', has_json=true, has_text=true, html_length > 0
   
   -- Verify version created
   SELECT version, "contentFormat", 
          "contentJson" IS NOT NULL as has_json
   FROM wiki_versions 
   WHERE "pageId" = '{pageId}'
   ORDER BY version DESC
   LIMIT 1;
   -- Expected: contentFormat='JSON', has_json=true
   ```

7. **Verify embed node in editor:**
   - In TipTap editor, embed should appear as: "Embed: test-123"
   - Check browser console for any warnings (should be logged if conversion had issues)

8. **Test idempotency:**
   - Try clicking "Upgrade" again (button should not appear, or should return 400)
   - Verify page remains JSON format

### Test: Warnings Handling

1. **Create page with unknown HTML tag:**
   ```sql
   INSERT INTO wiki_pages (title, slug, "workspaceId", "createdById", "contentFormat", content)
   VALUES (
     'Test Warnings',
     'test-warnings',
     '{workspaceId}',
     '{userId}',
     'HTML',
     '<p>Normal</p><custom-tag>Unknown</custom-tag><p>After</p>'
   );
   ```

2. **Upgrade the page:**
   - Navigate to page, click upgrade

3. **Check server logs:**
   - Should see warning: `[Upgrade] Page {id} conversion warnings: ["Unknown tag "custom-tag" converted to text"]`
   - Check `logger.warn` output

4. **Check API response:**
   - Response should include `warnings` array if any
   - UI should not break (warnings are informational)

---

## Transaction Safety

**Before (Non-atomic):**
- Page update could succeed but version create could fail
- Would leave page in inconsistent state (JSON format but no version)

**After (Atomic):**
- Both operations succeed or both fail
- No partial state possible
- Database consistency guaranteed

---

## Error Scenarios

### 1. Already Upgraded
- **Action:** Call upgrade on JSON page
- **Expected:** 400 error, transaction not started

### 2. Conversion Failure
- **Action:** Call upgrade on page with malformed HTML (if parser fails)
- **Expected:** 422 error, transaction not started, page unchanged

### 3. Transaction Failure
- **Action:** Database constraint violation during upgrade
- **Expected:** Transaction rolls back, page unchanged, 500 error

### 4. Warnings (Non-fatal)
- **Action:** Upgrade page with unknown tags
- **Expected:** Upgrade succeeds, warnings logged and returned, page upgraded

---

## Files Changed

1. **`src/app/api/wiki/pages/[id]/upgrade/route.ts`**
   - Added `prisma.$transaction()` wrapper
   - Added warnings logging (`logger.warn`, `console.warn`)
   - Warnings included in response

2. **`src/lib/wiki/__tests__/html-to-tiptap.test.ts`**
   - Added 5 new test cases for embed conversion robustness
   - Total: 16 tests (all passing)

3. **`src/lib/wiki/html-to-tiptap.ts`**
   - Enhanced embed regex to handle attribute order, quotes, extra attributes

---

## Summary

✅ **Transactional safety:** Page update + version create are atomic  
✅ **Warnings handling:** Logged and returned without breaking UI  
✅ **Embed robustness:** Handles attribute order, quotes, extra attributes  
✅ **Test coverage:** 16 tests, all passing  
✅ **Error handling:** Proper status codes (400, 422, 500)  
✅ **HTML preservation:** Original content field unchanged  

**Status:** Ready for production. All hardening complete.

