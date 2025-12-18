# Format Badge Removal - Implementation Complete

## Summary

Removed the dev-only format badge from the wiki UI and added a silent invariant guard to catch regressions early.

## Changes Made

### Phase 0: Badge Location ✅
Found badge code in 2 locations:
1. `src/app/(dashboard)/wiki/[slug]/page.tsx` - Edit mode (lines 705-709)
2. `src/components/wiki/wiki-page-body.tsx` - Read mode (lines 86-90)

### Phase 1: Badge Removal ✅

**Removed:**
- Badge JSX rendering from both edit and read modes
- Badge import from `src/app/(dashboard)/wiki/[slug]/page.tsx`
- Badge import from `src/components/wiki/wiki-page-body.tsx`
- All conditional rendering logic (`process.env.NODE_ENV !== 'production'`)

**Layout Impact:**
- Edit mode: Removed flex wrapper div, title Input now standalone
- Read mode: Removed flex wrapper div, title h1 now standalone
- No spacing/layout issues introduced

### Phase 2: Silent Invariant Guard ✅

**Location:** `src/app/(dashboard)/wiki/[slug]/page.tsx`

**Implementation:**
- Added `formatWarningRef` useRef to track if warning has been logged
- Resets warning latch when navigating to a new page (slug changes)
- Logs console warning once per page load when:
  - User is in edit mode (`isEditing === true`)
  - Page data is loaded (`pageData` exists)
  - Page format is not JSON (`pageData.contentFormat !== 'JSON'`)

**Warning Message:**
```javascript
console.warn('[WIKI] Non-JSON page opened in editor', {
  pageId: pageData.id,
  contentFormat: pageData.contentFormat,
  title: pageData.title,
  slug: pageData.slug,
})
```

**Behavior:**
- Only logs once per page load (uses ref latch)
- Does not block viewing HTML pages in read mode
- Does not spam console (single warning per page)
- Helps catch regressions where HTML pages accidentally open in JSON editor

## Files Changed

1. **`src/app/(dashboard)/wiki/[slug]/page.tsx`**
   - Removed Badge import
   - Removed badge JSX from edit mode title section
   - Added silent invariant guard (lines 289-315)

2. **`src/components/wiki/wiki-page-body.tsx`**
   - Removed Badge import
   - Removed badge JSX from read mode title section

## Testing Checklist

- [x] Badge removed from edit mode
- [x] Badge removed from read mode
- [x] No TypeScript errors
- [x] No unused imports
- [x] Layout still renders correctly
- [ ] Open existing JSON page → No badge, editor loads
- [ ] Create new page → No badge, editor loads
- [ ] Open legacy HTML page → No badge, read view works
- [ ] Force edit on HTML page → Console warning appears once

## Notes

- The silent invariant guard is non-blocking (console warning only)
- For stricter enforcement later, can swap `console.warn` for `throw new Error()` behind a feature flag
- Guard only triggers in edit mode, allowing HTML pages to be viewed normally in read mode
- Warning latch resets when navigating to a new page (slug changes)
