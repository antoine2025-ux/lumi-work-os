# L4 Step 11 – Configurable Org Bundling & Prompting

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Made Org prompting and bundling configurable per question type (person/team/department/org). This introduces an explicit configuration layer that makes future Org features easier to extend and more predictable.

---

## Features Implemented

### 1. Org Question Type System

**File:** `src/lib/loopbrain/org-question-types.ts`

- Created `OrgQuestionType` enum: `org.person`, `org.team`, `org.department`, `org.org`
- Created `OrgQuestionContext` type with optional focus IDs
- Implemented `inferOrgQuestionTypeFromRequest` to infer type from request
- Implemented `inferOrgQuestionTypeFromPrimary` as fallback

**Benefits:**
- Centralized question type inference
- Explicit focus entity identification
- Reusable across bundle and prompt building

---

### 2. Type-Specific Bundle Expansion

**File:** `src/lib/loopbrain/org-bundle-expander.ts`

- Added `expandOrgBundleByType` function
- Routes to appropriate expansion strategy based on question type:
  - `org.person` → `expandPersonContext`
  - `org.team` → `expandTeamContext`
  - `org.department` → `expandDepartmentContext`
  - `org.org` → `expandHealthAnalysisContext`

**Benefits:**
- Centralized expansion logic
- Easy to modify behavior per question type
- Consistent expansion patterns

---

### 3. Enhanced Bundle Construction

**File:** `src/lib/loopbrain/orchestrator.ts` (`loadOrgContextForRequest`)

- Infers `OrgQuestionContext` from request
- Determines primary context object based on question type
- Uses `expandOrgBundleByType` for type-specific expansion
- Stores `orgQuestion` in context summary for prompt building

**Benefits:**
- More accurate primary context identification
- Type-aware expansion
- Better bundle composition

---

### 4. Type-Specific Prompt Hints

**File:** `src/lib/loopbrain/orchestrator.ts` (`buildOrgPrompt`)

- Added `buildOrgReasoningHint` function
- Generates type-specific reasoning hints:
  - `org.person`: Focus on person, use `reports_to` for manager/reports
  - `org.team`: Focus on team, use `has_person` for members
  - `org.department`: Focus on department, use `has_team`/`has_person`
  - `org.org`: Focus on overall org structure, aggregate metrics

**Benefits:**
- More focused reasoning guidance
- Better answer accuracy per question type
- Reduces confusion about which relations to use

---

## Question Type Inference Logic

### From Request:
- **Explicit IDs:** `teamId` → `org.team`, `roleId` → `org.person`
- **Query Keywords:**
  - Person: "reports to", "who manages", "direct reports", "manager", "who leads"
  - Team: "team", "who is in", "members of", "which people are in"
  - Department: "department", "which teams are part of", "roles exist in", "teams are in"
  - Org-wide: "single-person team", "manager has the most", "span of control", "how many", "organization"

### From Primary Context:
- Falls back to primary ContextObject type if request doesn't provide explicit type

---

## Expansion Strategies by Type

### `org.person`:
- Includes: person, manager (via `reports_to`), direct reports (reverse `reports_to`), team (via `member_of_team`), department (via `member_of_department`)
- Max depth: 2

### `org.team`:
- Includes: team, members (via `has_person`), department (via `member_of_department`), members' managers
- Max depth: 2

### `org.department`:
- Includes: department, teams (via `has_team`), people (via `has_person`), team members, positions
- Max depth: 2

### `org.org`:
- Includes: ALL teams, ALL people, team members
- Max depth: 1 (limited to avoid overwhelming prompt)

---

## Files Created/Modified

### New Files:
1. ✅ `src/lib/loopbrain/org-question-types.ts`
   - Org question type definitions
   - Type inference functions

### Modified Files:
1. ✅ `src/lib/loopbrain/org-bundle-expander.ts`
   - Added `expandOrgBundleByType` function
   - Integrated with existing expansion strategies

2. ✅ `src/lib/loopbrain/orchestrator.ts`
   - Enhanced `loadOrgContextForRequest` with type inference
   - Enhanced `buildOrgPrompt` with type-specific hints
   - Added `buildOrgReasoningHint` function

---

## Testing

### Manual Testing Steps:
1. **Test person-focused questions:**
   - "Who reports to the Head of Engineering?"
   - "Who manages [person]?"
   - Verify: Uses person expansion, includes manager and reports

2. **Test team-focused questions:**
   - "Who is in the AI & Loopbrain Team?"
   - "Which people are in [team]?"
   - Verify: Uses team expansion, includes members

3. **Test department-focused questions:**
   - "Which teams are part of the Engineering department?"
   - "What roles exist in [department]?"
   - Verify: Uses department expansion, includes teams and positions

4. **Test org-wide questions:**
   - "Are there any single-person teams?"
   - "Which manager has the most direct reports?"
   - Verify: Uses org-wide expansion, includes all entities

### Expected Improvements:
- ✅ More consistent answers per question type
- ✅ Better bundle composition (only relevant entities)
- ✅ More focused reasoning hints
- ✅ Easier to extend for future Org features

---

## Benefits

### For Current System:
- More predictable bundling behavior
- Better answer accuracy per question type
- Clearer reasoning guidance

### For Future Development:
- Easy to add new question types
- Centralized expansion logic
- Reusable type inference
- Extensible prompt hints

---

## Next Steps

**L4 Step 12:** Add Org QA dashboard summary
- Show ✅/⚠️/❌ counts per question type
- Identify which types need further attention
- Track progress over time

---

## Notes

- Question type inference is keyword-based (can be improved with ML/NLP later)
- Expansion strategies are configurable per type
- Prompt hints complement the system prompt (don't replace it)
- Foundation is ready for future Org features

