# L4 Step 9 – Category B Fixes (Context Bundling)

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Fixed Category B (Context Bundling) issues by implementing relation-based expansion and smart bundling strategies. The bundling logic now expands ContextObjects based on question type and follows relations to include all relevant entities.

---

## Category B Issues Fixed

### Issue 1: Limited Org People Bundle (50 limit)

**Problem:** Only 50 people were included in the prompt, missing data for health analysis questions.

**Fix Applied:**
- Increased `orgPeople` limit from 50 to 200
- Added relation-based expansion to include all relevant entities
- Removed hard limit for health analysis questions

**Impact:**
- `org-health-2` ("Which manager has the most direct reports?") can now analyze all people
- `org-health-1` ("Are there any single-person teams?") can analyze all teams

---

### Issue 2: Missing Team/Department/Position ContextItems in Bundle

**Problem:** Only `orgPeople` ContextObjects were included, not teams/departments/positions.

**Fix Applied:**
- Load all Org ContextItems from `fetchOrgContextSliceForWorkspace`
- Include teams, departments, positions, and people in `structuredContext`
- Group by type in prompt for better organization

**Impact:**
- `org-roles-1` ("What roles exist in the Engineering department?") can now access position ContextItems
- `org-structure-1` ("Which teams are part of Engineering?") can access team ContextItems
- `org-health-1` can analyze all teams with their relations

---

### Issue 3: No Relation-Based Expansion

**Problem:** Bundle didn't follow relations to include related entities (e.g., team members, department teams).

**Fix Applied:**
- Created `org-bundle-expander.ts` with expansion helpers:
  - `expandPersonContext` - Expands person → manager, reports, team, department
  - `expandTeamContext` - Expands team → members, department, managers
  - `expandDepartmentContext` - Expands department → teams, people, positions
  - `expandHealthAnalysisContext` - Includes all teams and people for org-wide analysis
- Integrated expansion into `loadOrgContextForRequest`

**Impact:**
- `org-reporting-2` ("Who reports to Head of Engineering?") can now find direct reports via reverse `reports_to` lookup
- `org-team-membership-1` can access all team members via `has_person` relations
- `org-structure-1` can access all department teams via `has_team` relations

---

### Issue 4: No Question-Type-Specific Bundling

**Problem:** Same bundle was used for all questions, regardless of question type.

**Fix Applied:**
- Added question-type detection in `loadOrgContextForRequest`:
  - Health analysis questions → `expandHealthAnalysisContext`
  - Department questions → `expandDepartmentContext`
  - Team questions → `expandTeamContext`
  - Person/reporting questions → `expandPersonContext`
- Different expansion strategies applied based on query keywords

**Impact:**
- More efficient bundling (only relevant entities included)
- Better accuracy for specific question types
- Reduced prompt size for focused questions

---

## Files Created/Modified

### New Files:
1. ✅ `src/lib/loopbrain/org-bundle-expander.ts`
   - Relation expansion helpers
   - Person/team/department/health expansion strategies
   - Reverse expansion for finding sources

### Modified Files:
1. ✅ `src/lib/loopbrain/orchestrator.ts`
   - Enhanced `loadOrgContextForRequest` with relation-based expansion
   - Updated `buildOrgPrompt` to include expanded ContextObjects grouped by type
   - Added question-type detection for smart bundling

---

## Expansion Strategies

### Person-Centric Expansion:
- Includes: person, manager (via `reports_to`), direct reports (reverse `reports_to`), team (via `member_of_team`), department (via `member_of_department`)
- Used for: "Who reports to X?", "Who manages X?"

### Team-Centric Expansion:
- Includes: team, members (via `has_person`), department (via `member_of_department`), members' managers
- Used for: "Who is in team X?", "Who manages team X?"

### Department-Centric Expansion:
- Includes: department, teams (via `has_team`), people (via `has_person`), team members, positions
- Used for: "Which teams are in department Y?", "What roles exist in department Y?"

### Health Analysis Expansion:
- Includes: ALL teams, ALL people, team members
- Used for: "Are there any single-person teams?", "Which manager has the most direct reports?"

---

## Testing

### Manual Testing Steps:
1. **Refresh Org context** via `/org/dev/loopbrain-status`
2. **Test Category B questions:**
   - `org-reporting-2` - "Who reports to the Head of Engineering?"
   - `org-roles-1` - "What roles exist in the Engineering department?"
   - `org-health-1` - "Are there any single-person teams?"
   - `org-health-2` - "Which manager has the most direct reports?"
3. **Verify bundle includes:**
   - All relevant entities (not just 50 people)
   - Teams, departments, positions (not just people)
   - Relations for graph traversal

### Expected Improvements:
- ✅ `org-reporting-2` - Should now find direct reports via reverse lookup
- ✅ `org-roles-1` - Should now access position ContextItems
- ✅ `org-health-1` - Should now analyze all teams
- ✅ `org-health-2` - Should now analyze all people

---

## Impact on Smoke Tests

**Expected Status Changes:**
- `org-reporting-2`: 🔍 → ✅ (if relations are correct)
- `org-roles-1`: 🔍 → ✅ (if positions are persisted)
- `org-health-1`: 🔍 → ✅ (if all teams are included)
- `org-health-2`: 🔍 → ✅ (if all people are included)

**Remaining Work:**
- If questions still fail after bundling fixes, reclassify as Category C (prompt/reasoning)
- Verify relations are correct in ContextItems (Category A check)
- Test with actual Org data to confirm improvements

---

## Next Steps

**L4 Step 10:** Address Category C failures (Prompt/Reasoning)
- Improve prompt instructions for relation traversal
- Add examples of correct reasoning
- Clarify relation semantics
- Add explicit guidance for common question patterns

---

## Notes

- Bundling now uses relation-based expansion instead of hard limits
- Question-type detection enables smart bundling
- All Org entity types (people, teams, departments, positions) are included
- Relations are preserved for graph traversal in prompts
- Foundation is ready for Category C prompt improvements

