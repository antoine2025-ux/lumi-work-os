# L4 Step 21 – Refactor Org QA API Routes to Use Shared Catalog Loader

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Refactored Org QA API routes to use a shared catalog loader instead of hard-coded question arrays. This centralizes question management and prepares for future enhancements like overrides and real Loopbrain answers.

---

## Features Implemented

### 1. Org QA Catalog Loader

**File:** `src/lib/org-qa-catalog.ts`

**Purpose:** Single source of truth for Org QA questions

**Exports:**
- `OrgQaCatalogItem` type
- `loadOrgQaCatalog()` function

**Type Definition:**
```typescript
export type OrgQaCatalogItem = {
  id: string;
  label: string;
  type: "person" | "team" | "department" | "org";
  description: string | null;
  category: string | null;
};
```

**Function:**
- Reads from `ORG_QA_QUESTIONS` in `org-qa-questions.ts`
- Maps question types (`org.person` → `person`, etc.)
- Extracts notes as description
- Infers category from type
- Returns normalized catalog array

**Benefits:**
- Single source of truth
- Consistent question format
- Easy to extend with overrides
- Ready for dynamic question management

---

### 2. Updated Smoke Route

**File:** `src/app/api/loopbrain/org/qa/smoke/route.ts`

**Changes:**
- Removed hard-coded questions array
- Added import: `loadOrgQaCatalog`
- Replaced array with catalog loader call
- Maps catalog items to smoke question format
- Sets `status: "stub"` for all questions
- Includes `meta` with description and category
- Updates `meta.source` to `"catalog"`

**Before:**
```typescript
const questions: OrgQaSmokeQuestion[] = [
  {
    id: "org-baseline-health",
    label: "Org – Baseline health",
    type: "org",
    status: "pass",
  },
  // ...
];
```

**After:**
```typescript
const catalog = loadOrgQaCatalog();

const questions = catalog.map((q) => ({
  id: q.id,
  label: q.label,
  type: q.type,
  status: "stub" as const,
  meta: {
    description: q.description,
    category: q.category,
  },
}));
```

**Response Shape:**
```json
{
  "ok": true,
  "questions": [
    {
      "id": "org-reporting-1",
      "label": "Who leads the Platform team?",
      "type": "person",
      "status": "stub",
      "meta": {
        "description": "Fixed in L4 Steps 4-5",
        "category": "person"
      }
    }
  ],
  "meta": {
    "source": "catalog",
    "lastUpdated": "2024-12-15T14:30:22.000Z"
  }
}
```

---

### 3. Frontend Component Update

**File:** `src/app/(dashboard)/org/dev/OrgQaSmokePanel.tsx`

**Changes:**
- Updated `OrgQaSmokeQuestion` type to include `"stub"` status
- Added optional `meta` field to question type
- Component now handles catalog-sourced questions

**Status Handling:**
- Component supports `"stub"` status (treated as unknown/not tested)
- Existing status pills work for pass/partial/fail
- Stub questions can be displayed without status pill

---

## Type Mapping

### Question Type Mapping:
- `org.person` → `person`
- `org.team` → `team`
- `org.department` → `department`
- `org.org` → `org`

### Category Inference:
- Maps question type to category string
- Used for grouping and filtering
- Can be extended with custom categories

---

## Files Created/Modified

### New Files:
1. ✅ `src/lib/org-qa-catalog.ts`
   - Catalog loader implementation
   - Type definitions
   - Helper functions

### Modified Files:
1. ✅ `src/app/api/loopbrain/org/qa/smoke/route.ts`
   - Removed hard-coded questions
   - Added catalog loader import
   - Updated to use catalog

2. ✅ `src/app/(dashboard)/org/dev/OrgQaSmokePanel.tsx`
   - Updated type to include "stub" status
   - Added meta field support

---

## Verification Steps

### 1. Smoke Test Endpoint:
```bash
GET /api/loopbrain/org/qa/smoke
```

**Expected Response:**
- `ok: true`
- `questions`: Array from catalog
- `meta.source`: `"catalog"`
- All questions have `status: "stub"`
- Questions include `meta.description` and `meta.category`

### 2. Frontend Display:
- Navigate to `/org/dev/loopbrain-status`
- Verify "Org QA – Smoke Tests" section shows questions
- Questions should load from catalog
- Status pills may show "stub" or be hidden

### 3. Catalog Loader:
- Verify `loadOrgQaCatalog()` returns all questions from `ORG_QA_QUESTIONS`
- Type mapping works correctly
- Category inference works correctly

---

## Benefits

### For Development:
- Single source of truth for questions
- Easy to add new questions (just update `ORG_QA_QUESTIONS`)
- Consistent question format across routes
- Foundation for overrides and dynamic management

### For Future Enhancements:
- Ready for question overrides
- Ready for real Loopbrain answers
- Easy to add question metadata
- Can extend with custom categories

---

## Next Steps

**Future Enhancements:**
- Add question overrides system
- Implement real Loopbrain answer generation
- Add question metadata (tags, priority, etc.)
- Create question management UI
- Add question versioning

---

## Notes

- All questions currently return `status: "stub"` (by design)
- Catalog loader maps types from `org.*` format to simple format
- Description comes from `notes` field in `ORG_QA_QUESTIONS`
- Category is inferred from question type
- Foundation ready for per-question status updates
- No breaking changes to frontend (handles stub status)

---

## Testing Checklist

- ✅ Catalog loader returns all questions
- ✅ Smoke route uses catalog loader
- ✅ Questions have correct format
- ✅ Status is set to "stub"
- ✅ Meta fields populated correctly
- ✅ Response source is "catalog"
- ✅ Frontend handles stub status
- ✅ No hard-coded arrays remain
- ✅ Type mapping works correctly
- ✅ No console errors

