# L4 Step 20 – Per-Question "Run" Actions

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Added per-question "Run" actions to Org QA smoke tests, allowing users to re-run individual smoke tests and visually highlight the selected question's result. This provides granular control over smoke test execution while maintaining the same backend endpoint.

---

## Features Implemented

### 1. Focused Question Tracking

**State Variable:** `focusedQuestionId`
- Type: `string | null`
- Purpose: Tracks which question was last re-run
- Persists after run completes to maintain visual highlight

**Behavior:**
- Set when `loadSmokeTests(questionId)` is called with a question ID
- Cleared when "Run all smoke tests" is called (no ID passed)
- Remains set after successful run to show highlight

---

### 2. Updated Load Function

**Function:** `loadSmokeTests(questionIdToHighlight?: string)`

**Changes:**
- Added optional `questionIdToHighlight` parameter
- Sets `focusedQuestionId` at start of function
- Updates per-question last run timestamp if question ID provided
- Maintains existing behavior for "Run all" (no ID passed)

**Flow:**
1. Set `isRunning` to `true`
2. Set `focusedQuestionId` to provided ID (or `null`)
3. Fetch from API
4. Update questions data
5. Update global `lastRunAt`
6. Update per-question `questionLastRunAt` if ID provided
7. Set `isRunning` to `false`

---

### 3. Per-Question Run Buttons

**Location:** Right side of each question row

**Features:**
- **Label:** "Run"
- **Disabled State:** When `isRunning` is `true`
- **onClick:** Calls `loadSmokeTests(question.id)`
- **Styling:** Consistent with existing design

**Behavior:**
- Clicking button triggers API request
- Button disabled during request
- All questions refresh after request
- Only clicked question is highlighted

---

### 4. Visual Highlighting

**Focused Question Styling:**
- Background: `bg-primary/5` (subtle primary tint)
- Border: `border-primary/30` (primary-colored border)
- Shadow: `shadow-sm` (subtle elevation)
- Transition: Smooth color transition

**Visual Indicators:**
- **"Last re-run" badge:** Small badge next to question label
- **Highlighted background:** Subtle primary color tint
- **Enhanced border:** Primary-colored border

**Conditions:**
- Highlighted when `focusedQuestionId === question.id`
- Remains highlighted after run completes
- Cleared when "Run all" is clicked

---

### 5. Per-Question Last Run Timestamps

**State Variable:** `questionLastRunAt`
- Type: `Record<string, string>`
- Purpose: Tracks last run time for each question individually
- Key: Question ID, Value: ISO timestamp string

**Display:**
- Shown below question label
- Format: "Last run: [friendly date/time]"
- Only visible if question has been individually run
- Separate from global "Last run" timestamp

**Update Logic:**
- Updated when `loadSmokeTests(questionId)` is called with an ID
- Not updated when "Run all" is called
- Persists across component re-renders

---

## User Flow

### Per-Question Run:
1. User clicks "Run" button on a specific question
2. Button becomes disabled
3. `focusedQuestionId` set to clicked question ID
4. API request sent to `/api/loopbrain/org/qa/smoke`
5. Response received and parsed
6. All questions refresh (full list updated)
7. Clicked question highlighted with:
   - Primary background tint
   - Primary border
   - "Last re-run" badge
   - Per-question timestamp updated
8. Button re-enabled
9. Highlight persists until another action

### Run All (Existing):
1. User clicks "Run all smoke tests" button
2. `focusedQuestionId` set to `null`
3. All questions refresh
4. Global "Last run" timestamp updates
5. No individual question highlighted
6. Per-question timestamps unchanged

---

## UI Components

### Question Row States:

**Normal State:**
```tsx
<div className="bg-background/70 border">
  {/* Question content */}
  <button onClick={() => loadSmokeTests(question.id)}>Run</button>
</div>
```

**Focused State:**
```tsx
<div className="bg-primary/5 border-primary/30 shadow-sm">
  {/* Question content */}
  <span>Last re-run</span>
  <button disabled={isRunning}>Run</button>
</div>
```

### Per-Question Timestamp:
```tsx
{questionLastRun && (
  <>
    <span>•</span>
    <span>Last run: {new Date(questionLastRun).toLocaleString()}</span>
  </>
)}
```

---

## Files Modified

### Modified Files:
1. ✅ `src/app/(dashboard)/org/dev/OrgQaSmokePanel.tsx`
   - Added `focusedQuestionId` state
   - Added `questionLastRunAt` state
   - Updated `loadSmokeTests` function signature
   - Added per-question "Run" buttons
   - Added visual highlighting logic
   - Added per-question timestamp display

---

## Testing Checklist

### Per-Question Run:
- ✅ Each question has a "Run" button
- ✅ Clicking "Run" triggers API request
- ✅ Button disabled during request
- ✅ All questions refresh after request
- ✅ Only clicked question is highlighted
- ✅ "Last re-run" badge appears on focused question
- ✅ Per-question timestamp updates
- ✅ Highlight persists after run completes

### Run All (Regression):
- ✅ "Run all smoke tests" button still works
- ✅ All questions refresh
- ✅ Global "Last run" timestamp updates
- ✅ No individual question highlighted
- ✅ Per-question timestamps unchanged

### Visual States:
- ✅ Focused question has primary background tint
- ✅ Focused question has primary border
- ✅ "Last re-run" badge visible on focused question
- ✅ Per-question timestamp displays correctly
- ✅ Smooth transitions between states

### Error Handling:
- ✅ Errors handled gracefully
- ✅ Previous state preserved on error
- ✅ Button re-enabled after error
- ✅ No console errors

---

## Benefits

### For Users:
- Granular control over smoke test execution
- Clear visual feedback for focused question
- Per-question run history tracking
- Easy to re-test specific questions

### For Development:
- Foundation for per-question test execution
- Consistent UX pattern
- Ready for backend per-question endpoints
- Maintains existing "Run all" functionality

---

## Next Steps

**L4 Step 21:** Introduce configuration model
- Create baseline question catalog
- Move questions from hardcoded route handler
- Shared source of truth for questions
- Enable dynamic question management

---

## Notes

- Per-question runs still use same backend endpoint
- All questions refresh on any run (by design)
- Visual highlighting is UX-only (no backend change)
- Per-question timestamps are frontend-only
- Foundation ready for per-question endpoints
- Consistent with existing UI patterns

