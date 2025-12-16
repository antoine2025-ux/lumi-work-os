# L4 Step 16 – QA Baseline Sync Script

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Added a dev script to sync the baseline QA questions from the latest snapshot. This script reads the latest snapshot file, parses the Questions table, and generates a TypeScript snippet that can be pasted into `org-qa-questions.ts` to keep baseline statuses in sync.

---

## Features Implemented

### 1. Baseline Sync Script

**File:** `scripts/sync-org-qa-baseline.ts`

- Finds the latest snapshot file in `docs/org/qa/`
- Parses the Questions table from markdown
- Generates a TypeScript snippet for `ORG_QA_QUESTIONS`
- Handles notes field (optional)
- Escapes special characters in labels and notes
- Provides clear instructions for next steps

**Script Flow:**
1. Read `docs/org/qa/` directory
2. Filter snapshot files (`org-qa-snapshot-*.md`)
3. Sort and select the latest file
4. Parse markdown Questions table
5. Generate TypeScript snippet
6. Print to console with instructions

**Parsing Logic:**
- Finds "## Questions" section
- Parses table rows (skips headers and separators)
- Extracts: ID, Label, Type, Status, Notes
- Validates status values (`pass`, `partial`, `fail`)
- Handles missing notes gracefully

**Output Format:**
```typescript
export const ORG_QA_QUESTIONS: OrgQaQuestion[] = [
  { id: "...", label: "...", type: "org.person", status: "pass", notes: "..." },
  ...
];
```

---

### 2. NPM Script Hook

**File:** `package.json`

- Added `"org:qa:sync-baseline": "tsx scripts/sync-org-qa-baseline.ts"`
- Added `tsx` to devDependencies (v4.19.2)
- Uses `tsx` for TypeScript execution (faster than ts-node)

**Usage:**
```bash
npm run org:qa:sync-baseline
```

---

## Workflow

### Step 1: Generate Snapshot
1. Navigate to `/org/dev/loopbrain-status`
2. Run QA tests and update statuses
3. Click "Export QA snapshot (Markdown)"
4. Confirm new file in `docs/org/qa/`

### Step 2: Run Baseline Sync
```bash
npm run org:qa:sync-baseline
```

**Expected Output:**
```
[org:qa:sync-baseline] Using latest snapshot: docs/org/qa/org-qa-snapshot-20241215-143022.md
[org:qa:sync-baseline] Parsed 7 questions from snapshot.

//////////////////// PASTE INTO src/lib/loopbrain/org-qa-questions.ts ////////////////////

export const ORG_QA_QUESTIONS: OrgQaQuestion[] = [
  { id: "org-reporting-1", label: "Who leads the Platform team?", type: "org.person", status: "pass", notes: "Fixed in L4 Steps 4-5" },
  ...
];

//////////////////////////////////////////////////////////////////////////////

Next steps:
1. Copy the block above.
2. Replace the existing ORG_QA_QUESTIONS in src/lib/loopbrain/org-qa-questions.ts.
3. Commit the change along with the snapshot file.
```

### Step 3: Update Baseline
1. Copy the generated snippet
2. Open `src/lib/loopbrain/org-qa-questions.ts`
3. Replace `ORG_QA_QUESTIONS` array
4. Save and verify

### Step 4: Verify
1. Restart dev server if needed
2. Navigate to `/org/dev/loopbrain-status`
3. Confirm baseline statuses match latest snapshot
4. Verify summary card matches

---

## Files Created/Modified

### New Files:
1. ✅ `scripts/sync-org-qa-baseline.ts`
   - Baseline sync script
   - Markdown parser
   - TypeScript generator

### Modified Files:
1. ✅ `package.json`
   - Added `org:qa:sync-baseline` script
   - Added `tsx` to devDependencies

---

## Implementation Details

### Parsing Logic:
- Finds "## Questions" section (case-insensitive)
- Skips header rows (`| ID |`) and separators (`|---|`)
- Parses table cells by splitting on `|`
- Validates status values
- Handles optional notes field

### Error Handling:
- Checks if `docs/org/qa/` exists
- Validates snapshot files found
- Validates questions parsed
- Provides clear error messages

### Output:
- Escapes quotes in labels/notes
- Removes newlines from text
- Handles missing notes gracefully
- Generates valid TypeScript syntax

---

## Benefits

### For Users:
- Semi-automatic baseline sync
- No manual copy-paste errors
- Version-controllable workflow
- Clear instructions

### For Development:
- Keeps baseline in sync with snapshots
- Reduces manual errors
- Foundation for automation
- Easy to maintain

---

## Testing

### Manual Testing Steps:
1. Export a QA snapshot via UI
2. Run `npm run org:qa:sync-baseline`
3. Verify:
   - Script finds latest snapshot
   - Parses questions correctly
   - Generates valid TypeScript
   - Instructions are clear

### Expected Behavior:
- ✅ Script finds latest snapshot
- ✅ Parses Questions table correctly
- ✅ Generates valid TypeScript snippet
- ✅ Handles notes field
- ✅ Escapes special characters
- ✅ Provides clear instructions

---

## Future Enhancements

### Option A: Fully Automatic Sync
- Auto-update `org-qa-questions.ts` directly
- Skip manual paste step
- Add confirmation prompt

### Option B: Snapshot Comparison
- Compare two snapshots
- Show diff in statuses
- Highlight changes

### Option C: CI/CD Integration
- Run sync in CI
- Auto-commit baseline updates
- Track changes over time

---

## Next Steps

**L4 Step 17:** Add QA workflow documentation
- Create `docs/org/qa/README.md`
- Document workflow: run tests → export snapshot → sync baseline → commit
- Provide examples and best practices

---

## Notes

- Script is semi-automatic (prints code, user pastes)
- Uses `tsx` for faster TypeScript execution
- Handles notes field (optional)
- Escapes special characters safely
- Provides clear error messages
- Foundation ready for full automation

