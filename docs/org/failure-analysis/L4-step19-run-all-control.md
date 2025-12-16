# L4 Step 19 – Run All Org QA Smoke Tests Control

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Added a "Run all smoke tests" control to the Org QA smoke panel that allows users to manually refresh the smoke test questions by re-fetching from the API endpoint. This provides immediate feedback and enables quick re-checking after changes.

---

## Features Implemented

### 1. State Management

**Added State Variables:**
- `isRunning`: Boolean to track if smoke tests are currently running
- `lastRunAt`: ISO timestamp string of the last successful run

**Purpose:**
- `isRunning`: Controls button disabled state and shows loading indicator
- `lastRunAt`: Displays when the last run occurred

---

### 2. Reusable Fetch Function

**Function:** `loadSmokeTests()`

**Extracted from:** Previously inline `useEffect` fetch logic

**Behavior:**
1. Sets `isRunning` to `true` at start
2. Clears any previous errors
3. Fetches from `/api/loopbrain/org/qa/smoke`
4. Parses JSON response
5. Updates `data` state with new questions
6. Sets `lastRunAt` to current timestamp on success
7. Handles errors gracefully
8. Sets `isRunning` to `false` in `finally` block

**Benefits:**
- Reusable for both initial load and manual refresh
- Consistent error handling
- Tracks run history

---

### 3. Run All Button

**Location:** Next to "Org QA – Smoke Tests" header

**Features:**
- **Label:** "Run all smoke tests" (when idle)
- **Loading State:** Shows spinner + "Running…" text
- **Disabled State:** Button disabled when `isRunning` is true
- **onClick:** Calls `loadSmokeTests()` function
- **Styling:** Consistent with existing design system

**Visual States:**
- **Idle:** Button enabled, shows "Run all smoke tests"
- **Running:** Button disabled, shows spinner + "Running…"
- **Error:** Button re-enabled, error message displayed

---

### 4. Last Run Timestamp

**Display:** Below the header, next to source information

**Format:** "Last run: [friendly date/time]"

**Visibility:** Only shown after first successful manual run

**Example:** "Last run: 12/15/2024, 2:30:22 PM"

---

## User Flow

### Initial Load:
1. Component mounts
2. `useEffect` calls `loadSmokeTests()`
3. Questions load and display
4. No "Last run" timestamp (initial load)

### Manual Refresh:
1. User clicks "Run all smoke tests" button
2. Button shows "Running…" with spinner
3. Button becomes disabled
4. API request sent to `/api/loopbrain/org/qa/smoke`
5. Response received and parsed
6. Questions list updates (if data changed)
7. "Last run" timestamp updates
8. Button re-enabled, shows "Run all smoke tests"

### Error Handling:
1. If request fails, error message displayed
2. Button re-enabled
3. Previous questions remain visible
4. "Last run" timestamp not updated

---

## UI Components

### Button States:

**Idle State:**
```tsx
<button disabled={false}>
  Run all smoke tests
</button>
```

**Running State:**
```tsx
<button disabled={true}>
  <spinner />
  Running…
</button>
```

### Timestamp Display:
```tsx
{lastRunAt && (
  <>
    <span>•</span>
    <span>Last run: {new Date(lastRunAt).toLocaleString()}</span>
  </>
)}
```

---

## Files Modified

### Modified Files:
1. ✅ `src/app/(dashboard)/org/dev/OrgQaSmokePanel.tsx`
   - Added `isRunning` and `lastRunAt` state
   - Extracted `loadSmokeTests()` function
   - Added "Run all smoke tests" button
   - Added "Last run" timestamp display
   - Updated button to show loading state

---

## Testing Checklist

### Manual Testing:
- ✅ Button appears next to header
- ✅ Button click triggers API request
- ✅ Button shows loading state during request
- ✅ Button disabled during request
- ✅ Questions refresh after successful request
- ✅ "Last run" timestamp updates after successful request
- ✅ Error handling works correctly
- ✅ Button re-enabled after request completes
- ✅ Initial load still works correctly
- ✅ No console errors
- ✅ Network tab shows correct requests

### Network Verification:
- ✅ Each click sends GET request to `/api/loopbrain/org/qa/smoke`
- ✅ Request includes proper headers
- ✅ Response parsed correctly
- ✅ No duplicate requests
- ✅ No unhandled errors

---

## Benefits

### For Users:
- Quick refresh without page reload
- Visual feedback during refresh
- Clear indication of last run time
- Easy to re-check after changes

### For Development:
- Foundation for per-question run actions
- Consistent error handling
- Reusable fetch logic
- Ready for Step 20 implementation

---

## Next Steps

**L4 Step 20:** Add per-question "Run" actions
- Make individual "Run" buttons functional
- Each button triggers targeted smoke test
- Update question status based on result
- Provide per-question feedback

---

## Notes

- Button uses existing design system styling
- Loading state includes spinner animation
- Timestamp uses browser's locale formatting
- Error handling preserves previous state
- Foundation ready for per-question actions
- Consistent with existing UI patterns

