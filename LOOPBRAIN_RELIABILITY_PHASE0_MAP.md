# Loopbrain Reliability Upgrade - Phase 0: Call Path Map

## Current Call Chain

### UI Layer
1. **`src/components/loopbrain/assistant-panel.tsx`**
   - User types query → `handleSend()`
   - Calls `callLoopbrainAssistant()` from `client.ts`
   - Displays response in markdown

2. **`src/components/loopbrain/assistant-context.tsx`**
   - React context for persistent state (messages, open/minimized)

3. **`src/components/loopbrain/assistant-launcher.tsx`**
   - Launcher button/trigger

### API Layer
4. **`src/app/api/loopbrain/chat/route.ts`**
   - POST `/api/loopbrain/chat`
   - Validates auth via `getUnifiedAuth()` + `assertAccess()`
   - Extracts `workspaceId` from auth (never from client)
   - Builds `LoopbrainRequest` → calls `runLoopbrainQuery()`

5. **`src/app/api/loopbrain/search/route.ts`**
   - POST `/api/loopbrain/search`
   - Semantic search only (no LLM)

6. **`src/app/api/loopbrain/context/route.ts`**
   - GET `/api/loopbrain/context`
   - Developer endpoint for context inspection

### Core Layer
7. **`src/lib/loopbrain/orchestrator.ts`**
   - `runLoopbrainQuery()` - Entry point
   - Routes to mode handlers: `handleSpacesMode()`, `handleOrgMode()`, `handleDashboardMode()`
   - Each mode handler:
     - Loads context via `loadSpacesContextForRequest()` etc.
     - Builds prompt via `buildSpacesPrompt()` etc.
     - Calls LLM via `callLoopbrainLLM()`
     - Handles Slack actions via `handleSlackActions()`

8. **`src/lib/loopbrain/context-engine.ts`**
   - `getWorkspaceContextObjects()` - Fetches projects/tasks as ContextObjects
   - `getPersonalSpaceDocs()` - Fetches personal space pages
   - `getOrgPeopleContext()` - Fetches org people
   - `getProjectContextObject()`, `getEpicContextObject()` - Get stored ContextObjects
   - `upsertProjectContext()`, `upsertEpicContext()`, `upsertTaskContext()` - Store ContextObjects

9. **`src/lib/loopbrain/embedding-service.ts`**
   - `searchSimilarContextItems()` - Semantic search over embeddings
   - `embedContextItem()` - Generate and save embedding
   - `buildEmbeddingTextFromContext()` - Convert ContextObject to text

10. **`src/lib/loopbrain/store/context-repository.ts`**
    - `saveContextItem()` - Upsert ContextItem (updates if exists)
    - `getContextItem()` - Get ContextItem by contextId + type + workspaceId

11. **`src/lib/loopbrain/store/embedding-repository.ts`**
    - `saveEmbedding()` - Upsert embedding (updates if exists)
    - `searchEmbeddings()` - Vector similarity search
    - `deleteEmbedding()` - Delete embedding

## Current State Analysis

### ✅ Prompt Budgets: **PARTIAL**

**Where**: `src/lib/loopbrain/orchestrator.ts`
- **Exists**: `maxTokens: 2000` in `callLoopbrainLLM()` (line 1824)
- **Missing**: 
  - No prompt length budget (prompt can grow unbounded)
  - No token counting before LLM call
  - No truncation logic for large context
  - Context sections added without size checks

**Current Behavior**:
- Prompt built by concatenating sections (JSON dumps, context objects, etc.)
- No limit on number of ContextObjects included
- No limit on JSON size
- Prompt length logged but not enforced

### ❌ Citations: **MISSING**

**Where**: `src/lib/loopbrain/orchestrator.ts` (prompt builders)
- **Missing**: 
  - No citation format in prompts
  - No instruction to cite ContextObject IDs
  - No post-processing to extract/add citations
  - `retrievedItems` have IDs but not used for citations

**Current Behavior**:
- LLM answers without citing sources
- `retrievedItems` returned but not linked to answer
- No way to verify which ContextObjects were used

### ⚠️ Stale Embeddings: **POSSIBLE**

**Where**: `src/lib/loopbrain/store/embedding-repository.ts`, `context-engine.ts`
- **Issue**: 
  - `saveContextItem()` updates ContextItem but doesn't invalidate embedding
  - `upsertProjectContext()` saves ContextItem but doesn't regenerate embedding
  - Embeddings only regenerated via `embedContextItem()` (manual/backfill)
  - No automatic embedding refresh on entity update

**Current Behavior**:
- When project/task/page updated → ContextItem updated
- Embedding NOT updated automatically
- Semantic search may return stale embeddings
- No timestamp comparison (ContextItem.updatedAt vs ContextEmbedding.updatedAt)

**Detection**: 
- No stale detection logic
- `searchEmbeddings()` orders by `updatedAt` but doesn't check if ContextItem is newer

### ⚠️ Errors: **MIXED (thrown vs returned)**

**Where**: Multiple files
- **Thrown**:
  - `orchestrator.ts`: `throw new Error()` for unsupported mode, LLM failures
  - `embedding-service.ts`: `throw new Error()` for missing API key, embedding failures
  - `context-engine.ts`: Errors logged, empty arrays returned (graceful degradation)

- **Returned**:
  - `preprocessSlackRequest()`: Returns `{ sent: false }` on errors (not thrown)
  - `handleSlackActions()`: Replaces commands with error messages (not thrown)
  - Some context loading: Returns empty arrays on error (not thrown)

**Current Behavior**:
- LLM errors: Wrapped and thrown
- Context loading errors: Logged, empty arrays returned
- Slack errors: Logged, error messages in response
- Inconsistent error handling patterns

### ✅ Tenant Safety: **CONFIRMED** (from previous audit)

**Where**: All query functions
- ✅ All Prisma queries filter by `workspaceId`
- ✅ ProjectSpace visibility filtering added in `getWorkspaceContextObjects()`
- ✅ Embedding search filters by `workspaceId`
- ✅ ContextItem queries filter by `workspaceId`

### ✅ Observability: **ENHANCED** (from previous audit)

**Where**: `src/lib/loopbrain/orchestrator.ts`
- ✅ RequestId tracking
- ✅ Timing tracking (contextLoad, llmCall, slackActions, total)
- ✅ Context sources tracking (counts per source)
- ✅ Token usage logging
- ✅ Error details logging

## Gap Summary

| Feature | Status | Location | Impact |
|---------|--------|----------|--------|
| **Prompt Budgets** | ⚠️ Partial | `orchestrator.ts` | Prompt can grow unbounded, may exceed token limits |
| **Citations** | ❌ Missing | `orchestrator.ts` | No way to verify answer sources |
| **Stale Embeddings** | ⚠️ Possible | `embedding-service.ts`, `context-engine.ts` | Semantic search may return outdated results |
| **Error Handling** | ⚠️ Mixed | Multiple files | Inconsistent patterns, some errors swallowed |
| **Tenant Safety** | ✅ Confirmed | All queries | ProjectSpace filtering in place |
| **Observability** | ✅ Enhanced | `orchestrator.ts` | Comprehensive logging added |

## Implementation Plan

### Phase 1: Prompt Budgets
- Add `PROMPT_BUDGET_TOKENS` constant (e.g., 8000 tokens)
- Add `estimatePromptTokens()` helper (rough: chars / 4)
- Add `truncateContextObjects()` helper (priority-based truncation)
- Modify `buildSpacesPrompt()` etc. to enforce budget
- Log when truncation occurs

### Phase 2: Citations
- Add citation format to prompts: `[source:contextId:type]`
- Add instruction: "Cite every factual claim with source ID"
- Add post-processing: Extract citations from LLM response
- Add citation validation: Ensure cited IDs exist in context
- Return citations in `LoopbrainResponse.metadata.citations`

### Phase 3: Fresh Context
- Add `isStaleEmbedding()` helper (compare ContextItem.updatedAt vs ContextEmbedding.updatedAt)
- Add `refreshStaleEmbeddings()` helper (regenerate if stale)
- Call refresh in `searchSimilarContextItems()` before search
- Add background job option (async refresh)
- Log stale detection

### Phase 4: Error Handling
- Standardize on thrown errors (not returned)
- Create `LoopbrainError` class with error codes
- Map error codes to user-safe messages
- Preserve original error in logs
- Add retry logic for transient errors

### Phase 5: Final Polish
- Add integration tests for each feature
- Update documentation
- Performance testing (prompt budgets, stale refresh)

## File Paths Summary

**UI**: 
- `src/components/loopbrain/assistant-panel.tsx`
- `src/components/loopbrain/assistant-context.tsx`
- `src/components/loopbrain/assistant-launcher.tsx`

**API**: 
- `src/app/api/loopbrain/chat/route.ts`
- `src/app/api/loopbrain/search/route.ts`
- `src/app/api/loopbrain/context/route.ts`

**Core**: 
- `src/lib/loopbrain/orchestrator.ts`
- `src/lib/loopbrain/context-engine.ts`
- `src/lib/loopbrain/embedding-service.ts`
- `src/lib/loopbrain/store/context-repository.ts`
- `src/lib/loopbrain/store/embedding-repository.ts`
- `src/lib/loopbrain/client.ts`

