# Loopbrain Phase 1: Prompt Budgets - Complete ✅

## Summary

Implemented deterministic prompt budgets using item counts and character limits. Prompts are now bounded and predictable as workspace grows.

## Files Created

1. **`src/lib/loopbrain/prompt-budgets.ts`**
   - Budget configuration with item counts and char limits
   - `PROMPT_BUDGET` constant with all limits
   - `PRIMARY_CONTEXT_BUDGET` for primary context content

2. **`src/lib/loopbrain/context-pack.ts`**
   - `estimateChars()` - JSON string length estimation
   - `compactContextObject()` - Shortens summary, trims metadata
   - `packContextSection()` - Caps by item count and char limits
   - `compactPrimaryContext()` - Limits primary content to 4000 chars

## Files Updated

1. **`src/lib/loopbrain/orchestrator.ts`**
   - Added `packLoopbrainContext()` function
   - Applied packing before prompt building in all 3 modes (spaces, org, dashboard)
   - Added packing stats to response metadata
   - Enhanced `formatContextObject()` to respect content limits
   - Logs packing results with requestId

2. **`src/lib/loopbrain/orchestrator-types.ts`**
   - Extended `LoopbrainResponse.metadata` to include `context` field
   - Contains `sent`, `dropped`, and `totalChars` for debugging

3. **`scripts/test-loopbrain-smoke.ts`**
   - Added Test 6: Prompt Budgets section
   - Documents manual testing steps

## Budget Configuration

```typescript
PROMPT_BUDGET = {
  maxContextObjects: 12,
  maxRetrievedItems: 6,
  maxOrgPeople: 20,
  maxPersonalDocs: 5,
  maxSlackMessages: 10,
  maxCharsPerObject: 900,
  maxTotalChars: 18000,
  maxModelTokens: 2000,
}
```

## Implementation Details

### Packing Logic

1. **Item Count Limits**: Each section capped by maxItems (e.g., 12 ContextObjects)
2. **Per-Item Char Limits**: Each item compacted to maxCharsPerObject (900 chars)
3. **Total Char Budget**: Stops adding items once maxTotalChars (18000) is exceeded
4. **Primary Context**: Wiki page content limited to 4000 chars

### Packing Order

1. structuredContext (projects + tasks)
2. retrievedItems (semantic search results)
3. personalDocs
4. orgPeople (org mode only)
5. projectEpics
6. projectTasks
7. slackContext messages
8. primaryContext (compacted if needed)

### Logging

Packing stats logged with requestId:
```typescript
{
  contextPack: {
    sent: { contextObjects: 12, retrievedItems: 6, ... },
    dropped: { contextObjects: 3, retrievedItems: 2, ... },
    totalChars: 15234
  }
}
```

## Verification Steps

1. ✅ **Type Check**: No TypeScript errors
2. ✅ **Lint Check**: No linter errors
3. ⏳ **Manual Test**: Ask "What projects exist?" in UI
4. ⏳ **Log Check**: Verify `contextPack` appears in server logs
5. ⏳ **Budget Test**: Test with workspace having >12 projects, verify capping

## Next Steps

- Phase 1.5: Ranking (deterministic) so top 12 are the right 12
- Phase 2: Citations (human-readable format: `(source: type:id)`)
- Phase 3: Fresh Context (exclude stale embeddings, optional inline refresh)

