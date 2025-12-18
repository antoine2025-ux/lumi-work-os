# Loopbrain Intended Contract Specification

## 2) What "Working" Means

### User Action Triggers

**Primary Triggers:**
1. **User opens assistant panel** → `LoopbrainAssistantPanel` component mounts
2. **User types query and submits** → `callLoopbrainAssistant()` called with:
   - `mode`: "spaces" | "org" | "dashboard"
   - `query`: User's question (string, required)
   - `pageId`, `projectId`, `taskId`, `epicId`, `roleId`, `teamId`: Context anchors (optional)
   - `useSemanticSearch`: boolean (default: true)
   - `maxContextItems`: number (default: 10)

**Mode Selection:**
- **Spaces mode**: Triggered when `projectId`, `pageId`, `taskId`, or `epicId` is present
- **Org mode**: Triggered when `roleId` or `teamId` is present, or explicitly set
- **Dashboard mode**: Default for workspace-level queries

### Required Data (What Must Be Included)

**Workspace Context:**
- Workspace ID (from auth, never from client)
- Workspace name, description, member/project/page counts

**Project Context (Spaces mode):**
- Active projects (not archived) as `ContextObject[]`
- Project details: name, status, priority, owner, department, team
- Project epics (if `projectId` provided)
- Project tasks (if `projectId` provided, or for workspace-wide queries)
- Project documentation (attached wiki pages with full content)

**Task Context:**
- Task details: title, status, priority, due date, assignee
- Task relations: project, epic, dependencies
- Blocked/at-risk analysis based on task status and tags

**Page Context (Wiki):**
- Page title, content (full HTML/text), excerpt
- Category, tags, breadcrumbs
- Related docs, view count, author

**Org Context (Org mode):**
- Teams, roles, departments
- People with their roles/positions as `ContextObject[]`
- Org hierarchy

**Personal Space Docs:**
- User's personal space pages as `ContextObject[]`
- Title, category, last updated, slug

**Slack Context (Optional, Tier B):**
- Real-time messages from project Slack channels
- Only fetched if `slackChannelHints` provided AND question suggests Slack relevance
- Includes channel name, message count, relevance score, summary

**Semantic Search Results:**
- Vector similarity search over `ContextEmbedding` table
- Returns top N most relevant context items with similarity scores
- Filtered by `workspaceId` and optionally by `type`

### Expected Output Format

**Response Structure (`LoopbrainResponse`):**
```typescript
{
  mode: "spaces" | "org" | "dashboard",
  workspaceId: string,  // From auth
  userId: string,        // From auth
  query: string,         // User's original query
  context: {
    primaryContext?: ContextObject,      // Main entity (project/page/task)
    relatedContext?: ContextObject[],    // Related entities
    retrievedItems?: RetrievedItem[],     // Semantic search results
    structuredContext?: UnifiedContextObject[],  // Projects + tasks
    personalDocs?: UnifiedContextObject[],        // Personal space pages
    orgPeople?: UnifiedContextObject[],           // People with roles
    projectEpics?: UnifiedContextObject[],        // Project epics
    projectTasks?: UnifiedContextObject[],        // Project tasks
    slackContext?: SlackChannelContext[]          // Slack messages
  },
  answer: string,        // LLM-generated markdown answer
  suggestions: LoopbrainSuggestion[],  // Action suggestions
  metadata: {
    model: string,        // LLM model used (e.g., "gpt-4-turbo")
    tokens?: {
      promptTokens?: number,
      completionTokens?: number,
      totalTokens?: number
    },
    retrievedCount?: number  // Number of context items retrieved
  }
}
```

**UI Display:**
- Answer rendered as markdown (ReactMarkdown with remarkGfm)
- Suggestions displayed as clickable buttons
- Related items shown in "Related items" section
- Loading indicator during request
- Error message on failure (user-friendly)

### Current Failure Modes

**1. Empty Answers:**
- **Symptom**: LLM returns empty string or generic "I don't know"
- **Causes**:
  - Missing context (no projects/tasks in workspace)
  - Context not properly loaded (database query fails silently)
  - Prompt too long (exceeds token limits)
  - LLM hallucination (invents data not in ContextObjects)

**2. Wrong Context:**
- **Symptom**: LLM references projects/tasks that don't exist
- **Causes**:
  - ContextObjects not filtered by workspaceId (multi-tenant leak)
  - Stale ContextItem data (out of sync with Prisma entities)
  - LLM not following "use only provided data" instructions
  - Prompt doesn't emphasize ContextObjects as source of truth

**3. Slow Performance:**
- **Symptom**: Requests take >5 seconds
- **Causes**:
  - Large context (too many projects/tasks)
  - Slow database queries (missing indexes)
  - Embedding generation (semantic search)
  - LLM API latency (rate limits, network issues)

**4. Errors:**
- **Symptom**: 500 Internal Server Error, "AI service temporarily unavailable"
- **Causes**:
  - Missing `OPENAI_API_KEY` (returns non-error response, confusing)
  - Invalid API key or quota exceeded
  - Model unavailable (`gpt-4-turbo` not accessible)
  - Network connectivity issues
  - Database connection failures
  - Auth failures (missing/invalid session)

**5. Hallucinations:**
- **Symptom**: LLM invents projects, tasks, or people not in ContextObjects
- **Causes**:
  - Prompt doesn't emphasize "use only provided data"
  - ContextObjects empty or not included in prompt
  - LLM temperature too high (0.7 default might be too creative)
  - Missing "honesty rule" instructions

**6. Multi-Tenant Leakage:**
- **Symptom**: User sees data from other workspaces
- **Causes**:
  - `workspaceId` not properly scoped in queries
  - ContextItem queries don't filter by workspaceId
  - Private projects included in workspace context

**7. Missing Private Project Checks:**
- **Symptom**: User sees private projects they shouldn't access
- **Causes**:
  - `getWorkspaceContextObjects()` doesn't check `visibility` field
  - No permission checks before including projects in context

### Success Criteria

**A working Loopbrain request should:**
1. ✅ Return answer within 3-5 seconds (95th percentile)
2. ✅ Answer references only real data from ContextObjects
3. ✅ Answer is scoped to current workspace (no cross-tenant data)
4. ✅ Answer respects user permissions (no private project leakage)
5. ✅ Answer includes actionable suggestions when appropriate
6. ✅ Error messages are user-friendly and actionable
7. ✅ Context includes all relevant entities (projects, tasks, docs, org)
8. ✅ Semantic search returns relevant results (if enabled)
9. ✅ Slack integration works (if configured and requested)
10. ✅ Response includes metadata (model, tokens, retrievedCount)

