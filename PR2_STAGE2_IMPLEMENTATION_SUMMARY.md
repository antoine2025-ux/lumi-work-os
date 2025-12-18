# PR2 Stage 2: HTML to JSON Upgrade Implementation

**Status:** ✅ Complete  
**Date:** 2025-12-17

---

## Overview

Implemented on-demand upgrade of legacy HTML pages to JSON format (TipTap/ProseMirror). HTML pages remain HTML until explicitly upgraded via "Upgrade page" action. No automatic conversion.

---

## Files Changed

### New Files

1. **`src/lib/wiki/html-to-tiptap.ts`**
   - HTML to TipTap JSON conversion utility
   - Handles common HTML tags (p, h1-h6, ul/ol, blockquote, code, etc.)
   - Special handling for embed placeholders
   - Returns `{ doc, warnings }` structure
   - Lightweight regex-based parser (no dependencies)

2. **`src/app/api/wiki/pages/[id]/upgrade/route.ts`**
   - POST endpoint for upgrading HTML pages to JSON
   - Validates page format (must be HTML)
   - Converts HTML to TipTap JSON
   - Updates page with JSON format
   - Creates version snapshot
   - Idempotent (calling twice returns 400)

3. **`src/components/wiki/tiptap/extensions/embed.ts`**
   - TipTap embed node extension
   - Renders embed placeholders in editor
   - Preserves `embedId` attribute
   - Node name: `embed`, attrs: `{ embedId: string }`

4. **`src/lib/wiki/__tests__/html-to-tiptap.test.ts`**
   - Unit tests for HTML conversion
   - Tests: paragraphs, headings, lists, embeds, mixed content

### Modified Files

1. **`src/components/wiki/tiptap-editor.tsx`**
   - Added `Embed` extension to editor configuration

2. **`src/app/(dashboard)/wiki/[slug]/page.tsx`**
   - Added upgrade button (shows only for HTML pages)
   - Added upgrade confirmation dialog
   - Added `handleUpgradePage` function
   - Added state: `isUpgrading`, `showUpgradeDialog`
   - Imports: `Dialog`, `DialogContent`, etc.

---

## Implementation Details

### A) API Endpoint (`/api/wiki/pages/[id]/upgrade`)

**Behavior:**
1. ✅ Loads WikiPage by id
2. ✅ Returns 404 if not found
3. ✅ Returns 400 if `contentFormat !== 'HTML'` ("Already upgraded")
4. ✅ Converts `page.content` (HTML) to TipTap JSON
5. ✅ Returns 422 if conversion fails (with error details)
6. ✅ On success:
   - Updates `contentJson`, `contentFormat='JSON'`, `textContent`
   - Preserves original HTML in `content` field
   - Creates `WikiVersion` snapshot with JSON format
   - Does NOT mutate HTML version history
7. ✅ Returns updated page (minimal fields)

**Constraints:**
- ✅ ONLY allowed path to switch formats (HTML → JSON)
- ✅ Idempotent: calling twice returns 400

### B) HTML → TipTap Conversion (`html-to-tiptap.ts`)

**Supported Tags:**
- ✅ `p`, `br` → paragraphs / hard breaks
- ✅ `strong`, `b` → bold mark
- ✅ `em`, `i` → italic mark
- ✅ `h1..h6` → heading nodes (level 1-6)
- ✅ `ul/ol/li` → list nodes (bulletList/orderedList)
- ✅ `blockquote` → blockquote
- ✅ `code` (inline) → code mark
- ✅ `pre > code` → codeBlock
- ✅ `<div class="embed-placeholder" data-embed-id="...">` → embed node

**Error Handling:**
- ✅ Never throws on unknown tags
- ✅ Converts to plain text or drops safely
- ✅ Adds warnings for unknown tags

**Return Format:**
```typescript
{
  doc: JSONContent,  // Valid TipTap document
  warnings: string[] // Array of warning messages
}
```

### C) TipTap Embed Extension (`tiptap/extensions/embed.ts`)

**Features:**
- ✅ Node name: `embed`
- ✅ Attrs: `{ embedId: string }`
- ✅ Renders as placeholder: "Embed: {embedId}"
- ✅ Parsing/serialization preserves attrs
- ✅ Custom node view with styling

### D) UI: Upgrade Button

**Location:** `src/app/(dashboard)/wiki/[slug]/page.tsx`

**Behavior:**
- ✅ Shows only when `page.contentFormat === 'HTML'` and not editing
- ✅ Button icon: `FileText` (or `Loader2` when upgrading)
- ✅ On click: Opens confirmation modal
- ✅ Modal explains:
  - Page will move to new editor
  - HTML is preserved for fallback/export
  - Formatting preserved as much as possible
  - Embeds converted to embed nodes
- ✅ On confirm: Calls upgrade endpoint
- ✅ On success: Refreshes page data, renders TipTap editor
- ✅ On failure: Shows error toast, keeps page in HTML mode

---

## Testing

### Unit Tests

**File:** `src/lib/wiki/__tests__/html-to-tiptap.test.ts`

**Coverage:**
- ✅ Empty HTML → empty paragraph
- ✅ Basic paragraph conversion
- ✅ Headings (h1-h6)
- ✅ Lists (ul/ol/li)
- ✅ Blockquotes
- ✅ **Embed placeholder conversion** (required)
- ✅ Mixed content
- ✅ Whitespace handling

**Run tests:**
```bash
npm test src/lib/wiki/__tests__/html-to-tiptap.test.ts
```

### Manual Verification Steps

1. **Pick an existing HTML page with formatting + embed placeholder:**
   ```sql
   SELECT id, title, "contentFormat", content 
   FROM wiki_pages 
   WHERE "contentFormat" = 'HTML' 
   AND content LIKE '%embed-placeholder%'
   LIMIT 1;
   ```

2. **Click "Upgrade" button:**
   - Navigate to `/wiki/{slug}` where page is HTML format
   - Verify upgrade button appears (FileText icon)
   - Click button
   - Verify modal appears with explanation

3. **Confirm upgrade:**
   - Click "Upgrade Page" in modal
   - Verify loading state (spinner)
   - Wait for completion

4. **Verify results:**
   - ✅ Page now opens in TipTap editor (not legacy editor)
   - ✅ Formatting is preserved (headings, lists, bold/italic)
   - ✅ Embed placeholder becomes embed node placeholder
   - ✅ DB still has original HTML in `content` field
   - ✅ `contentFormat` switched to `'JSON'`
   - ✅ `contentJson` populated with TipTap JSON
   - ✅ `textContent` is populated

5. **Verify idempotency:**
   - Try clicking "Upgrade" again
   - Should not show button (page is already JSON)
   - Or if button still shows, clicking should return 400 error

6. **Check version history:**
   ```sql
   SELECT version, "contentFormat", "contentJson" IS NOT NULL as has_json
   FROM wiki_versions 
   WHERE "pageId" = '{pageId}'
   ORDER BY version DESC
   LIMIT 5;
   ```
   - ✅ Latest version should have `contentFormat='JSON'`
   - ✅ Latest version should have `contentJson` populated
   - ✅ Previous versions remain HTML format

---

## Database Verification

After upgrade, verify:

```sql
-- Check page format
SELECT id, title, "contentFormat", 
       "contentJson" IS NOT NULL as has_json,
       "textContent" IS NOT NULL as has_text
FROM wiki_pages 
WHERE id = '{pageId}';
-- Expected: contentFormat='JSON', has_json=true, has_text=true

-- Check version history
SELECT version, "contentFormat", 
       "contentJson" IS NOT NULL as has_json,
       "textContent" IS NOT NULL as has_text
FROM wiki_versions 
WHERE "pageId" = '{pageId}'
ORDER BY version DESC;
-- Expected: Latest version is JSON, older versions are HTML

-- Verify original HTML preserved
SELECT LENGTH(content) as html_length, 
       "contentFormat"
FROM wiki_pages 
WHERE id = '{pageId}';
-- Expected: html_length > 0 (original HTML still there)
```

---

## Error Scenarios

### 1. Page Already Upgraded
- **Action:** Call upgrade on JSON page
- **Expected:** 400 error: "Page is already upgraded to JSON format"

### 2. Page Not Found
- **Action:** Call upgrade with invalid page ID
- **Expected:** 404 error: "Page not found"

### 3. Conversion Failure
- **Action:** Call upgrade on page with malformed HTML (if parser fails)
- **Expected:** 422 error with error details

### 4. Network Error
- **Action:** Disconnect network, click upgrade
- **Expected:** Error toast, page remains HTML

---

## Files Summary

**New Files (4):**
1. `src/lib/wiki/html-to-tiptap.ts` (HTML conversion utility)
2. `src/app/api/wiki/pages/[id]/upgrade/route.ts` (Upgrade endpoint)
3. `src/components/wiki/tiptap/extensions/embed.ts` (Embed extension)
4. `src/lib/wiki/__tests__/html-to-tiptap.test.ts` (Unit tests)

**Modified Files (2):**
1. `src/components/wiki/tiptap-editor.tsx` (Added Embed extension)
2. `src/app/(dashboard)/wiki/[slug]/page.tsx` (Added upgrade UI)

---

## Next Steps

- ✅ Stage 2 complete
- ⏭️ Stage 3: Default all pages to JSON (optional cleanup)
- ⏭️ Stage 4: Remove HTML support (only if safe)

---

**Status:** Ready for testing. All components implemented and tested.

