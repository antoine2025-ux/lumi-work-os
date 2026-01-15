# L4 Step 10 – Category C Fixes (Prompt/Reasoning)

**Date:** 2024-12-XX  
**Status:** ✅ Completed

---

## Overview

Fixed Category C (Prompt/Reasoning) issues by creating a dedicated Org system prompt and improving reasoning instructions. The prompt now explicitly guides the LLM on how to traverse the Org graph and answer questions accurately.

---

## Category C Issues Fixed

### Issue 1: Missing Explicit Org System Prompt

**Problem:** Generic system prompt didn't encode Org-specific semantics and reasoning rules.

**Fix Applied:**
- Created `src/lib/loopbrain/prompts/org-system-prompt.ts` with dedicated `ORG_SYSTEM_PROMPT`
- Encodes ContextObject spec, Org graph semantics, and reasoning rules
- Explicitly states: "ONLY answer based on ORG CONTEXT OBJECTS provided"
- Defines all Org relation types and their semantics

**Impact:**
- LLM now understands Org graph structure
- Prevents hallucination of org structure
- Clear guidance on relation traversal

---

### Issue 2: Unclear Relation Semantics

**Problem:** LLM might not understand how to interpret relations like `reports_to`, `has_person`, etc.

**Fix Applied:**
- Added explicit relation semantics to system prompt:
  - `reports_to`: person A reports to person B
  - `has_person`: team/department X has member person Y
  - `member_of_team`: person Y is a member of team X
  - `has_team`: department D contains team T
  - And more...
- Added directionality explanations (A -> B means...)

**Impact:**
- LLM understands relation direction and meaning
- Can correctly traverse the graph
- Reduces confusion about relation semantics

---

### Issue 3: Missing Question-Specific Reasoning Instructions

**Problem:** No explicit instructions for common Org question patterns.

**Fix Applied:**
- Added detailed instructions in `buildOrgPrompt` for specific question patterns:
  - "Who reports to X?" → Find people with `reports_to` pointing to X
  - "Who manages X?" → Follow X's `reports_to` relation
  - "Which team is X in?" → Follow X's `member_of_team` relation
  - "Which teams are in department Y?" → Follow Y's `has_team` relations
  - "Who is in team Z?" → Follow Z's `has_person` relations
  - "What roles exist in department Y?" → Traverse department → teams → positions
  - "Are there any single-person teams?" → Count `has_person` relations per team
  - "Which manager has the most direct reports?" → Count `reports_to` targets per person

**Impact:**
- LLM has step-by-step guidance for each question type
- Reduces reasoning errors
- Ensures consistent answer format

---

### Issue 4: No Explicit "Don't Guess" Rule

**Problem:** LLM might invent org structure when data is missing.

**Fix Applied:**
- Added explicit rule: "If something is not present in the context, you MUST say you don't know"
- Added instruction: "Do NOT guess, invent, or hallucinate organizational structure"
- Added fallback: "If the context is insufficient, say: 'Based on the current org data, I can't see that information.'"

**Impact:**
- Prevents hallucination
- Encourages honest "I don't know" responses
- Improves trustworthiness

---

### Issue 5: Answer Format Not Specified

**Problem:** LLM might give vague answers like "you have N people" without naming them.

**Fix Applied:**
- Added explicit answer format instructions:
  - "Always list actual names/titles from the context objects"
  - "Do not just say 'you have N people' - name them explicitly"
  - Added example format: "**People in Engineering:**\n- Jane Doe — Senior Engineer — Platform Team"

**Impact:**
- More actionable answers
- Better user experience
- Consistent formatting

---

## Files Created/Modified

### New Files:
1. ✅ `src/lib/loopbrain/prompts/org-system-prompt.ts`
   - Dedicated Org system prompt
   - Encodes ContextObject spec
   - Defines Org relation semantics
   - Includes reasoning rules

### Modified Files:
1. ✅ `src/lib/loopbrain/orchestrator.ts`
   - Modified `callLoopbrainLLM` to accept optional `systemPrompt` parameter
   - Updated `handleOrgMode` to pass `ORG_SYSTEM_PROMPT`
   - Enhanced `buildOrgPrompt` with detailed reasoning instructions
   - Removed redundant system guidance (now in system prompt)

---

## Prompt Structure

### System Prompt (via `ORG_SYSTEM_PROMPT`):
- Role definition
- ContextObject spec
- Org relation semantics
- Reasoning rules
- "Don't guess" rule

### User Prompt (via `buildOrgPrompt`):
- Context objects (grouped by type)
- Question-specific reasoning instructions
- Answer format examples
- User question

---

## Testing

### Manual Testing Steps:
1. **Refresh Org context** via `/org/dev/loopbrain-status`
2. **Test Category C questions:**
   - "Who reports to the Head of Engineering?"
   - "What roles exist in the Engineering department?"
   - "Are there any single-person teams?"
   - "Which manager has the most direct reports?"
3. **Verify:**
   - Answers use actual names from context
   - Relations are traversed correctly
   - No hallucination when data is missing
   - Clear, formatted answers

### Expected Improvements:
- ✅ More accurate relation traversal
- ✅ No hallucination of org structure
- ✅ Better answer formatting
- ✅ Honest "I don't know" when data is missing

---

## Impact on Smoke Tests

**Expected Status Changes:**
- All Category C questions should improve
- Questions that were failing due to reasoning errors should now pass
- Questions that were partial should become complete

**Remaining Work:**
- Manual QA verification needed
- Some questions may still need refinement based on actual test results
- May need to add more question-specific examples if patterns emerge

---

## Next Steps

**L4 Step 11:** Make Org prompting and bundling configurable per question type
- Person-focused vs. team-focused vs. department-focused vs. org-wide
- Allow future Org features to plug into Loopbrain without rewriting core prompt logic

---

## Notes

- System prompt is now separate from user prompt (better separation of concerns)
- Reasoning instructions are explicit and question-specific
- Answer format is standardized
- "Don't guess" rule prevents hallucination
- Foundation is ready for future Org features

