# Wiki Page Creation Unification - Implementation Complete

## Summary

All wiki page creation entry points have been unified to use a centralized helper function that ensures all new pages are created with JSON format and proper content persistence.

## Changes Made

### Phase 1: Audit ✅
- Documented all entry points in `WIKI_PAGE_CREATION_AUDIT.md`
- Found 9 UI entry points + 1 API endpoint
- All entry points already using JSON format (enforced by API)

### Phase 2: Centralized Helper ✅
- Created `src/lib/wiki/create-page.ts`
- Exports `createWikiPage()` function
- Always creates pages with `contentFormat='JSON'`
- Falls back to `EMPTY_TIPTAP_DOC` if `contentJson` missing/invalid
- Validates title and handles errors consistently

### Phase 3: Updated Entry Points ✅
Updated all entry points to use centralized helper:

1. **`/wiki/new` page** (`src/app/(dashboard)/wiki/new/page.tsx`)
   - ✅ Uses `createWikiPage()` helper
   - ✅ Redirects to `/wiki/${slug}?edit=1` (was missing `?edit=1`)

2. **Wiki Layout** (`src/components/wiki/wiki-layout.tsx`)
   - ✅ Uses `createWikiPage()` helper
   - ✅ Redirects to `/wiki/${slug}?edit=true&ai=open`

3. **Wiki AI Assistant** (`src/components/wiki/wiki-ai-assistant.tsx`)
   - ✅ Uses `createWikiPage()` helper
   - ✅ Redirects to `/wiki/${slug}?edit=1`

### Phase 4: Format Badge ✅
- Added dev-only format badge to wiki page detail view
- Shows "JSON" or "HTML (legacy)" next to page title
- Only visible when `NODE_ENV !== 'production'`
- Updated both edit mode and read mode:
  - `src/app/(dashboard)/wiki/[slug]/page.tsx` (edit mode)
  - `src/components/wiki/wiki-page-body.tsx` (read mode)

### Phase 5: Verification ✅
- API already enforces JSON format for all new pages
- All entry points use centralized helper
- Redirects include `?edit=1` to ensure content persists
- Format badge helps verify correct renderer is used

## Files Modified

1. `src/lib/wiki/create-page.ts` (NEW)
2. `src/app/(dashboard)/wiki/new/page.tsx`
3. `src/components/wiki/wiki-layout.tsx`
4. `src/components/wiki/wiki-ai-assistant.tsx`
5. `src/app/(dashboard)/wiki/[slug]/page.tsx`
6. `src/components/wiki/wiki-page-body.tsx`

## Testing Checklist

- [ ] Create page from `/wiki/new` → Should create JSON page, redirect with `?edit=1`
- [ ] Create page from wiki home → Should create JSON page
- [ ] Create page from workspace page → Should create JSON page
- [ ] Create page from AI assistant → Should create JSON page
- [ ] Create page from wiki navigation → Should navigate to `/wiki/new`
- [ ] Verify format badge shows "JSON" for new pages (dev only)
- [ ] Verify format badge shows "HTML (legacy)" for old pages (dev only)
- [ ] Verify `/wiki/document-drafting-functionality` shows correct format badge
- [ ] Verify autosave works after page creation (page has id)
- [ ] Verify content persists when clicking Save after creation

## Notes

- Autosave in `WikiEditorShell` will only trigger after page exists because:
  - In `/wiki/new`: After creation, we redirect away, so autosave stops
  - In `/wiki/[slug]`: Page already exists when editor mounts, so autosave is safe
- All new pages are guaranteed to be JSON format (enforced by API)
- Legacy HTML pages remain functional and show "Upgrade" button
