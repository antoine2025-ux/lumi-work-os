# Loopbrain Phase 7: Answer Templates per Intent - Complete ✅

## Summary

Implemented answer shaping so Loopbrain produces consistently useful outputs for each intent type, while staying grounded and citing sources. This is prompt+post-processing only - no new data sources.

## Files Created

1. **`src/lib/loopbrain/answer-templates.ts`**
   - `getAnswerTemplate()` - Returns template string for intent and mode
   - Templates for:
     - `capacity_planning` - 5 sections: What you need, Constraints, Recommended coverage, Risks, What I'm missing
     - `status_update` - 4 sections: Current status, What's blocking, Next 3 actions, Risks / due dates
     - `who_is_responsible` - Direct answer + Why + Next step suggestion
     - `find_document` / `how_to` - Best doc(s) list, Key excerpt bullets, Suggested next question
     - `list_entities` - Summary count, Grouped list (5-10 items), Note if more exist
     - `prioritization` - Ranked items, "If we do nothing" risk, Recommended order
     - `summarize` - TL;DR, Key points, Context
     - `unknown` / default - General template

2. **`src/lib/loopbrain/answer-format.ts`**
   - `validateTemplateCompliance()` - Lightweight validation for answer structure
   - Checks for required sections based on intent
   - Returns `FormatValidation` with `ok` and `missingSections[]`
   - Does NOT re-call LLM (no retries)

## Files Updated

1. **`src/lib/loopbrain/orchestrator-types.ts`**
   - Added `metadata.format` to `LoopbrainResponse`:
     - `ok: boolean`
     - `missingSections: string[]`

2. **`src/lib/loopbrain/orchestrator.ts`**
   - Imported `getAnswerTemplate` and `validateTemplateCompliance`
   - Updated `buildSpacesPrompt()`, `buildOrgPrompt()`, `buildDashboardPrompt()`:
     - Inject answer template after grounding rules (if intent available)
     - Templates complement grounding rules, don't override them
   - Updated all mode handlers (`handleSpacesMode`, `handleOrgMode`, `handleDashboardMode`):
     - Validate format compliance after citation validation
     - Log warnings if format validation fails
     - Add `format` metadata to response

3. **`prisma/schema.prisma`**
   - Updated `TimeOff` model:
     - Added unique constraint: `@@unique([workspaceId, userId, startDate, endDate])`
     - Added index: `@@index([workspaceId, status])` for query performance

4. **`scripts/test-loopbrain-smoke.ts`**
   - Added Test 13: Answer Templates & Format Compliance
   - Added `testTemplateCompliance()` function structure

## Template Details

### Capacity Planning Template

**Sections (in order):**
1. **What you need** - Restate requirement, cite constraints
2. **Constraints** - Time off, overloaded people, team constraints
3. **Recommended coverage** - Ranked list with availability/workload
4. **Risks** - What could go wrong, coverage gaps
5. **What I'm missing** - Data gaps, additional info needed

**Citations Required:** person:*, time_off:*, team:*

### Status Update Template

**Sections:**
1. **Current status** - Current state, recent changes
2. **What's blocking** - Blockers/dependencies
3. **Next 3 actions** - Concrete, prioritized steps
4. **Risks / due dates** - Upcoming deadlines, at-risk items

**Citations Required:** project:*, task:*, epic:*

### Who Is Responsible Template

**Structure:**
1. **Direct answer** (first line) - Name + role + team
2. **Why** - Relations establishing ownership
3. **Next step suggestion** - Tagged as [ACTION: ...]

**Citations Required:** person:*, role:*

### Find Document / How-To Template

**Structure:**
1. **Best doc(s) list** (max 5) - Ranked, with descriptions
2. **Key excerpt bullets** - 3-5 key points from top docs
3. **Suggested next question** - One follow-up question

**Citations Required:** page:*, project:*

### List Entities Template

**Structure:**
1. **Summary count** - Total and breakdown
2. **Grouped list** (5-10 items max) - By status/team/department
3. **If more exist** - Note about additional items

**Citations Required:** project:*, task:*, page:*, etc.

### Prioritization Template

**Structure:**
1. **Ranked items** (with criteria) - Top 3-5, with rationale
2. **"If we do nothing" risk** - Consequences of delay
3. **Recommended order** - Numbered execution order

**Citations Required:** project:*, task:*, epic:*

### Summarize Template

**Structure:**
1. **TL;DR** - One sentence summary
2. **Key points** - 3-5 bullets with citations
3. **Context** - Brief background if needed

**Citations Required:** type:id for each point

## Implementation Details

### Template Injection

Templates are injected into system prompts **after** grounding rules:

```
## CRITICAL: Grounding Rules
[...]

**Answer Format (capacity planning):**
[... template ...]
```

This ensures:
- Grounding rules take priority
- Templates guide structure, not content
- Citations remain mandatory

### Format Validation

Validation happens **after** citation validation:

1. Extract intent from request
2. Call `validateTemplateCompliance(answer, intent)`
3. Log warning if sections missing
4. Add `format` metadata to response

**No retries** - validation is for monitoring only.

### Validation Rules

- **capacity_planning**: Checks for 5 required headings
- **status_update**: Checks for 4 key sections
- **who_is_responsible**: Checks for direct answer
- **find_document** / **how_to**: Checks for doc list
- **list_entities**: Checks for list format
- **prioritization**: Checks for ranking
- **summarize**: Checks for summary format

## Example Outputs

### Capacity Planning Query

**Query:** "Who has capacity next week?"

**Answer Structure:**
```
## What you need
We need capacity for next week (source: workspace:ws123).

## Constraints
- Sarah is off until 2025-12-20 (source: time_off:to123)
- John has 3 overdue tasks (source: person:user456)

## Recommended coverage
1. Jane (source: person:user789) - Available, 2 in-progress tasks
2. Team Backend (source: team:team123) - 3 available members

## Risks
If Jane takes this, her 2 overdue tasks may slip.

## What I'm missing
I don't have time off data for Mike.
```

### Status Update Query

**Query:** "Status of Project X"

**Answer Structure:**
```
## Current status
Project X is active with 5 tasks in progress (source: project:proj123).

## What's blocking
Task Y is blocked waiting on dependency (source: task:task456).

## Next 3 actions
1. Resolve dependency for Task Y (source: task:task456)
2. Review Task Z status (source: task:task789)
3. Update project timeline (source: project:proj123)

## Risks / due dates
Task Y is overdue (due 2025-12-15) (source: task:task456).
```

## Verification Steps

1. ✅ **Type Check**: No TypeScript errors
2. ✅ **Lint Check**: No linter errors
3. ⏳ **Manual Test 1**: Query: "Who has capacity next week?" (capacity_planning)
   - Expected: Answer contains 5 required sections
   - Expected: Citations to person:*, time_off:*, team:*
   - Expected: `metadata.format.ok === true` (or missing sections logged)
4. ⏳ **Manual Test 2**: Query: "Status of Project X" (status_update)
   - Expected: Answer contains 4 required sections
   - Expected: Citations to project:*, task:*
5. ⏳ **Manual Test 3**: Query: "Where is our onboarding doc?" (find_document)
   - Expected: Answer contains doc list, excerpts, next question
   - Expected: Citations to page:* objects

## Key Features

1. ✅ **Intent-specific templates** - Structured output for each intent
2. ✅ **Grounded answers** - Templates require citations
3. ✅ **Format validation** - Lightweight post-check for monitoring
4. ✅ **No retries** - Validation is for debugging only
5. ✅ **Consistent structure** - Same intent = same format
6. ✅ **Complementary to grounding** - Templates don't override rules

## Constraints Met

- ✅ No new DB tables
- ✅ No new "agent framework"
- ✅ Must remain grounded (citations required)
- ✅ Keep existing modes and routing intact

## TimeOff Model Improvements

Added to `prisma/schema.prisma`:
- Unique constraint: `@@unique([workspaceId, userId, startDate, endDate])` - Prevents duplicate time off entries
- Index: `@@index([workspaceId, status])` - Improves query performance for approved/pending time off

**Next Step:** Run Prisma migration:
```bash
npx prisma migrate dev --name add_time_off_with_indexes
```

## Next Steps

- Monitor format compliance in production logs
- Adjust templates based on user feedback
- Consider adding more specific templates for edge cases
- Track which intents have format validation failures

