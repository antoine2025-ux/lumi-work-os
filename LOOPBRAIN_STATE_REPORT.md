# Loopbrain Current State Report

## Executive Summary

Loopbrain is a Virtual COO assistant that provides AI-powered answers about workspace data (projects, tasks, pages, org structure). The system is **mostly functional** but has **critical security gaps** and **reliability issues** that need immediate attention.

**Status**: ⚠️ **NEEDS FIXES** - Core functionality works, but multi-tenant safety and error handling need improvement.

## What's Wired

✅ **UI Components**: Assistant panel, launcher, context management all functional
✅ **API Endpoints**: `/api/loopbrain/chat`, `/api/loopbrain/search`, `/api/loopbrain/context` all operational
✅ **Context Engine**: Retrieves workspace, project, page, task, org context correctly
✅ **Semantic Search**: Vector embeddings and similarity search working
✅ **LLM Integration**: OpenAI API integration functional (when API key configured)
✅ **Slack Integration**: Can send/read Slack messages when configured
✅ **Multi-Tenant Scoping**: All queries filter by `workspaceId` from auth

## What's Broken

### 🔴 CRITICAL: ProjectSpace Visibility Not Checked

**Issue**: `getWorkspaceContextObjects()` returns ALL projects in workspace, ignoring ProjectSpace visibility rules.

**Impact**: Users can see projects in TARGETED spaces they're not members of.

**Location**: `src/lib/loopbrain/context-engine.ts:1519-1607`

**Fix Required**: Add ProjectSpace visibility filtering (same logic as `/api/projects` route)

### 🟡 HIGH: Missing Epic Type in ContextObjectType

**Issue**: Epics use `'epic'` as type, but it's not in the `ContextObjectType` union.

**Impact**: Type errors, requires type assertions, inconsistent with other types.

**Location**: `src/lib/context/context-types.ts`

**Fix Required**: Add `'epic'` to `ContextObjectType` union

### 🟡 HIGH: Error Handling Loses Context

**Issue**: Errors are wrapped multiple times, losing original error messages.

**Impact**: Users see generic "AI service temporarily unavailable" instead of actionable errors (missing API key, rate limit, etc.).

**Location**: `src/lib/loopbrain/orchestrator.ts`, `src/app/api/loopbrain/chat/route.ts`, `src/lib/ai/providers.ts`

**Fix Required**: Preserve original error messages, add specific error types

### 🟡 MEDIUM: Missing API Key Returns Non-Error

**Issue**: When `OPENAI_API_KEY` is missing, provider returns non-error response instead of throwing.

**Impact**: Confusing behavior - LLM returns "AI features are disabled" message as if it's a normal response.

**Location**: `src/lib/ai/providers.ts:74-78`

**Fix Required**: Throw error instead of returning non-error response

### 🟡 MEDIUM: Inconsistent Status Normalization

**Issue**: Different context sources normalize status differently (projects normalize, epics don't).

**Impact**: Harder to filter/query by status consistently.

**Location**: Multiple context builders

**Fix Required**: Create shared status normalization utility

## Why It's Not Performing Reliably

1. **Empty Answers**: Context might be empty if projects aren't properly filtered (ProjectSpace issue)
2. **Wrong Context**: LLM might reference projects user shouldn't see (ProjectSpace leak)
3. **Slow Performance**: Large context, slow DB queries, embedding generation
4. **Errors**: Generic error messages hide root cause (missing API key, rate limits, etc.)
5. **Hallucinations**: LLM might invent data if prompt doesn't emphasize "use only provided data"

## Fixes Applied (This Audit)

### ✅ Instrumentation Added

**File**: `src/lib/loopbrain/orchestrator.ts`

**Changes**:
- Enhanced logging with requestId, redacted workspaceId/userId
- Added timing tracking (contextLoad, llmCall, slackActions, total)
- Added context sources tracking (which sources were included)
- Added token/latency logging
- Added error details (errorMessage, errorType)

**Impact**: Better observability for debugging production issues

## Next 3 Improvements (Priority Order)

### 1. Fix ProjectSpace Visibility Filtering (CRITICAL)

**File**: `src/lib/loopbrain/context-engine.ts:1519-1607`

**Change**: Add ProjectSpace visibility filtering to `getWorkspaceContextObjects()`

**Impact**: Prevents private project leakage, ensures multi-tenant safety

**Estimated Time**: 30 minutes

### 2. Improve Error Handling (HIGH)

**Files**: 
- `src/lib/ai/providers.ts` - Throw error when API key missing
- `src/lib/loopbrain/orchestrator.ts` - Preserve original error messages
- `src/app/api/loopbrain/chat/route.ts` - Return specific error types

**Impact**: Users see actionable error messages instead of generic failures

**Estimated Time**: 1 hour

### 3. Add Epic Type to ContextObjectType (HIGH)

**File**: `src/lib/context/context-types.ts`

**Change**: Add `'epic'` to `ContextObjectType` union

**Impact**: Fixes type errors, improves type safety

**Estimated Time**: 5 minutes

## Manual Verification Steps

### 1. Test Basic Query

1. Open workspace with at least 1 project
2. Open Loopbrain assistant (click AI button)
3. Type: "What projects am I working on?"
4. **Expected**: Lists actual projects by name, status, owner
5. **Check**: Projects listed match what you see in Projects page

### 2. Test Multi-Tenant Isolation

1. Create two workspaces (A and B) with different projects
2. In workspace A, ask: "What projects exist?"
3. **Expected**: Only shows projects from workspace A
4. **Check**: No projects from workspace B appear

### 3. Test Private Project Access

1. Create a TARGETED ProjectSpace with a project
2. Add user A as member, but NOT user B
3. As user B, ask: "What projects exist?"
4. **Expected**: Project in TARGETED space should NOT appear
5. **Check**: Only PUBLIC projects or projects user B is member of appear

### 4. Test Error Handling

1. Temporarily remove `OPENAI_API_KEY` from `.env`
2. Ask a question in Loopbrain
3. **Expected**: Clear error message about missing API key
4. **Check**: Error message is actionable, not generic "temporarily unavailable"

### 5. Test Context Sources

1. Ask: "What documents are in my personal space?"
2. **Expected**: Lists personal space pages
3. **Check**: Server logs show `contextSources.personalDocsCount > 0`

### 6. Test Semantic Search

1. Ask a question about a specific project
2. **Expected**: Answer references the project
3. **Check**: Server logs show `retrievedItemsCount > 0` if semantic search found relevant items

## Files Modified

- `src/lib/loopbrain/orchestrator.ts` - Enhanced instrumentation

## Files That Need Fixes

- `src/lib/loopbrain/context-engine.ts` - Add ProjectSpace visibility filtering
- `src/lib/context/context-types.ts` - Add 'epic' to ContextObjectType
- `src/lib/ai/providers.ts` - Fix missing API key handling
- `src/lib/loopbrain/orchestrator.ts` - Improve error handling
- `src/app/api/loopbrain/chat/route.ts` - Return specific error types

