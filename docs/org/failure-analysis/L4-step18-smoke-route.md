# L4 Step 18 – Org QA Smoke Route Implementation

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Implemented a stubbed Org QA smoke endpoint and verified that the status page renders smoke questions correctly. This provides the foundation for running automated smoke tests against Org → Loopbrain functionality.

---

## Features Implemented

### 1. Stubbed Org QA Smoke API Endpoint

**File:** `src/app/api/loopbrain/org/qa/smoke/route.ts`

- **Method:** GET
- **Path:** `/api/loopbrain/org/qa/smoke`
- **Response Shape:**
  ```typescript
  {
    ok: true,
    questions: OrgQaSmokeQuestion[],
    meta: {
      source: "stub",
      lastUpdated: string // ISO timestamp
    }
  }
  ```

**Stubbed Questions:**
1. `org-baseline-health` - "Org – Baseline health" (pass)
2. `org-manager-span` - "Org – Manager span-of-control" (partial)
3. `org-hotspots` - "Org – Workload hotspots" (fail)

**Features:**
- Returns hardcoded smoke test questions
- Includes metadata (source, lastUpdated)
- Error handling with proper error responses
- Dynamic route configuration

---

### 2. Org QA Smoke Panel Component

**File:** `src/app/(dashboard)/org/dev/OrgQaSmokePanel.tsx`

- Fetches questions from `/api/loopbrain/org/qa/smoke`
- Displays questions with:
  - Label
  - Type badge
  - Status pill (pass/partial/fail with color coding)
  - "Run" button per question
- Loading state
- Error handling
- Empty state handling

**UI Features:**
- Status pills with color coding:
  - Pass: Green (`bg-emerald-500`)
  - Partial: Amber (`bg-amber-500`)
  - Fail: Red (`bg-rose-500`)
- Question count badge
- Source and last updated timestamp
- Responsive layout

---

### 3. Integration into Status Page

**File:** `src/app/(dashboard)/org/dev/loopbrain-status/page.tsx`

- Added `OrgQaSmokePanel` import
- Rendered panel before `OrgDevPageClient`
- Positioned in logical flow of dev tools

---

## API Contract

### Success Response:
```json
{
  "ok": true,
  "questions": [
    {
      "id": "org-baseline-health",
      "label": "Org – Baseline health",
      "type": "org",
      "status": "pass"
    },
    {
      "id": "org-manager-span",
      "label": "Org – Manager span-of-control",
      "type": "org",
      "status": "partial"
    },
    {
      "id": "org-hotspots",
      "label": "Org – Workload hotspots",
      "type": "org",
      "status": "fail"
    }
  ],
  "meta": {
    "source": "stub",
    "lastUpdated": "2024-12-15T14:30:22.000Z"
  }
}
```

### Error Response:
```json
{
  "ok": false,
  "error": "Failed to load Org QA smoke questions"
}
```

---

## Verification Steps

### 1. Start Dev Server
```bash
npm run dev
```

### 2. Navigate to Status Page
Open: `/org/dev/loopbrain-status`

### 3. Verify Smoke Tests Section
Should see:
- **Header:** "Org QA – Smoke Tests"
- **Subtitle:** "Questions loaded from stub (updated: [timestamp])"
- **Question count badge:** "3 questions"

### 4. Verify Questions Display
Each question should show:
- **Label:** Question text
- **Type:** Question type (org)
- **Status pill:** Color-coded status (pass/partial/fail)
- **Run button:** Clickable button

### 5. Verify Network Request
- Open browser DevTools → Network tab
- Filter for `/api/loopbrain/org/qa/smoke`
- Verify:
  - Request: GET `/api/loopbrain/org/qa/smoke`
  - Status: 200 OK
  - Response: JSON with `ok: true` and `questions` array

### 6. Verify No Errors
- Check browser console for errors
- Check Network tab for failed requests
- Verify all questions render correctly

---

## Files Created/Modified

### New Files:
1. ✅ `src/app/api/loopbrain/org/qa/smoke/route.ts`
   - Stubbed API endpoint
   - Returns hardcoded smoke questions

2. ✅ `src/app/(dashboard)/org/dev/OrgQaSmokePanel.tsx`
   - React component for displaying smoke questions
   - Fetches from API endpoint
   - Renders questions with status pills

### Modified Files:
1. ✅ `src/app/(dashboard)/org/dev/loopbrain-status/page.tsx`
   - Added `OrgQaSmokePanel` import
   - Rendered panel in page layout

---

## UI Components

### Status Pills:
- **Pass:** Green background with white text
- **Partial:** Amber background with white text
- **Fail:** Red background with white text

### Question Card:
- Border and background styling
- Label (bold)
- Type badge (muted text)
- Status pill (color-coded)
- Run button (muted background)

---

## Next Steps

**L4 Step 19:** Add "Run all smoke tests" control
- Add button to re-fetch questions
- Refresh UI after fetch
- Show loading state during refresh
- Enable quick re-check after changes

---

## Notes

- Endpoint is currently stubbed with hardcoded data
- Questions match the expected contract
- Component handles loading, error, and empty states
- Status pills use consistent color coding
- Run buttons are placeholders (not yet functional)
- Foundation ready for Step 19 implementation

---

## Testing Checklist

- ✅ API endpoint returns correct shape
- ✅ Component fetches on mount
- ✅ Questions render correctly
- ✅ Status pills show correct colors
- ✅ Loading state displays
- ✅ Error state handles failures
- ✅ Empty state handles no questions
- ✅ No console errors
- ✅ No network errors
- ✅ UI matches design expectations

