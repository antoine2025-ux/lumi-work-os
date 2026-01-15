# Wiki Page Creation Entry Points Audit

## Phase 1: All Create Entry Points

### API Endpoint
- **POST `/api/wiki/pages`** (`src/app/api/wiki/pages/route.ts`)
  - Currently enforces `contentFormat='JSON'` (hardcoded)
  - Falls back to `EMPTY_TIPTAP_DOC` if `contentJson` missing/invalid
  - ✅ Already enforces JSON format

### UI Entry Points

1. **`/wiki/new` page** (`src/app/(dashboard)/wiki/new/page.tsx`)
   - Uses `WikiEditorShell` (TipTap)
   - Sends: `title`, `contentJson`, `contentFormat: 'JSON'`
   - ✅ Already uses JSON format
   - Redirects to `/wiki/${slug}` (should redirect with `?edit=1`)

2. **Wiki Layout - AI Assistant** (`src/components/wiki/wiki-layout.tsx`)
   - Line 452: Creates page via `onCreatePage` callback
   - Sends: `title`, `contentJson: EMPTY_TIPTAP_DOC`, `contentFormat: 'JSON'`
   - ✅ Already uses JSON format
   - Navigates to `/wiki/${slug}?edit=true&ai=open`

3. **Wiki AI Assistant** (`src/components/wiki/wiki-ai-assistant.tsx`)
   - Line 935: Creates page via API
   - Sends: `title`, `contentJson: EMPTY_TIPTAP_DOC`, `contentFormat: 'JSON'`
   - ✅ Already uses JSON format
   - Navigates to `/wiki/${slug}`

4. **Wiki Home Page** (`src/app/(dashboard)/wiki/home/page.tsx`)
   - Line 244: `handleCreatePage()` calls `window.triggerCreatePage()`
   - This triggers wiki-layout's create flow
   - ✅ Indirectly uses JSON format

5. **Wiki Workspace Page** (`src/app/(dashboard)/wiki/workspace/[id]/page.tsx`)
   - Line 256: `handleCreatePage()` calls `window.triggerCreatePageWithWorkspace(id)`
   - This triggers wiki-layout's create flow
   - ✅ Indirectly uses JSON format

6. **Wiki Navigation** (`src/components/wiki/wiki-navigation.tsx`)
   - Line 97: `handleNewPage()` navigates to `/wiki/new`
   - ✅ Uses `/wiki/new` which uses JSON format

7. **Command Palette** (`src/components/ui/command-palette.tsx`)
   - Line 167: Has "create wiki page" keyword
   - Need to check implementation

8. **Dashboard Grid** (`src/app/(dashboard)/dashboard-grid/page.tsx`)
   - Line 540: "New Page" button
   - Need to check implementation

9. **Home Page** (`src/app/home/page.tsx`)
   - Line 483: "New Page" button
   - Need to check implementation

## Summary

**Current State:**
- ✅ API enforces JSON format
- ✅ Most entry points already use JSON format
- ⚠️ `/wiki/new` redirects without `?edit=1`
- ⚠️ Need to verify all entry points use centralized helper
- ⚠️ Need to add format badge to `/wiki/[slug]`

**Action Items:**
1. Create centralized `createWikiPage` helper
2. Update all entry points to use helper
3. Fix `/wiki/new` redirect to include `?edit=1`
4. Add format badge to wiki page detail view
5. Verify `/wiki/document-drafting-functionality` page
