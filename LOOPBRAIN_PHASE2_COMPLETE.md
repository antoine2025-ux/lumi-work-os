# Loopbrain Phase 2: Grounding & Citations - Complete ✅

## Summary

Implemented grounding and citations so Loopbrain answers are auditable, reduce hallucinations, and the UI can show sources. All answers must cite ContextObjects using human-readable format: `(source: type:id)`.

## Files Created

1. **`src/lib/loopbrain/citations.ts`**
   - `extractCitations()` - Extracts `(source: type:id)` patterns from text
   - `validateCitations()` - Validates citations against sourcesUsed
   - `replaceInvalidCitations()` - Replaces invalid citations with `(source: unknown)`
   - `formatSourcesFooter()` - Formats sources footer for missing citations

## Files Updated

1. **`src/lib/loopbrain/orchestrator.ts`**
   - `packLoopbrainContext()` now builds `sourcesUsed` array (deduplicated by type:id)
   - All 3 prompt builders (`buildSpacesPrompt`, `buildOrgPrompt`, `buildDashboardPrompt`) updated:
     - Added grounding system rules (high priority)
     - Added "Sources" section before User Question (canonical JSON)
     - Added citation examples in system message
   - Post-processing after LLM call:
     - Extracts citations from answer
     - Validates against sourcesUsed
     - Replaces invalid citations
     - Appends sources footer if missing citations
   - Response includes `sourcesUsed` and `metadata.citations`

2. **`src/lib/loopbrain/orchestrator-types.ts`**
   - Added `SourceUsed` interface
   - Extended `LoopbrainResponse` to include `sourcesUsed: SourceUsed[]`
   - Extended `metadata` to include `citations` with validCount, invalidCount, missing

3. **`src/components/loopbrain/assistant-panel.tsx`**
   - Added collapsible Sources section (hidden by default)
   - Shows sourcesUsed with copyable citations
   - Uses ChevronDown/Up icons for expand/collapse

4. **`scripts/test-loopbrain-smoke.ts`**
   - Added Test 8: Grounding & Citations section

## Implementation Details

### Sources Used List

Built after ranking + packing:
- primaryContext (if present)
- packed ContextObjects from all sections
- retrievedItems (mapped to ContextObjects)
- Deduplicated by (type, id)

### Grounding Rules in Prompts

Added to all 3 prompt builders:
1. Use only the provided sources
2. Cite every factual claim with `(source: type:id)`
3. If no source, say "I don't have that in my context"
4. Do not mention sources that aren't provided
5. Prefer concise answers

### Sources Section in Prompt

Added before User Question:
- "### Sources (canonical, use these as the only facts)"
- JSON array of packed ContextObjects
- Includes: id, type, title, summary, tags, status, updatedAt, relations

### Citation Post-Processing

1. Extract citations from answer (after Slack actions)
2. Validate against sourcesUsed
3. Replace invalid citations with `(source: unknown)`
4. Append sources footer if missing citations
5. Log warnings for invalid citations

### UI Sources Display

- Collapsible section (collapsed by default)
- Shows all sourcesUsed
- Each source has copyable citation: `(source: type:id)`
- Click to copy citation to clipboard

## Verification Steps

1. ✅ **Type Check**: No TypeScript errors
2. ✅ **Lint Check**: No linter errors
3. ⏳ **Manual Test 1**: Ask "What projects exist?"
   - Expected: Answer cites at least one project with `(source: project:id)`
   - Expected: `sourcesUsed.length > 0`
   - Expected: `metadata.citations.missing === false` OR footer contains "Sources used:"
4. ⏳ **Manual Test 2**: Ask something not in context
   - Expected: Loopbrain says "I don't have that in my context" and asks follow-up
5. ⏳ **Manual Test 3**: Expand Sources accordion in UI
   - Expected: Shows real items with copyable `(source: type:id)` citations

## Example Citation Format

**In Answer:**
```
Project Alpha is active. (source: project:abc123)
Task X is blocked. (source: task:xyz789)
```

**In Sources Footer (if missing):**
```
---
**Sources used:**
- Project Alpha (source: project:abc123)
- Task X (source: task:xyz789)
```

## Next Steps

- Phase 3: Fresh Context (exclude stale embeddings, optional inline refresh)

