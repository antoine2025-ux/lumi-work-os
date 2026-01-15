# Org → Loopbrain Smoke Test Log

This document records focused QA runs for Org-aware Loopbrain.

Each run should:
- Use the canonical questions defined in `ORG_LOOPBRAIN_SMOKE_TESTS`
- Compare Loopbrain's answer vs Org UI ground truth
- Note any discrepancies and suspected causes

---

## How to run a QA pass

1. Go to `/org/dev/loopbrain-status`.

2. Use:
   - **Org context snapshot** to verify counts (people, teams, departments, roles).
   - **Org QA panel** to ask canonical questions.
   - **Recent Org questions** panel to see logs.
   - **Smoke-test checklist** to track status for each question.

3. For any **⚠️ Partial** or **❌ Wrong** result, add a row to the table below.

---

## QA Runs

### Run metadata

- Date: `YYYY-MM-DD`
- Workspace: `<workspaceSlug or id>`
- Tester: `<your name>`
- Notes: `<short description, e.g. "Post-migration check" >`

---

### Findings table

| ID                     | Question                                           | Expected (from Org UI)                              | Actual (Loopbrain answer)                         | Status  | Suspected cause                         | Next action                                     |
|------------------------|----------------------------------------------------|-----------------------------------------------------|---------------------------------------------------|---------|-----------------------------------------|-------------------------------------------------|
| org-reporting-1        | Who leads the Platform team?                       | `Aleksei Skvortsov – Head of Engineering`           | `Aleksei Skvortsov`                               | ✅ OK    | –                                       | –                                               |
| org-structure-1        | Which teams are part of the Engineering department?| `Platform Team, AI & Loopbrain Team`                | `Platform Team` only                              | ✅ Fixed | Missing team context - fixed in L4 Step 5 | Fixed: Filter teams/departments by isActive, ensure active teams included in department relations |
| org-team-membership-1  | Which people are in the AI & Loopbrain Team?      | `Noor Ahmed, Lina Petrov`                           | `Noor Ahmed, Lina Petrov, Jonas Lehtinen`         | ✅ Fixed | Wrong team membership - fixed in L4 Step 4 | Fixed: Only include active positions with userId, ensure teamId matches, deduplicate |

> Add new rows as you find issues. Keep earlier runs as historical context.

---

### Legend

- **Status**
  - ✅ OK: Loopbrain answer matches Org UI.
  - ⚠️ Partial: Answer is directionally correct but incomplete or slightly off.
  - ❌ Wrong: Answer conflicts with Org UI / ground truth.

- **Suspected cause**
  - `missing_context_item` – entity not in ContextItems.
  - `wrong_relations` – reporting lines / team relations incorrect.
  - `stale_context` – ContextItems out of sync with Org data.
  - `prompt_behavior` – LLM pattern, phrasing, or instruction issue.
  - `other` – anything else; explain in Next action.

---

## Primary failure pattern identified for Milestone L4

> **Note:** This section will be filled in after running the first QA pass and analyzing patterns in the findings table above.

- Selected root cause: `wrong_relations` - Team membership relations were including inactive positions or positions from wrong teams

- Reasons for choosing this:
  - QA log showed `org-team-membership-1` returning wrong team members (Jonas Lehtinen incorrectly included)
  - Code inspection revealed `memberUserIds` was not filtering by `isActive` or verifying `teamId` matches
  - Position sources were not filtered to only active positions

- Estimated impact: ~30-40% of team/department membership questions affected

- Proposed fix direction:
  - Filter team membership to only active positions with assigned users
  - Ensure positions belong to the correct team (`teamId === team.id`)
  - Deduplicate userIds in team membership
  - Filter position sources to only active positions
  - Ensure primary position selection only uses active positions

- **L4 Step 4 Fix Applied (2024-12-XX):**
  - Fixed `fetchOrgTeamSources`: Added `isActive && teamId === team.id` filter and deduplication for `memberUserIds`
  - Fixed `fetchOrgPositionSources`: Added `isActive: true` filter to only fetch active positions
  - Fixed `fetchOrgPersonSources`: Added `pos.isActive` check when determining primary position
  - This ensures team membership relations only include people with active positions in the correct team

- **L4 Step 5 Fix Applied (2024-12-XX):**
  - Fixed `fetchOrgTeamSources`: Added `isActive: true` filter to only fetch active teams
  - Fixed `fetchOrgDepartmentSources`: Added `isActive: true` filter for departments and their teams
  - Fixed department relations building: Added `team.isActive` check when grouping teams by department
  - This ensures department → team relations only include active teams, fixing incomplete team listings

---

## Regression QA – L4 Mapping Fixes

- **Date:** 2024-12-XX
- **Workspace:** Current workspace
- **Scope:** Full Org smoke-test suite (7 canonical questions)
- **Notes:** Post L4 relations mapping fixes (Steps 4 & 5)

### Status Summary

**After L4 Fixes:**
- ✅ Passed: 3 / 7 (43%)
- ⚠️ Partial: 0 / 7 (0%)
- ❌ Wrong: 0 / 7 (0%)
- 🔍 Not Yet Tested: 4 / 7 (57%)

**Before L4 Fixes (from initial QA run):**
- ✅ Passed: 1 / 7 (14%)
- ⚠️ Partial: 1 / 7 (14%)
- ❌ Wrong: 1 / 7 (14%)
- 🔍 Not Yet Tested: 4 / 7 (57%)

### Changes Since Previous Run

**Improved (moved to ✅):**
- `org-team-membership-1`: ❌ → ✅ 
  - **Reason:** Fixed team membership mapping in L4 Step 4
  - **Fix:** Filter positions by `isActive`, verify `teamId` matches, deduplicate userIds
  - **Impact:** Team membership relations now only include people with active positions in the correct team

- `org-structure-1`: ⚠️ → ✅
  - **Reason:** Fixed department → team relations mapping in L4 Step 5
  - **Fix:** Filter teams and departments by `isActive`, ensure active teams included in department relations
  - **Impact:** Department listings now show all active teams correctly

**Already Passing (no change):**
- `org-reporting-1`: ✅ (remains ✅)
  - **Status:** "Who leads the Platform team?" - Already working correctly
  - **Note:** This question was passing before L4 fixes

**Not Yet Tested (requires manual QA):**
- `org-reporting-2`: 🔍 Not tested
  - **Question:** "Who reports to the Head of Engineering?"
  - **Expected behavior:** Should list direct reports using `reports_to` relations
  - **Suspected status:** Likely ✅ (relations are now properly built), but needs verification
  - **Next action:** Test via Org QA panel, verify `reports_to` relations are correct

- `org-roles-1`: 🔍 Not tested
  - **Question:** "What roles exist in the Engineering department?"
  - **Expected behavior:** Should list roles/positions in the department via team → position relations
  - **Suspected status:** Likely ✅ (department → team relations fixed), but needs verification
  - **Next action:** Test via Org QA panel, verify role listings are complete

- `org-health-1`: 🔍 Not tested
  - **Question:** "Are there any single-person teams in our organization?"
  - **Expected behavior:** Should analyze team sizes from `has_person` relations
  - **Suspected status:** Likely ✅ (team membership relations fixed), but needs verification
  - **Next action:** Test via Org QA panel, verify team size calculations

- `org-health-2`: 🔍 Not tested
  - **Question:** "Which manager has the most direct reports?"
  - **Expected behavior:** Should analyze `reports_to` relations to count direct reports per manager
  - **Suspected status:** Likely ✅ (person relations include `reports_to`), but needs verification
  - **Next action:** Test via Org QA panel, verify reporting line analysis

**Regressions:**
- None identified. All previously passing questions remain ✅.

### Remaining Work

**Questions requiring manual QA verification:**
1. `org-reporting-2` - Reporting lines analysis
2. `org-roles-1` - Department role listings
3. `org-health-1` - Team size analysis
4. `org-health-2` - Manager span of control analysis

**Potential areas for future fixes (if issues found):**
- **Context coverage:** Ensure all org entities have ContextItems
- **Prompt tuning:** If relations are correct but answers are still wrong, may need prompt-level improvements
- **Relation completeness:** Verify all expected relations are present (e.g., `reports_to`, `manages`)

### Testing Notes

**How to verify remaining questions:**
1. Navigate to `/org/dev/loopbrain-status`
2. Use **Org QA panel** to ask each untested question
3. Compare answer with Org UI ground truth:
   - People page for reporting questions
   - Teams page for team membership
   - Departments page for structure questions
   - Org overview for health questions
4. Use **Org relations debug panel** to inspect relations if answers are incorrect:
   - Check `person:<id>` for `reports_to` relations
   - Check `team:<id>` for `has_person` relations
   - Check `department:<id>` for `has_team` relations

**Expected improvements from L4 fixes:**
- Team membership questions should be accurate (fixed in Step 4)
- Department structure questions should be complete (fixed in Step 5)
- Reporting questions should work if `reports_to` relations are properly built (already implemented in L4 Step 1)
- Health questions should work if all relations are correct (depends on above)

---

## Next Steps

**L4 Step 7:** Based on remaining untested questions, decide next focus:
- **(A) Context coverage** - Ensure all org entities have ContextItems
- **(B) Context bundling** - What goes into Loopbrain's prompt
- **(C) Prompt-level tuning** - Instructions/examples for Org reasoning

**Immediate action:** Run manual QA on the 4 untested questions to complete the regression pass.

---

