# Loopbrain Phase 1.5: Deterministic Ranking - Complete ✅

## Summary

Implemented deterministic ranking of ContextObjects before packing, ensuring the "top N" are the most relevant items based on query, anchors, recency, and type boosts.

## Files Created

1. **`src/lib/loopbrain/context-ranker.ts`**
   - `tokenize()` - Query tokenization (lowercase, remove stopwords, min 3 chars)
   - `scoreContextObject()` - Scoring function with rules:
     - Anchor match: +100
     - Title token overlap: +8 per token
     - Tags overlap: +4 per token
     - Summary overlap: +2 per token
     - Recency: +0..15 (newer = higher)
     - Type boost: +2..10 (mode-dependent)
     - Semantic score: +0..30 (if provided)
   - `rankContextObjects()` - Main ranking function (de-duplicates, scores, sorts)

## Files Updated

1. **`src/lib/loopbrain/orchestrator.ts`**
   - Updated `packLoopbrainContext()` to rank before packing
   - Ranks structuredContext, personalDocs, orgPeople, projectEpics, projectTasks
   - Builds combined top 8 ranking for metadata
   - Logs ranking results with requestId
   - All 3 mode handlers pass query and anchors to packer

2. **`src/lib/loopbrain/orchestrator-types.ts`**
   - Extended `LoopbrainResponse.metadata.context` to include `ranking.top` (top 8 items)

3. **`scripts/test-loopbrain-smoke.ts`**
   - Added Test 7: Deterministic Ranking section
   - Documents manual testing steps for ranking verification

## Ranking Rules

### Scoring Weights
- **Anchor match**: +100 (highest priority - exact ID match)
- **Title tokens**: +8 per overlapping token
- **Tags tokens**: +4 per overlapping token
- **Summary tokens**: +2 per overlapping token
- **Recency**: +0..15 (scaled by days since updatedAt)
- **Type boost**: +2..10 (mode-dependent)
  - Spaces mode: project/task/page/epic +10, person/role/team +2
  - Org mode: person/role/team +10, project/task/page +2
  - Dashboard mode: project/task +6, page +4, person/role/team +4
- **Semantic score**: +0..30 (if provided from retrieval)

### Ranking Flow
1. De-duplicate by (type, id)
2. Score each item using all rules
3. Sort by score descending
4. Pack top N items (respecting budgets)

## Integration Points

### Before Packing
- `packLoopbrainContext()` now ranks each section before packing
- Ranking uses query tokens, anchors, and semantic scores
- Combined ranking built across all sections for top 8

### Logging
- `contextRank` logged with top 8 items (type, id, score, reasons)
- Logged at debug level with requestId

### Metadata
- `metadata.context.ranking.top` includes top 8 ranked items
- Each item has: type, id, score, reasons array
- Not shown in UI yet (debugging only)

## Verification Steps

1. ✅ **Type Check**: No TypeScript errors
2. ✅ **Lint Check**: No linter errors
3. ⏳ **Manual Test 1**: Ask "Status of Project X?" where X is a known project
   - Expected: Project X appears in `metadata.context.ranking.top[0]` with high score
   - Expected: Reasons include 'anchor' or 'keyword'
4. ⏳ **Manual Test 2**: Ask "Show my overdue tasks"
   - Expected: Tasks appear in `metadata.context.ranking.top` with keyword/recency reasons
5. ⏳ **Log Check**: Verify `contextRank` appears in server logs
   - Expected: Shows top 8 items with scores and reasons

## Example Ranking Output

```json
{
  "metadata": {
    "context": {
      "ranking": {
        "top": [
          {
            "type": "project",
            "id": "proj_123",
            "score": 125,
            "reasons": ["anchor", "keyword", "recency", "typeBoost"]
          },
          {
            "type": "task",
            "id": "task_456",
            "score": 42,
            "reasons": ["keyword", "recency", "typeBoost"]
          }
        ]
      }
    }
  }
}
```

## Next Steps

- Phase 2: Citations (human-readable format: `(source: type:id)`)
- Phase 3: Fresh Context (exclude stale embeddings, optional inline refresh)

