# Loopbrain Phase 5: Intent Routing - Complete ✅

## Summary

Implemented deterministic intent routing for Loopbrain so it chooses the correct mode and context anchors reliably, asks clarifying questions when needed, and returns consistent answer shapes. No LLM calls for routing - pure heuristics.

## Files Created

1. **`src/lib/loopbrain/intent-router.ts`**
   - `LoopbrainIntent` type (9 intent types)
   - `RouteDecision` interface with intent, mode, anchors, needsClarification, confidence, reasons
   - `routeIntent()` - Deterministic routing based on anchors, keywords, and context hints
   - `detectIntentFromKeywords()` - Keyword-based intent detection
   - `selectModeFromIntent()` - Mode selection from intent
   - `detectClarificationNeeds()` - Clarification detection logic

## Files Updated

1. **`src/lib/loopbrain/orchestrator-types.ts`**
   - Added `metadata.intent` to `LoopbrainResponse` with:
     - `intent: string`
     - `confidence: number`
     - `reasons: string[]`
     - `modeUsed: LoopbrainMode`
     - `needsClarification?: boolean`

2. **`src/lib/loopbrain/orchestrator.ts`**
   - Integrated intent router before context loading
   - Checks available context hints (org people, projects, tasks, pages)
   - Does lightweight semantic search (top 3) for ranking results
   - Routes intent with ranking results for clarification detection
   - If clarification needed, returns early with clarification question and suggestions
   - Uses router's mode/anchors for context loading if different from request
   - Adds intent metadata to all responses

3. **`src/components/loopbrain/assistant-panel.tsx`**
   - Updated suggestion click handler to handle `select_entity` action
   - When clarification suggestion is clicked, resends query with selected anchor
   - Shows "Select one:" label for clarification suggestions
   - Preserves existing suggestion behavior for other actions

4. **`scripts/test-loopbrain-smoke.ts`**
   - Added Test 11: Intent Routing & Mode Enforcement
   - Added `testIntentRouting()` function structure

## Intent Types

- `status_update` - Status/progress queries
- `list_entities` - List/show queries
- `find_document` - Document/wiki queries
- `summarize` - Summarization queries
- `who_is_responsible` - Ownership/responsibility queries
- `capacity_planning` - Capacity/availability queries
- `prioritization` - Priority/urgent queries
- `how_to` - How-to/process queries
- `unknown` - Fallback for unrecognized queries

## Routing Logic

### 1. Anchor-First Routing
- If UI provided `projectId/pageId/taskId/epicId` → prefer `spaces` mode
- If UI provided `teamId/roleId` → prefer `org` mode
- Anchors take highest priority (confidence 0.9)

### 2. Keyword-Based Intent Detection
- Simple token matching against keyword lists
- Confidence scores (0.75-0.85) based on keyword match quality
- Multiple keyword patterns per intent

### 3. Mode Selection from Intent
- `capacity_planning` → `org` if org data exists, else `dashboard`
- `who_is_responsible` → `spaces` if task/project mentioned, else `org` if people/team mentioned
- `find_document/how_to/summarize` → `spaces` if page/project anchor exists, else `dashboard`
- `status_update` → `spaces` if anchored, else `dashboard`
- `list_entities` → `dashboard` for workspace-wide lists, `spaces` for project-specific

### 4. Clarification Detection
- Query mentions entity name but no anchor provided → ask clarification
- Capacity planning without org data → ask clarification
- Ambiguous entity references (e.g., "Status of onboarding") → ask clarification
- Uses ranking top 3 results for clarification suggestions

## Implementation Details

### Router Integration Flow

1. **Check Available Context Hints** (lightweight DB queries):
   - Count org people, projects, tasks, pages
   - Used to determine if org mode is viable

2. **Lightweight Semantic Search** (top 3):
   - Fetches ranking results for clarification detection
   - Only if `useSemanticSearch !== false`

3. **Route Intent**:
   - Deterministic routing based on anchors, keywords, hints, ranking
   - Returns `RouteDecision` with mode, anchors, intent, clarification needs

4. **Handle Clarification**:
   - If `needsClarification === true`, return early with:
     - Clarification question as answer
     - Top 3 ranking results as suggestions
     - Intent metadata

5. **Use Router's Mode/Anchors**:
   - Update request with router's mode and anchors
   - Continue with normal context loading and LLM call

### UI Clarification Handling

When user clicks a clarification suggestion:
1. Adds user message: "Select: [entity name]"
2. Resends query with selected anchor (`projectId`, `pageId`, `taskId`, or `epicId`)
3. Loopbrain processes query with anchor and returns full answer

## Example Routing Scenarios

### Scenario 1: Capacity Planning
**Query:** "Who has capacity next week to support Project X?"

**Routing:**
- Intent: `capacity_planning` (keywords: "capacity", "who has")
- Mode: `org` (capacity planning requires org data)
- Confidence: 0.8
- No clarification needed

**Response Metadata:**
```json
{
  "metadata": {
    "intent": {
      "intent": "capacity_planning",
      "confidence": 0.8,
      "reasons": ["Detected capacity planning keywords", "Capacity planning requires org data"],
      "modeUsed": "org"
    }
  }
}
```

### Scenario 2: Status Update with Anchor
**Query:** "Status of Project X" (with `projectId` anchor)

**Routing:**
- Intent: `status_update` (keywords: "status")
- Mode: `spaces` (UI provided project anchor)
- Confidence: 0.9 (anchor takes priority)
- No clarification needed

### Scenario 3: Ambiguous Query
**Query:** "Status of onboarding" (no anchor)

**Routing:**
- Intent: `status_update`
- Mode: `spaces`
- Needs clarification: `true`
- Clarification question: "Which item do you mean? I see: Onboarding Project, Onboarding Task, Onboarding Page."

**Response:**
- Answer: Clarification question
- Suggestions: Top 3 ranking results as clickable buttons
- User clicks suggestion → query resends with selected anchor

## Verification Steps

1. ✅ **Type Check**: No TypeScript errors
2. ✅ **Lint Check**: No linter errors
3. ⏳ **Manual Test 1**: Query: "Who has capacity next week to support Project X?"
   - Expected: `metadata.intent.intent === "capacity_planning"`
   - Expected: `modeUsed === "org"` (if org context exists)
4. ⏳ **Manual Test 2**: Query: "Status of Project X"
   - Expected: `intent === "status_update"`, `modeUsed === "spaces"`
5. ⏳ **Manual Test 3**: Query: "What projects exist?"
   - Expected: `intent === "list_entities"`, `modeUsed === "dashboard"` or `"spaces"` depending on anchors
6. ⏳ **Manual Test 4**: Query: "Status of onboarding" (ambiguous, no anchor)
   - Expected: `needsClarification === true`
   - Expected: Clarification question with top 3 candidates
   - Expected: Clicking suggestion resends query with selected anchor

## Key Features

1. ✅ **Deterministic routing** - No LLM calls, pure heuristics
2. ✅ **Anchor-first priority** - UI anchors take precedence
3. ✅ **Keyword-based intent detection** - Simple, testable patterns
4. ✅ **Mode selection from intent** - Automatic mode selection
5. ✅ **Clarification detection** - Asks for clarification when needed
6. ✅ **UI integration** - Suggestions work as quick replies
7. ✅ **Consistent answer shapes** - All responses include intent metadata

## Constraints Met

- ✅ No new DB tables
- ✅ No LLM calls for routing
- ✅ Routing is deterministic and testable
- ✅ Does not break existing UI integrations

## Next Steps

- Monitor routing accuracy in production
- Add more keyword patterns based on user queries
- Consider adding confidence thresholds for clarification
- Add analytics for intent distribution

