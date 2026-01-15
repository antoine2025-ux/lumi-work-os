# L4 Step 13 – Drill-Down from QA Summary Card

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Added drill-down functionality from the QA summary card to filter the Org QA panel by question type. Clicking a row in the summary card filters the smoke-test panel to show only questions of that type. Clicking again resets to "all".

---

## Features Implemented

### 1. Filter State Management

**File:** `src/app/(dashboard)/org/dev/OrgDevPageClient.tsx`

- Created client wrapper component to manage filter state
- Uses `useState` to track `qaFilterType` (`OrgQaQuestionType | "all"`)
- Shares filter state between summary card and smoke test panel
- Defaults to `"all"` (no filter)

**Benefits:**
- Centralized filter state
- Easy to extend with additional filter logic
- Clean separation between server and client components

---

### 2. Clickable Summary Card

**File:** `src/app/(dashboard)/org/dev/OrgQaSummaryByTypeCard.tsx`

- Added `selectedType` and `onSelectType` props
- Made rows clickable with `button` elements
- Added visual feedback:
  - Selected row has `bg-muted/80` background
  - "Active filter" badge shown when selected
  - Hover states for better UX
- Toggle behavior: clicking same type again resets to "all"
- Updated description to explain click behavior

**Benefits:**
- Clear visual indication of active filter
- Intuitive toggle behavior
- Better UX with hover states

---

### 3. Filter-Aware Smoke Test Panel

**File:** `src/app/(dashboard)/org/dev/OrgLoopbrainSmokeTestPanel.tsx`

- Added `filterType` prop (optional, defaults to "all")
- Created mapping from smoke test IDs to QA question types
- Filters smoke tests based on `filterType`
- Shows filtered count in description
- Displays "No smoke tests for this filter yet" when empty

**Filter Logic:**
- Maps `ORG_QA_QUESTIONS` IDs to types
- Filters `ORG_LOOPBRAIN_SMOKE_TESTS` by matching type
- Shows all tests when `filterType === "all"`

**Benefits:**
- Focused debugging on specific question types
- Clear indication of active filter
- Seamless integration with existing panel

---

### 4. Page Integration

**File:** `src/app/(dashboard)/org/dev/loopbrain-status/page.tsx`

- Replaced direct component imports with `OrgDevPageClient`
- Maintains server component structure for data fetching
- Client wrapper handles all interactive filter logic

**Benefits:**
- Clean separation of concerns
- Server component for data fetching
- Client component for interactivity

---

## User Flow

1. **Default View:**
   - Summary card shows all types
   - Smoke test panel shows all questions

2. **Click "Person questions" row:**
   - Row highlights with "Active filter" badge
   - Smoke test panel filters to show only person-type questions
   - Description updates: "Filtered by: org.person"

3. **Click same row again:**
   - Filter resets to "all"
   - Smoke test panel shows all questions
   - "Active filter" badge disappears

4. **Click other type rows:**
   - Same behavior for team, department, org-wide questions
   - Only one filter active at a time

---

## Files Created/Modified

### New Files:
1. ✅ `src/app/(dashboard)/org/dev/OrgDevPageClient.tsx`
   - Client wrapper component for filter state management

### Modified Files:
1. ✅ `src/app/(dashboard)/org/dev/OrgQaSummaryByTypeCard.tsx`
   - Added clickable rows with filter state
   - Added visual feedback for selected state

2. ✅ `src/app/(dashboard)/org/dev/OrgLoopbrainSmokeTestPanel.tsx`
   - Added `filterType` prop
   - Implemented filtering logic
   - Updated UI to show filter state

3. ✅ `src/app/(dashboard)/org/dev/loopbrain-status/page.tsx`
   - Integrated `OrgDevPageClient` wrapper

---

## Testing

### Manual Testing Steps:
1. Navigate to `/org/dev/loopbrain-status`
2. Verify default view shows all questions
3. Click "Person questions" row:
   - Verify row highlights
   - Verify smoke test panel shows only person questions (2 tests)
4. Click same row again:
   - Verify filter resets
   - Verify all questions shown
5. Test other question types similarly

### Expected Behavior:
- ✅ Clicking a row filters the panel
- ✅ Clicking again resets filter
- ✅ Visual feedback is clear
- ✅ Filter state persists during session

---

## Benefits

### For Users:
- Quick focus on specific question types
- Easier debugging of problem areas
- Clear visual feedback

### For Development:
- Reusable filter pattern
- Easy to extend with more filter options
- Clean component separation

---

## Next Steps

**L4 Step 14:** Add status sync helper
- Update `ORG_QA_QUESTIONS` statuses based on latest smoke-test runs
- Reflect real, recent results without manual code edits
- Sync with smoke test panel status state

---

## Notes

- Filter state is client-side only (session-based)
- Smoke test IDs must match QA question IDs for filtering to work
- Foundation is ready for additional filter options (e.g., status-based filtering)

