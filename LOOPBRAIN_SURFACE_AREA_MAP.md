# Loopbrain Surface Area Map

## 1) Repo Discovery Results

### UI Entry Points
- **`src/components/loopbrain/assistant-panel.tsx`** - Main chat UI component (496 lines)
  - Handles user input, displays messages, manages loading states
  - Calls `callLoopbrainAssistant()` from client.ts
  - Supports modes: spaces, org, dashboard
- **`src/components/loopbrain/assistant-launcher.tsx`** - Launcher button/trigger
  - Opens/closes assistant panel
- **`src/components/loopbrain/assistant-context.tsx`** - React context for persistent state
  - Manages messages, open/minimized state across components

**Usage Locations:**
- `src/app/(dashboard)/dashboard-compact/page.tsx` - Dashboard page (mode: "dashboard")
- `src/app/(dashboard)/wiki/[slug]/page.tsx` - Wiki pages (mode: "spaces", anchors: pageId)
- `src/components/wiki/wiki-navigation.tsx` - Wiki nav (mentions LoopBrain)
- `src/components/ui/command-palette.tsx` - Command palette (mentions LoopBrain)

### API Endpoints

**`src/app/api/loopbrain/chat/route.ts`** (202 lines)
- **POST `/api/loopbrain/chat`**
- Main chat endpoint
- Validates auth via `getUnifiedAuth()` + `assertAccess()`
- Extracts `workspaceId` from auth (never from client)
- Builds `LoopbrainRequest` and calls `runLoopbrainQuery()`
- Returns `LoopbrainResponse` with answer, context, suggestions

**`src/app/api/loopbrain/search/route.ts`** (157 lines)
- **POST `/api/loopbrain/search`**
- Semantic search over context items
- Uses embeddings and cosine similarity
- No LLM calls - retrieval only
- Validates auth, scopes by `workspaceId` from auth

**`src/app/api/loopbrain/context/route.ts`** (198 lines)
- **GET `/api/loopbrain/context`**
- Developer-only endpoint to inspect ContextEngine results
- Supports modes: workspace, project, page, task, org, activity, unified
- Optional `includeContextObjects` query param to include unified ContextObjects

### Core Library Modules

**Orchestration:**
- **`src/lib/loopbrain/orchestrator.ts`** (2521 lines) - Main orchestrator
  - `runLoopbrainQuery()` - Entry point
  - `handleSpacesMode()`, `handleOrgMode()`, `handleDashboardMode()` - Mode handlers
  - `loadSpacesContextForRequest()`, `loadOrgContextForRequest()`, `loadDashboardContextForRequest()` - Context loaders
  - `buildSpacesPrompt()`, `buildOrgPrompt()`, `buildDashboardPrompt()` - Prompt builders
  - `callLoopbrainLLM()` - LLM wrapper
  - `handleSlackActions()` - Slack command parser/executor
  - `preprocessSlackRequest()`, `preprocessSlackReadRequest()` - Slack pre-processing

**Context Engine:**
- **`src/lib/loopbrain/context-engine.ts`** (1764 lines) - Prisma-backed context retrieval
  - `PrismaContextEngine` class - Implements `ContextEngine` interface
  - `getWorkspaceContext()`, `getProjectContext()`, `getPageContext()`, `getTaskContext()`, `getOrgContext()`, `getActivityContext()`, `getUnifiedContext()`
  - `getWorkspaceContextObjects()` - Fetches unified ContextObjects for workspace
  - `getPersonalSpaceDocs()` - Fetches user's personal space pages as ContextObjects
  - `getOrgPeopleContext()` - Fetches org people (users with roles) as ContextObjects
  - `getProjectContextObject()`, `getEpicContextObject()` - Get stored ContextObjects
  - `getProjectEpicsContext()`, `getProjectTasksContext()` - Get epics/tasks as ContextObjects
  - `upsertProjectContext()`, `upsertEpicContext()`, `upsertTaskContext()` - Store ContextObjects

**Context Types:**
- **`src/lib/loopbrain/context-types.ts`** (342 lines) - Loopbrain-specific context types
  - `ContextType` enum (workspace, page, project, task, epic, org, activity, unified)
  - `ContextObject` discriminated union (WorkspaceContext, PageContext, ProjectContext, etc.)
  - Supporting types (Breadcrumb, RelatedDoc, EpicSummary, TaskSummary, etc.)

**Unified Context Types:**
- **`src/lib/context/context-types.ts`** (80 lines) - Unified ContextObject type (shared)
  - `ContextObject` interface - Canonical representation (id, type, title, summary, tags, relations, metadata)
  - `ContextObjectType` - All supported types (project, page, task, role, person, meeting, workspace, team)
  - `ContextRelation` - Relations between ContextObjects

**Context Builders:**
- **`src/lib/context/context-builders.ts`** - Converts Prisma models to ContextObjects
  - `projectToContext()`, `taskToContext()`, `pageToContext()`, `roleToContext()`
- **`src/lib/loopbrain/context-sources/pm/projects.ts`** - Project → ContextObject builder
  - `buildProjectContext()` - Builds UnifiedContextObject for projects
- **`src/lib/loopbrain/context-sources/pm/epics.ts`** - Epic → ContextObject builder
  - `buildEpicContext()` - Builds UnifiedContextObject for epics
- **`src/lib/loopbrain/context-sources/pm/tasks.ts`** - Task → ContextObject builder
  - `buildTaskContext()` - Builds UnifiedContextObject for tasks
- **`src/lib/loopbrain/context-sources/slack.ts`** - Slack context integration
  - `getSlackContextForProject()` - Fetches Slack messages for project channels
  - `deriveKeywordsFromUserQuestion()` - Extracts keywords for Slack search

**Embedding & Search:**
- **`src/lib/loopbrain/embedding-service.ts`** - Vector embeddings & semantic search
  - `searchSimilarContextItems()` - Semantic search over ContextEmbedding table
  - `buildEmbeddingTextFromContext()` - Converts ContextObject to embedding text
- **`src/lib/loopbrain/embedding-backfill.ts`** - Backfill helper for embeddings

**Storage:**
- **`src/lib/loopbrain/store/context-repository.ts`** - ContextItem storage (Prisma)
  - `saveContextItem()`, `getContextItem()`, `deserializeContextObject()`
- **`src/lib/loopbrain/store/embedding-repository.ts`** - ContextEmbedding storage (Prisma)
  - Embedding CRUD operations
- **`src/lib/loopbrain/store/summary-repository.ts`** - ContextSummary storage (Prisma)
  - Summary CRUD operations
- **`src/lib/loopbrain/store/index.ts`** - Store exports

**Client:**
- **`src/lib/loopbrain/client.ts`** (194 lines) - Client-side API wrapper
  - `callLoopbrainAssistant()` - Generic assistant call (supports all modes)
  - `callSpacesLoopbrainAssistant()` - Backward compatibility wrapper

**Slack Integration:**
- **`src/lib/loopbrain/slack-helper.ts`** - Slack integration helpers
  - `isSlackAvailable()`, `loopbrainSendSlackMessage()`, `loopbrainReadSlackChannel()`

**Types:**
- **`src/lib/loopbrain/orchestrator-types.ts`** - Orchestrator type definitions
  - `LoopbrainRequest`, `LoopbrainResponse`, `LoopbrainMode`, `LoopbrainContextSummary`, `LoopbrainSuggestion`, `RetrievedItem`

**Index:**
- **`src/lib/loopbrain/index.ts`** - Public exports

### DB Models (Prisma Schema)

**`prisma/schema.prisma`:**

```prisma
model ContextItem {
  id          String   @id @default(cuid())
  contextId   String   // ID of the actual entity (project.id, task.id, etc.)
  type        String   // ContextType enum value
  workspaceId String
  data        Json     // Serialized ContextObject JSON
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  embedding       ContextEmbedding?
  summaryRelation ContextSummary?
  
  @@unique([contextId, type, workspaceId])
  @@index([workspaceId, type])
  @@map("context_items")
}

model ContextEmbedding {
  id           String   @id @default(cuid())
  contextItemId String  @unique
  embedding    Unsupported("vector(1536)") // OpenAI ada-002 embedding
  createdAt    DateTime @default(now())
  
  contextItem  ContextItem @relation(fields: [contextItemId], references: [id], onDelete: Cascade)
  
  @@map("context_embeddings")
}

model ContextSummary {
  id           String   @id @default(cuid())
  contextItemId String  @unique
  summary      String   // Pre-computed LLM summary
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  contextItem  ContextItem @relation(fields: [contextItemId], references: [id], onDelete: Cascade)
  
  @@map("context_summaries")
}
```

### Summary Statistics

- **Total files**: ~20 core Loopbrain files
- **Lines of code**: ~8,000+ lines (orchestrator alone is 2,521 lines)
- **API endpoints**: 3 (chat, search, context)
- **UI components**: 3 (panel, launcher, context)
- **DB models**: 3 (ContextItem, ContextEmbedding, ContextSummary)
- **Context sources**: 4 (projects, epics, tasks, slack)
- **Modes**: 3 (spaces, org, dashboard)

