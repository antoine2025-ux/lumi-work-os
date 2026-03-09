# Loopbrain Drive Tools Diagnostic Report

## 1. Tool Registration Status

### tool-registry.ts (orchestrator path)
- ✅ **Drive tools imported** — Lines 20-23: `searchDriveFilesTool`, `readDriveDocumentTool`, `createDriveDocumentTool`, `updateDriveDocumentTool`
- ✅ **Drive tools in ALL_TOOLS array** — Lines 1092-1095
- **Total tool count**: 25 (21 original + 4 Drive)
- **Note**: Uses `ALL_TOOLS`, not `TOOL_DEFINITIONS` (naming differs from task spec)

### tool-schemas.ts (agent loop path — DEFAULT)
- ❌ **Drive tools NOT in READ_TOOLS** — `searchDriveFiles` and `readDriveDocument` are missing
- ❌ **Drive tools NOT in WRITE_TOOLS** — `createDriveDocument` and `updateDriveDocument` are missing
- **Impact**: The agent loop uses `getToolDefinitionsForRole()` from tool-schemas. The LLM receives a tool list that does NOT include any Drive tools.

---

## 2. Intent Detection Logic

**Location**: `src/lib/loopbrain/intent-router.ts` — `detectIntentFromKeywords()` (lines 204-375)

- ✅ **drive_search intent exists** — Line 39 (type), lines 235-249 (detection)
- ✅ **Keywords include "drive", "search drive", "meeting notes"**:
  - `'search in drive'`, `'search drive'`, `'search my drive'`, `'search google drive'`
  - `'find in drive'`, `'meeting notes in drive'`, `'meeting notes from drive'`, `'drive meeting notes'`
  - `'last meeting notes'`, `'recent meeting notes'`, `'gemini meeting notes'`
  - Fallback: `(queryLower.includes('drive') && (queryLower.includes('search') || queryLower.includes('find') || queryLower.includes('meeting')))`

**Orchestrator intercept** (`src/lib/loopbrain/orchestrator.ts` lines 282-286):
```typescript
if (intent === 'drive_search') {
  return await handleActionMode(req, 'ACTION')
}
```

---

## 3. Message Flow Trace

**Critical finding: The chat route uses two different code paths.**

### Default path (LOOPBRAIN_LEGACY !== 'true')
```
POST /api/loopbrain/chat
  → runAgentLoop() [agent-loop.ts]
  → getToolDefinitionsForRole(userRole) [tool-schemas.ts]
  → Tools passed to LLM: searchEmail, getCalendarEvents, searchWiki, ..., listTasksByAssignee
  → NO Drive tools in this list
```

- **Intent detection**: The agent loop does NOT use `classifyQueryIntent` or `detectIntentFromKeywords`. It sends the raw message to the LLM with a fixed tool list.
- **Handler**: `runAgentLoop` — no intent-based routing
- **Tools passed to LLM**: From `getToolDefinitionsForRole()` → tool-schemas ALL_TOOLS → **excludes Drive**

### Legacy path (LOOPBRAIN_LEGACY === 'true')
```
POST /api/loopbrain/chat
  → runLoopbrainQuery() [orchestrator.ts]
  → classifyQueryIntent()
  → if intent === 'drive_search' → handleActionMode (planner + tool-registry)
  → Tools: toolRegistry.toPromptSpec() includes searchDriveFiles, readDriveDocument
```

- **Intent for "search drive for meeting notes"**: `drive_search`
- **Handler**: `handleActionMode` → planner → executor with tool-registry (includes Drive tools)

**Root cause**: The default path (agent loop) never runs the orchestrator's intent detection. It uses a separate tool list (tool-schemas) that does not include Drive tools. The drive_search intercept in the orchestrator is never reached when using the agent loop.

---

## 4. Tool Filtering

- ❌ **Drive tools effectively "filtered out"** — They are absent from tool-schemas.ts, so `getToolDefinitionsForRole()` never returns them. The agent loop has no logic that explicitly filters by intent; the Drive tools simply are not in the source list.
- ✅ **No QUESTION intent filtering** — The agent loop does not filter tools by message intent. The tool list is fixed per role.
- ❌ **Drive tools not included for drive_search** — The agent loop does not have a drive_search concept; it uses a static tool list for all queries.

---

## 5. Integration Status Check

- **No pre-filtering by Drive connection** — Tools are not removed when Drive is disconnected. If Drive tools were present, execution would fail with "Google Drive not connected" at runtime (from `getDriveClientForUser`).
- `/api/integrations/drive/status` is independent; it is not consulted before building the tool list.

---

## 6. Root Cause Analysis

| Checkbox | Finding |
|----------|---------|
| ☐ | Tools not registered — **tool-registry has them** ✅ |
| ☑ | **Intent not routed correctly** — Agent loop (default path) does not use intent detection; orchestrator's drive_search intercept is bypassed |
| ☑ | **Wrong code path** — Default uses agent loop, not orchestrator. Agent loop uses tool-schemas, not tool-registry |
| ☑ | **Tools filtered out before LLM** — Drive tools are missing from tool-schemas.ts, so the LLM never sees searchDriveFiles/readDriveDocument |
| ☐ | Integration status check failing — N/A |
| ☐ | Other — |

**Summary**: The chat endpoint defaults to `runAgentLoop`, which gets its tools from `tool-schemas.ts`. Drive tools exist only in `tool-registry.ts`. The agent loop never receives Drive tools, so the LLM uses searchEmail (Gmail) when the user asks about meeting notes.

---

## 7. Recommended Fix

### Fix A: Add Drive tools to tool-schemas.ts (required for agent loop)

**File**: `src/lib/loopbrain/tool-schemas.ts`

Add to `READ_TOOLS` array (after `searchSlackMessages`, before `listTasksByAssignee`):

```typescript
{
  name: 'searchDriveFiles',
  description:
    'Search Google Drive for files by name or content. Use when the user asks to search Drive, find meeting notes, docs, or files in Google Drive. Returns file IDs, names, links, types, and modification dates.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query (e.g., "meeting notes gemini" or "budget Q4")' },
      mimeType: { type: 'string', description: 'Filter by MIME type (optional)' },
      folderId: { type: 'string', description: 'Search within folder (optional)' },
      maxResults: { type: 'number', description: 'Max results 1-50 (default 10)' },
    },
    required: ['query'],
  },
  category: 'read',
  requiredRole: 'MEMBER',
},
{
  name: 'readDriveDocument',
  description:
    'Read the text content of a Google Drive file (Docs, Sheets, meeting notes). Use after searchDriveFiles when you have a file ID.',
  parameters: {
    type: 'object',
    properties: {
      fileId: { type: 'string', description: 'Google Drive file ID from searchDriveFiles' },
      format: { type: 'string', enum: ['text', 'markdown'], description: 'Output format (default text)' },
    },
    required: ['fileId'],
  },
  category: 'read',
  requiredRole: 'MEMBER',
},
```

### Fix B: Add executeReadTool cases in agent-loop.ts

**File**: `src/lib/loopbrain/agent-loop.ts`

Add before the `default` case in `executeReadTool`:

```typescript
case 'searchDriveFiles': {
  try {
    const tool = toolRegistry.get('searchDriveFiles')
    if (!tool) return { error: 'searchDriveFiles tool not found' }
    const ctx = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' as const }
    const result = await tool.execute(toolCall.arguments, ctx)
    return result.success
      ? result.data ?? { message: result.humanReadable }
      : { error: result.error ?? result.humanReadable }
  } catch (err) {
    return { error: String(err) }
  }
}

case 'readDriveDocument': {
  try {
    const tool = toolRegistry.get('readDriveDocument')
    if (!tool) return { error: 'readDriveDocument tool not found' }
    const ctx = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' as const }
    const result = await tool.execute(toolCall.arguments, ctx)
    return result.success
      ? result.data ?? { message: result.humanReadable }
      : { error: result.error ?? result.humanReadable }
  } catch (err) {
    return { error: String(err) }
  }
}
```

### Optional: Enhance system prompt for Drive awareness

**File**: `src/lib/loopbrain/agent-loop.ts` — `buildSystemPrompt()`

Add a line to the IMPORTANT RULES section:
```
- When the user asks to search Drive, find meeting notes, or read a Drive document, use searchDriveFiles then readDriveDocument. You have full access to their Google Drive.
```

---

## Verification

After applying Fix A and Fix B:

1. Restart dev server
2. Ensure Drive is connected (Settings → Integrations → Google Drive)
3. Ask: "search drive for meeting notes"
4. The LLM should call `searchDriveFiles` with query "meeting notes", then optionally `readDriveDocument` on the first result
