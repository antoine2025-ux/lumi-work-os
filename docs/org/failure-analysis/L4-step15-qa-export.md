# L4 Step 15 – Export Org QA Snapshot

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Added export functionality to save Org QA status snapshots as markdown files in `docs/org/qa/` for version control. This allows tracking QA progress over time without manual code edits.

---

## Features Implemented

### 1. Snapshot Markdown Builder

**File:** `src/lib/loopbrain/org-qa-snapshot.ts`

- Created `OrgQaSnapshotPayload` type:
  - `generatedAt`: ISO timestamp
  - `label`: Optional snapshot label
  - `questions`: Effective QA questions array
  - `summaryByType`: Summary statistics by type
- Created `buildOrgQaSnapshotMarkdown` function:
  - Generates markdown with header, summary table, questions table
  - Escapes pipe characters in text
  - Includes notes column for questions

**Markdown Structure:**
- Header with timestamp and optional label
- Summary table by question type (Type | Label | Total | Pass | Partial | Fail)
- Questions table (ID | Label | Type | Status | Notes)

**Benefits:**
- Reusable markdown generation
- Version-controllable format
- Human-readable structure

---

### 2. Dev API Route for Export

**File:** `src/app/api/dev/org/qa-export/route.ts`

- Dev-only endpoint (404 in production)
- Validates snapshot payload
- Creates `docs/org/qa/` directory if needed
- Generates timestamped filename: `org-qa-snapshot-YYYYMMDD-HHMMSS.md`
- Writes markdown file to disk
- Returns file path on success

**Filename Format:**
- `org-qa-snapshot-20241215-143022.md`
- Includes date and time for uniqueness

**Benefits:**
- Automatic file naming
- Version-controllable snapshots
- Easy to track progress over time

---

### 3. Export Button in Dev Page

**File:** `src/app/(dashboard)/org/dev/OrgDevPageClient.tsx`

- Added export button with loading state
- Uses effective questions (baseline + overrides)
- Computes summary from effective questions
- Shows last export file path on success
- Shows error message on failure
- Disabled during export

**Export Flow:**
1. User clicks "Export QA snapshot (Markdown)"
2. Button shows "Exporting…"
3. Effective questions computed (baseline + overrides)
4. Summary computed from effective questions
5. Payload sent to API
6. API writes markdown file
7. Success: Shows file path
8. Error: Shows error message

**Benefits:**
- One-click export
- Real-time feedback
- Includes runtime overrides
- Version-controllable output

---

## Snapshot Format

### Header:
```markdown
# Org QA Snapshot

Generated at: 2024-12-15T14:30:22.000Z
Label: Org → Loopbrain QA snapshot
```

### Summary Table:
```markdown
## Summary by question type

| Type | Label | Total | Pass | Partial | Fail |
|------|-------|-------|------|---------|------|
| org.person | Person questions | 2 | 2 | 0 | 0 |
| org.team | Team questions | 1 | 1 | 0 | 0 |
| org.department | Department questions | 2 | 2 | 0 | 0 |
| org.org | Org-wide questions | 2 | 2 | 0 | 0 |
```

### Questions Table:
```markdown
## Questions

| ID | Label | Type | Status | Notes |
|----|-------|------|--------|-------|
| org-reporting-1 | Who leads the Platform team? | org.person | pass | Fixed in L4 Steps 4-5 |
| org-reporting-2 | Who reports to the Head of Engineering? | org.person | pass | Fixed via reverse lookup and bundling improvements |
```

---

## Files Created/Modified

### New Files:
1. ✅ `src/lib/loopbrain/org-qa-snapshot.ts`
   - Snapshot payload type
   - Markdown builder function

2. ✅ `src/app/api/dev/org/qa-export/route.ts`
   - Dev-only export endpoint
   - File writing logic

### Modified Files:
1. ✅ `src/app/(dashboard)/org/dev/OrgDevPageClient.tsx`
   - Added export button and state
   - Added export handler function

---

## Usage

### Exporting a Snapshot:
1. Navigate to `/org/dev/loopbrain-status`
2. Optionally update QA statuses by clicking status pills
3. Click "Export QA snapshot (Markdown)"
4. Wait for export to complete
5. Check `docs/org/qa/` for new snapshot file

### Version Control:
1. Commit snapshot files to git
2. Track QA progress over time
3. Compare snapshots to see improvements
4. Use as baseline for future QA runs

---

## Testing

### Manual Testing Steps:
1. Run dev server: `npm run dev`
2. Navigate to `/org/dev/loopbrain-status`
3. Update a few QA statuses
4. Click "Export QA snapshot (Markdown)"
5. Verify:
   - Button shows "Exporting…" during request
   - Success message shows file path
   - File exists in `docs/org/qa/`
   - Markdown content is correct

### Expected Behavior:
- ✅ Export button works
- ✅ File created with timestamped name
- ✅ Markdown includes effective statuses
- ✅ Summary table is accurate
- ✅ Questions table includes all questions

---

## Benefits

### For Users:
- One-click export
- Version-controllable snapshots
- Track progress over time
- No manual code edits needed

### For Development:
- Automated snapshot generation
- Easy to compare QA runs
- Foundation for baseline sync
- Ready for CI/CD integration

---

## Future Enhancements

### Option A: Baseline Sync Script
- Read latest snapshot
- Update `ORG_QA_QUESTIONS` baseline statuses
- Keep baseline in sync with last known good run

### Option B: Auto-Export on Status Change
- Export automatically when status changes
- Keep snapshots up-to-date
- Reduce manual export steps

### Option C: Snapshot Comparison
- Compare two snapshots
- Show improvements/regressions
- Generate diff report

---

## Next Steps

**L4 Step 16:** Add QA baseline sync script
- Read latest snapshot from `docs/org/qa/`
- Update `ORG_QA_QUESTIONS` baseline statuses
- Keep baseline in sync with last known good QA run

---

## Notes

- Export is dev-only (404 in production)
- Snapshots include runtime overrides
- Files are timestamped for uniqueness
- Markdown format is version-controllable
- Foundation is ready for baseline sync

