# Loopbrain Current State Explanation

## 0) Where Loopbrain Lives & How It Works

### 1. Where Loopbrain Lives

**UI Entry Points:**
- `src/components/loopbrain/assistant-panel.tsx` - Main UI component (chat interface)
- `src/components/loopbrain/assistant-launcher.tsx` - Launcher button/trigger
- `src/components/loopbrain/assistant-context.tsx` - React context for state management
- Used in: Dashboard (`src/app/(dashboard)/dashboard-compact/page.tsx`), Wiki pages (`src/app/(dashboard)/wiki/[slug]/page.tsx`)

**API Endpoints:**
- `src/app/api/loopbrain/chat/route.ts` - Main chat endpoint (POST)
- `src/app/api/loopbrain/search/route.ts` - Semantic search endpoint (POST)
- `src/app/api/loopbrain/context/route.ts` - Context retrieval endpoint (GET)

**Core Library Modules:**
- `src/lib/loopbrain/orchestrator.ts` - Main orchestrator (coordinates context, search, LLM)
- `src/lib/loopbrain/context-engine.ts` - Context retrieval from Prisma
- `src/lib/loopbrain/context-types.ts` - Loopbrain-specific context types (WorkspaceContext, ProjectContext, etc.)
- `src/lib/context/context-types.ts` - Unified ContextObject type (shared across modules)
- `src/lib/loopbrain/context-sources/pm/projects.ts` - Project → ContextObject builder
- `src/lib/loopbrain/context-sources/pm/epics.ts` - Epic → ContextObject builder
- `src/lib/loopbrain/context-sources/pm/tasks.ts` - Task → ContextObject builder
- `src/lib/loopbrain/context-sources/slack.ts` - Slack context integration
- `src/lib/loopbrain/embedding-service.ts` - Vector embeddings & semantic search
- `src/lib/loopbrain/store/context-repository.ts` - ContextItem storage (Prisma)
- `src/lib/loopbrain/store/embedding-repository.ts` - ContextEmbedding storage (Prisma)
- `src/lib/loopbrain/store/summary-repository.ts` - ContextSummary storage (Prisma)
- `src/lib/loopbrain/client.ts` - Client-side API wrapper
- `src/lib/loopbrain/slack-helper.ts` - Slack integration helpers

**DB Models (Prisma):**
- `ContextItem` - Stores serialized ContextObject JSON
- `ContextEmbedding` - Vector embeddings for semantic search
- `ContextSummary` - Pre-computed LLM summaries

### 2. How It Builds Context Today

**Flow:**
1. **User Action** → User types query in `assistant-panel.tsx`
2. **Client Call** → `callLoopbrainAssistant()` in `client.ts` sends POST to `/api/loopbrain/chat`
3. **API Route** → `route.ts` validates auth, extracts `workspaceId` from `getUnifiedAuth()`, builds `LoopbrainRequest`
4. **Orchestrator** → `runLoopbrainQuery()` routes to mode-specific handler (`handleSpacesMode`, `handleOrgMode`, `handleDashboardMode`)
5. **Context Loading** → Mode handler calls `loadSpacesContextForRequest()` which:
   - Fetches primary context (project/page/task) via `contextEngine.getProjectContext()` etc.
   - Fetches structured ContextObjects via `getWorkspaceContextObjects()` (projects + tasks)
   - Fetches personal docs via `getPersonalSpaceDocs()`
   - Fetches org people via `getOrgPeopleContext()`
   - Optionally runs semantic search via `searchSimilarContextItems()`
   - Optionally fetches Slack context if `slackChannelHints` provided
6. **Prompt Building** → `buildSpacesPrompt()` assembles prompt with:
   - System instructions
   - Primary context (formatted)
   - Structured ContextObjects (JSON)
   - Epics/Tasks (JSON)
   - Personal docs (JSON)
   - Slack discussions (JSON)
   - Semantic search results
7. **LLM Call** → `callLoopbrainLLM()` calls `generateAIResponse()` from `src/lib/ai/providers.ts`
8. **Slack Actions** → `handleSlackActions()` parses `[SLACK_SEND:...]` and `[SLACK_READ:...]` commands
9. **Response** → Returns `LoopbrainResponse` with answer, context summary, suggestions

**Context Sources:**
- **Primary Context**: Project/Page/Task/Epic from `contextEngine` (Loopbrain-specific types)
- **Structured Context**: Unified `ContextObject[]` from `getWorkspaceContextObjects()` (unified format)
- **Semantic Search**: Vector similarity via `embedding-service.ts` (searches `ContextEmbedding` table)
- **Slack**: Real-time messages from Slack channels (via `slack-helper.ts`)

**Storage:**
- ContextObjects are stored in `ContextItem` table (JSON serialization)
- Embeddings stored in `ContextEmbedding` table (vector data)
- Summaries stored in `ContextSummary` table (cached LLM output)

### 3. Top 3 Likely Failure Points

**1. Data/Context Issues:**
- **Empty ContextObjects**: `getWorkspaceContextObjects()` may return empty arrays if projects/tasks aren't properly converted to ContextObjects
- **Missing Workspace Scoping**: Queries might not filter by `workspaceId` correctly (multi-tenant leak risk)
- **Stale Embeddings**: Embeddings might not be regenerated when entities update
- **Context Store Mismatch**: ContextItem might be out of sync with actual Prisma entities

**2. Auth/Tenant Issues:**
- **WorkspaceId Resolution**: If `getUnifiedAuth()` fails or returns wrong workspace, all queries are scoped incorrectly
- **Missing AssertAccess**: Some context fetchers might not check user permissions
- **Private Project Leakage**: Projects with `visibility: 'private'` might be included in workspace context

**3. Prompting/LLM Issues:**
- **Missing API Key**: `OPENAI_API_KEY` not set → LLM calls fail silently or return empty
- **Model Unavailable**: `gpt-4-turbo` might not be available (rate limits, quota)
- **Prompt Too Long**: Large context might exceed token limits
- **Error Handling**: LLM errors are wrapped multiple times, losing original error details
- **Hallucinations**: LLM might invent projects/tasks not in ContextObjects if prompt doesn't emphasize "use only provided data"

