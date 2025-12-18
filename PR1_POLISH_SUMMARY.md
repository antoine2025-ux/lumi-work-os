# PR1 Polish Summary
## Format Enforcement + Empty Doc Constant + Autosave Safety

**Status:** ✅ Complete  
**Date:** 2025-12-17

---

## Changes Made

### 1. Empty Document Constant

**File:** `src/lib/wiki/constants.ts` (NEW)
- Created `EMPTY_TIPTAP_DOC` constant
- Represents valid empty TipTap document structure
- Used as fallback when `contentJson` is missing/invalid

### 2. API Format Enforcement

**File:** `src/app/api/wiki/pages/route.ts` (POST)**
- ✅ **Enforces `contentFormat='JSON'`** for all new pages (hardcoded, ignores request)
- ✅ **Uses `EMPTY_TIPTAP_DOC`** if `contentJson` is missing or invalid
- ✅ Validates JSON structure using `isValidProseMirrorJSON()`

**File:** `src/app/api/wiki/pages/[id]/route.ts` (PUT)**
- ✅ **Loads existing page first** to get authoritative `contentFormat`
- ✅ **Rejects format switching** - returns 400 if `contentFormat` in request differs from existing
- ✅ **Rejects mismatched payloads:**
  - HTML pages cannot accept `contentJson` → 400 error
  - JSON pages cannot accept `content` (without `contentJson`) → 400 error
- ✅ **Preserves format** - never changes `contentFormat` field in updates

### 3. Autosave Safety

**File:** `src/components/wiki/wiki-editor-shell.tsx`**
- ✅ **Mount tracking:** `isMountedRef` prevents state updates after unmount
- ✅ **Stale closure prevention:** Uses `latestContentRef` and `onSaveRef` to always use latest values
- ✅ **Debounce cancellation:** Cancels pending saves on unmount via `debouncedSaveRef.current.cancel()`
- ✅ **State update guards:** All `setSaveStatus` calls check `isMountedRef.current` first

**File:** `src/lib/utils.ts`**
- ✅ **Added `cancel()` method** to debounce function for cleanup

### 4. Tests

**File:** `src/lib/wiki/__tests__/text-extract.test.ts`**
- ✅ Added tests for `EMPTY_TIPTAP_DOC` constant
- ✅ Validates structure and text extraction

---

## Manual Verification Steps

### 1. Create New Page Without contentJson

**Steps:**
1. Open browser DevTools → Network tab
2. Navigate to `/wiki/new`
3. Enter title: "Test Empty JSON"
4. **Don't type any content** (leave editor empty)
5. Click "Create Page"

**Expected:**
- ✅ Page creates successfully
- ✅ Network request shows `contentJson` is `EMPTY_TIPTAP_DOC` structure
- ✅ Database: `contentFormat = 'JSON'`, `contentJson` is not null
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

### 2. Update HTML Page - Cannot Become JSON

**Steps:**
1. Open any existing HTML page (created before Stage 1)
2. Click Edit
3. Open browser DevTools → Console
4. Manually send PUT request:
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
- ✅ No data corruption

**Verify in DB:**
```sql
SELECT "contentFormat", 
       CASE WHEN "contentJson" IS NOT NULL THEN 'Has JSON' ELSE 'No JSON' END as json_status
FROM wiki_pages 
WHERE id = '<pageId>';
-- Should still show: contentFormat='HTML', json_status='No JSON'
```

---

### 3. Update JSON Page - Cannot Overwrite HTML Content

**Steps:**
1. Create a new page (JSON format)
2. Add some content in TipTap editor
3. Wait for autosave
4. Open browser DevTools → Console
5. Manually send PUT request:
```javascript
fetch(`/api/wiki/pages/${pageId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Test',
    content: '<p>HTML content</p>'
    // No contentJson, no contentFormat
  })
}).then(r => r.json()).then(console.log)
```

**Expected:**
- ✅ Returns 400 error: "This page uses JSON format. Use contentJson field instead of content."
- ✅ Page remains JSON format
- ✅ Original JSON content preserved

**Verify in DB:**
```sql
SELECT "contentFormat", 
       "content",
       CASE WHEN "contentJson" IS NOT NULL THEN 'Has JSON' ELSE 'No JSON' END as json_status
FROM wiki_pages 
WHERE id = '<pageId>';
-- Should show: contentFormat='JSON', content='' (empty), json_status='Has JSON'
-- contentJson should still have original content
```

---

### 4. Autosave Safety - Unmount Test

**Steps:**
1. Create a new page
2. Type some content
3. **Immediately navigate away** (before 2s debounce completes)
4. Check browser console

**Expected:**
- ✅ No errors in console
- ✅ No "setState on unmounted component" warnings
- ✅ No network requests after navigation

**Verify:**
- Open Network tab, filter by `/api/wiki/pages`
- Navigate away quickly
- Check if any requests are made after navigation
- Should see request cancelled or no request at all

---

## Files Changed

### New Files
1. `src/lib/wiki/constants.ts` - EMPTY_TIPTAP_DOC constant

### Modified Files
1. `src/app/api/wiki/pages/route.ts` - Format enforcement, EMPTY_TIPTAP_DOC fallback
2. `src/app/api/wiki/pages/[id]/route.ts` - Format enforcement, reject switching/mismatches
3. `src/components/wiki/wiki-editor-shell.tsx` - Autosave safety (mount tracking, stale closure prevention)
4. `src/lib/utils.ts` - Added cancel() to debounce function
5. `src/lib/wiki/__tests__/text-extract.test.ts` - Added EMPTY_TIPTAP_DOC tests

---

## Summary

**Format Enforcement:**
- ✅ New pages always JSON (enforced in POST)
- ✅ Format switching blocked (PUT rejects format changes)
- ✅ Mismatched payloads rejected (HTML pages can't get JSON, JSON pages can't get HTML)

**Empty Doc Safety:**
- ✅ Missing/invalid `contentJson` defaults to `EMPTY_TIPTAP_DOC`
- ✅ All new pages have valid JSON structure

**Autosave Safety:**
- ✅ No state updates after unmount
- ✅ No stale closures (uses refs for latest values)
- ✅ Debounce cancelled on unmount
- ✅ Retry logic respects mount state

**Backward Compatibility:**
- ✅ HTML pages unchanged (legacy editor, manual save)
- ✅ Existing API behavior preserved for HTML pages

---

**Status:** Ready for testing. All format enforcement and safety measures in place.

