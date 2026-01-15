# PR1 Polish - Final Summary
## Format Enforcement + Empty Doc + Autosave Safety + Title-Only Updates

**Status:** ✅ Complete  
**Date:** 2025-12-17

---

## Changes Made

### 1. Empty Document Constant

**File:** `src/lib/wiki/constants.ts` (NEW)
- Created `EMPTY_TIPTAP_DOC` constant
- Valid empty TipTap document structure
- Used as fallback when `contentJson` is missing/invalid

### 2. API Format Enforcement

**File:** `src/app/api/wiki/pages/route.ts` (POST)**
- ✅ **Enforces `contentFormat='JSON'`** for all new pages (hardcoded)
- ✅ **Uses `EMPTY_TIPTAP_DOC`** if `contentJson` is missing or invalid
- ✅ Validates JSON structure using `isValidProseMirrorJSON()`
- ✅ **Comment added:** Clarifies that all new pages use JSON format (internal flows should also send JSON)

**File:** `src/app/api/wiki/pages/[id]/route.ts` (PUT)**
- ✅ **Loads existing page first** to get authoritative `contentFormat`
- ✅ **Rejects format switching** - returns 400 if `contentFormat` in request differs from existing
- ✅ **Rejects mismatched payloads:**
  - HTML pages cannot accept `contentJson` → 400 error
  - JSON pages cannot accept `content` (without `contentJson`) → 400 error
- ✅ **Allows title-only updates** - JSON pages can be updated with only title/metadata, no `contentJson` required
- ✅ **Preserves format** - never changes `contentFormat` field in updates
- ✅ **TextContent recomputed only when content changes** - not on title-only updates

### 3. Autosave Safety

**File:** `src/components/wiki/wiki-editor-shell.tsx`**
- ✅ **Mount tracking:** `isMountedRef` prevents state updates after unmount
- ✅ **Stale closure prevention:** Uses `latestContentRef` and `onSaveRef` to always use latest values
- ✅ **Debounce cancellation:** Cancels pending saves on unmount via `debouncedSaveRef.current.cancel()`
- ✅ **State update guards:** All `setSaveStatus` calls check `isMountedRef.current` first

**File:** `src/lib/utils.ts`**
- ✅ **Added `cancel()` method** to debounce function for cleanup
- ✅ **Backward compatible:** Return type change is compatible (existing callers don't use cancel)

### 4. Internal POST Callers Updated

**File:** `src/components/wiki/wiki-ai-assistant.tsx`**
- ✅ Updated to use `contentJson: EMPTY_TIPTAP_DOC` and `contentFormat: 'JSON'`

**File:** `src/components/wiki/wiki-layout.tsx`**
- ✅ Updated both POST calls (lines ~450 and ~1380) to use `contentJson: EMPTY_TIPTAP_DOC` and `contentFormat: 'JSON'`
- ✅ Removed `const content = newPageContent.trim() || ' '` (no longer needed)

### 5. Version History

**File:** `src/app/api/wiki/pages/[id]/route.ts`**
- ✅ Versions created **only when content changes** (`hasContentChange` check)
- ✅ Title changes do **not** create versions (by design - WikiVersion doesn't track title)
- ✅ Versions store correct format (`contentFormat`, `contentJson` for JSON, `content` for HTML)
- ✅ `textContent` included in versions for search

### 6. Tests

**File:** `src/lib/wiki/__tests__/text-extract.test.ts`**
- ✅ Added tests for `EMPTY_TIPTAP_DOC` constant
- ✅ Validates structure and text extraction

---

## Manual Verification Steps

### 1. Create New Page Without contentJson

**Steps:**
1. Navigate to `/wiki/new`
2. Enter title: "Test Empty JSON"
3. **Don't type any content** (leave editor empty)
4. Click "Create Page"

**Expected:**
- ✅ Page creates successfully
- ✅ Database: `contentFormat = 'JSON'`, `contentJson` is not null (EMPTY_TIPTAP_DOC)
- ✅ Page loads and shows empty editor

**Verify in DB:**
```sql
SELECT id, title, "contentFormat", 
       CASE WHEN "contentJson" IS NOT NULL THEN 'Has JSON' ELSE 'No JSON' END as json_status
FROM wiki_pages 
WHERE title = 'Test Empty JSON';
-- Should show: contentFormat='JSON', json_status='Has JSON'
```

---

### 2. Update JSON Page - Title Only (No contentJson)

**Steps:**
1. Create a new JSON page
2. Add some content, wait for autosave
3. Open browser DevTools → Console
4. Send PUT request with only title:
```javascript
fetch(`/api/wiki/pages/${pageId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Updated Title Only'
    // No contentJson, no content
  })
}).then(r => r.json()).then(console.log)
```

**Expected:**
- ✅ Returns 200 OK
- ✅ Title updated
- ✅ Content unchanged (original JSON preserved)
- ✅ No version created (content didn't change)

**Verify in DB:**
```sql
SELECT "contentFormat", title,
       CASE WHEN "contentJson" IS NOT NULL THEN 'Has JSON' ELSE 'No JSON' END as json_status
FROM wiki_pages 
WHERE id = '<pageId>';
-- Should show: title='Updated Title Only', contentFormat='JSON', json_status='Has JSON'
-- contentJson should still have original content
```

---

### 3. Update HTML Page - Cannot Become JSON

**Steps:**
1. Open any existing HTML page
2. Send PUT request:
```javascript
fetch(`/api/wiki/pages/${pageId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test',
    contentJson: { type: 'doc', content: [] },
    contentFormat: 'JSON'
  })
}).then(r => r.json()).then(console.log)
```

**Expected:**
- ✅ Returns 400 error: "Cannot change content format. Page is HTML. Use upgrade endpoint to convert."
- ✅ Page remains HTML format

---

### 4. Update JSON Page - Cannot Overwrite with HTML

**Steps:**
1. Open a JSON page
2. Send PUT request:
```javascript
fetch(`/api/wiki/pages/${pageId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test',
    content: '<p>HTML content</p>'
    // No contentJson
  })
}).then(r => r.json()).then(console.log)
```

**Expected:**
- ✅ Returns 400 error: "This page uses JSON format. Use contentJson field instead of content, or omit content to update title/metadata only."
- ✅ Page remains JSON format

---

### 5. Autosave Safety - Unmount Test

**Steps:**
1. Create a new page
2. Type some content
3. **Immediately navigate away** (before 2s debounce completes)
4. Check browser console

**Expected:**
- ✅ No errors in console
- ✅ No "setState on unmounted component" warnings
- ✅ No network requests after navigation

---

### 6. Debounce Usage Check

**Verification:**
- ✅ `debounce` is only used in `wiki-editor-shell.tsx`
- ✅ Return type change (added `cancel()`) is backward compatible
- ✅ No other files use `debounce` from `utils.ts`

---

## Files Changed

### New Files
1. `src/lib/wiki/constants.ts` - EMPTY_TIPTAP_DOC constant

### Modified Files
1. `src/app/api/wiki/pages/route.ts` - Format enforcement, EMPTY_TIPTAP_DOC fallback, explicit comment
2. `src/app/api/wiki/pages/[id]/route.ts` - Format enforcement, title-only updates allowed, textContent only on content change
3. `src/components/wiki/wiki-editor-shell.tsx` - Autosave safety improvements
4. `src/lib/utils.ts` - Added cancel() to debounce function
5. `src/lib/wiki/__tests__/text-extract.test.ts` - Added EMPTY_TIPTAP_DOC tests
6. `src/components/wiki/wiki-ai-assistant.tsx` - Updated to use JSON format
7. `src/components/wiki/wiki-layout.tsx` - Updated both POST calls to use JSON format

---

## Summary

**Format Enforcement:**
- ✅ New pages always JSON (enforced in POST, all callers updated)
- ✅ Format switching blocked (PUT rejects format changes)
- ✅ Mismatched payloads rejected (HTML pages can't get JSON, JSON pages can't get HTML)
- ✅ Title-only updates allowed (JSON pages don't require contentJson for metadata changes)

**Empty Doc Safety:**
- ✅ Missing/invalid `contentJson` defaults to `EMPTY_TIPTAP_DOC`
- ✅ All new pages have valid JSON structure

**Autosave Safety:**
- ✅ No state updates after unmount
- ✅ No stale closures (uses refs for latest values)
- ✅ Debounce cancelled on unmount
- ✅ Retry logic respects mount state

**Version History:**
- ✅ Versions created only on content changes (not title)
- ✅ Title changes don't create versions (by design)
- ✅ Versions store correct format

**Backward Compatibility:**
- ✅ HTML pages unchanged (legacy editor, manual save)
- ✅ Existing API behavior preserved for HTML pages
- ✅ Debounce change is backward compatible

---

**Status:** Ready for testing. All format enforcement, safety measures, and title-only update support in place.

