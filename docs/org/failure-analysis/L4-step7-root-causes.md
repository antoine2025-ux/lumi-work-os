# L4 Step 7 – Root Cause Classification of Smoke-Test Failures

**Date:** 2024-12-XX  
**Workspace:** Current workspace  
**Scope:** All Org smoke-test questions (7 canonical questions)

## Legend

- **A = Context Coverage** – Missing data in ContextItems (missing entities, missing relations, wrong types)
- **B = Context Bundling** – Data exists but wrong/incomplete bundle sent to LLM (filtering, limits, missing expansions)
- **C = Prompt / Reasoning** – Data is correct but LLM misinterprets it (needs better instructions, examples, structure)

---

## Failures Overview Table

| Question ID | Question Summary | Status | Root Cause (A/B/C) | Notes |
|-------------|------------------|--------|----------------------|-------|
| org-reporting-1 | "Who leads the Platform team?" | ✅ OK | – | Already passing, no issues |
| org-structure-1 | "Which teams are part of the Engineering department?" | ✅ Fixed | A (was) | Fixed in L4 Step 5 - was missing active teams in department relations |
| org-team-membership-1 | "Which people are in the AI & Loopbrain Team?" | ✅ Fixed | A (was) | Fixed in L4 Step 4 - was including inactive positions |
| org-reporting-2 | "Who reports to the Head of Engineering?" | 🔍 Untested | **B (fixed)** | Fixed in L4 Step 9 - reverse lookup via relations, person expansion |
| org-roles-1 | "What roles exist in the Engineering department?" | 🔍 Untested | **B (fixed)** | Fixed in L4 Step 9 - position ContextItems bundled, department expansion |
| org-health-1 | "Are there any single-person teams?" | 🔍 Untested | **B (fixed)** | Fixed in L4 Step 9 - all teams bundled, health analysis expansion |
| org-health-2 | "Which manager has the most direct reports?" | 🔍 Untested | **B (fixed)** | Fixed in L4 Step 9 - all people bundled (limit increased to 200), health expansion |

---

## Detailed Notes By Category

### A – Context Coverage Issues

**Status:** ✅ **Mostly Resolved** (L4 Steps 4 & 5 fixed major issues)

**Previously Fixed:**
- ✅ `org-team-membership-1` - Missing `isActive` filter on positions
- ✅ `org-structure-1` - Missing `isActive` filter on teams/departments

**Potential Remaining Issues:**
- **Position ContextItems:** Positions may not be persisted as ContextItems (only people/teams/departments are)
  - **Impact:** `org-roles-1` might fail if positions aren't in ContextItems
  - **Check:** Verify if `role` ContextItems exist in ContextStore
  - **Fix:** Ensure positions are persisted as ContextItems when org context syncs

- **Missing Relations:** Some relations might still be missing
  - **Impact:** `org-reporting-2` might fail if `reports_to` relations aren't built correctly
  - **Check:** Use relations debug panel to verify `reports_to` relations exist
  - **Fix:** Already implemented in L4 Step 1, but verify they're persisted

**How to Identify Category A Issues:**
1. Use relations debug panel (`/org/dev/loopbrain-status`)
2. Check if ContextItems exist for the entity type
3. Check if relations array is populated
4. Compare with Org UI to see what's missing

---

### B – Context Bundling Issues

**Status:** ⚠️ **Likely Issue** (Based on code inspection)

**Current Bundling Behavior:**
- `orgPeople` is limited to **50 items** (`orgPeopleSlice.slice(0, 50)`)
- Only `orgPeople` ContextObjects are included in prompt (not team/department ContextItems)
- Semantic search retrieves up to 10 items (configurable)
- No explicit bundling of team/department ContextItems

**Potential Issues:**

1. **`org-reporting-2` - "Who reports to the Head of Engineering?"**
   - **Issue:** Requires reverse lookup of `reports_to` relations
   - **Current:** Only `orgPeople` (50 limit) are bundled, may miss some reports
   - **Fix:** Need to bundle all people OR use relations to find reports
   - **Category:** **B** - Bundling incomplete

2. **`org-roles-1` - "What roles exist in the Engineering department?"**
   - **Issue:** Requires department → team → position chain
   - **Current:** Positions may not be in ContextItems, or not bundled
   - **Fix:** Need to bundle position ContextItems OR extract from orgPeople
   - **Category:** **B** - Missing position data in bundle

3. **`org-health-1` - "Are there any single-person teams?"**
   - **Issue:** Requires analyzing ALL teams' `has_person` relations
   - **Current:** Only 50 people bundled; teams may not be bundled
   - **Fix:** Need to bundle team ContextItems with relations
   - **Category:** **B** - Missing team ContextItems in bundle

4. **`org-health-2` - "Which manager has the most direct reports?"**
   - **Issue:** Requires analyzing ALL `reports_to` relations
   - **Current:** Only 50 people bundled; may miss some managers/reports
   - **Fix:** Need to bundle all people OR use relations graph traversal
   - **Category:** **B** - Bundling limit too restrictive

**How to Identify Category B Issues:**
1. Check what's actually in the prompt (log or inspect)
2. Compare with what's in ContextItems (use relations debug)
3. Check limits (50 people, 10 semantic search results)
4. Verify if team/department ContextItems are included

**Potential Fixes:**
- Increase `orgPeople` limit or remove limit
- Bundle team/department ContextItems explicitly
- Use relations to traverse graph instead of bundling all entities
- Add position ContextItems to bundle

---

### C – Prompt / Reasoning Issues

**Status:** ✅ **Fixed** (L4 Step 10 improvements applied)

**Previously Fixed:**
- ✅ Missing explicit Org system prompt - Created `ORG_SYSTEM_PROMPT` with ContextObject spec and relation semantics
- ✅ Unclear relation semantics - Added explicit definitions for all Org relation types
- ✅ Missing question-specific instructions - Added detailed reasoning instructions for common question patterns
- ✅ No "don't guess" rule - Added explicit rule to prevent hallucination
- ✅ Answer format not specified - Added explicit format instructions with examples

**How to Identify Category C Issues:**
1. Verify data is correct (Category A check)
2. Verify bundle is complete (Category B check)
3. If both pass but answer is wrong → Category C
4. Check prompt structure and instructions

**Current Prompt Structure:**
- Dedicated `ORG_SYSTEM_PROMPT` with ContextObject spec and relation semantics
- Explicit reasoning instructions for each question pattern
- "Don't guess" rule prevents hallucination
- Answer format examples for consistency
- Relations are clearly explained with directionality

**L4 Step 10 Fixes Applied:**
- Created `src/lib/loopbrain/prompts/org-system-prompt.ts`
- Modified `callLoopbrainLLM` to accept Org-specific system prompt
- Enhanced `buildOrgPrompt` with detailed reasoning instructions
- Added question-specific guidance for all common Org question patterns

---

## Summary

### Current Status:
- **A-count:** 0 active (2 fixed in L4 Steps 4 & 5)
- **B-count:** 0 active (4 fixed in L4 Step 9)
- **C-count:** 0 active (fixed in L4 Step 10 - pending manual QA verification)

### Classification Breakdown:

**✅ Passing (3 questions):**
- `org-reporting-1` - ✅ OK
- `org-structure-1` - ✅ Fixed (was A)
- `org-team-membership-1` - ✅ Fixed (was A)

**🔍 Untested (4 questions) - All Likely Category B:**
- `org-reporting-2` - **B** (bundling limit, reverse lookup)
- `org-roles-1` - **B** (missing position ContextItems in bundle)
- `org-health-1` - **B** (missing team ContextItems in bundle)
- `org-health-2` - **B** (bundling limit too restrictive)

### Recommended Next Sub-Milestone

**Category B is highest** → **Shift to L5: Bundle Strategy**

**Rationale:**
- All untested questions are likely Category B issues
- Current bundling only includes `orgPeople` (limited to 50)
- Missing team/department/position ContextItems in bundle
- Need to improve what goes into Loopbrain's prompt

**L5 Focus Areas:**
1. **Expand bundling** - Include team/department ContextItems explicitly
2. **Remove/increase limits** - 50 people limit may be too restrictive
3. **Add position ContextItems** - Ensure positions are bundled for role questions
4. **Relation-based traversal** - Use relations to find related entities instead of bundling everything
5. **Smart filtering** - Bundle only relevant entities based on question type

---

## Testing Strategy

### To Verify Category B Issues:

1. **Test each untested question:**
   - Ask via Org QA panel
   - Check if answer is incomplete or wrong

2. **Inspect bundle:**
   - Log what's actually sent to LLM
   - Compare with what's in ContextItems
   - Check if limits are causing issues

3. **Use relations debug:**
   - Verify relations exist in ContextItems
   - Check if relations are in the bundle
   - See if reverse lookups are possible

### To Verify Category C Issues:

1. **If data is correct but answer is wrong:**
   - Check prompt structure
   - Review instructions for clarity
   - Test with simpler examples

2. **Add explicit relation guidance:**
   - "Use `reports_to` relations to find direct reports"
   - "Follow `has_person` relations to count team members"
   - Add examples of relation traversal

---

## Next Steps

**Immediate:**
1. Run manual QA on 4 untested questions
2. Classify actual failures (if any) into A/B/C
3. Update this document with real findings

**If Category B Confirmed:**
- Start L5: Bundle Strategy improvements
- Focus on expanding what goes into prompt
- Ensure team/department/position ContextItems are included
- Consider relation-based traversal instead of bundling everything

**If Category C Found:**
- Start L7: Prompt Engineering
- Add explicit relation traversal instructions
- Add examples of correct reasoning
- Improve prompt structure

---

## Notes

- This classification is based on code inspection and likely failure modes
- Actual failures may differ - update this document after manual QA
- Category B is most likely based on current bundling implementation
- All fixes should be verified with relations debug panel

