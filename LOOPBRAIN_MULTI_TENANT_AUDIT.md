# Loopbrain Multi-Tenant Safety Audit

## 3) Authorization & Workspace Scoping Verification

### WorkspaceId Resolution

**✅ CONFIRMED SAFE:**
- **API Routes** (`src/app/api/loopbrain/chat/route.ts`, `search/route.ts`, `context/route.ts`):
  - All routes call `getUnifiedAuth(request)` to get `workspaceId`
  - `workspaceId` is **NEVER** accepted from client request body
  - All routes call `assertAccess()` to verify workspace membership
  - `workspaceId` is passed to orchestrator from auth context only

**✅ CONFIRMED SAFE:**
- **Orchestrator** (`src/lib/loopbrain/orchestrator.ts`):
  - Receives `workspaceId` from `LoopbrainRequest` (set by API route from auth)
  - All context loading functions receive `workspaceId` as parameter
  - No client-provided `workspaceId` is used

### WorkspaceId Filtering in Queries

**✅ CONFIRMED SAFE:**
- **Context Engine** (`src/lib/loopbrain/context-engine.ts`):
  - `getWorkspaceContext()`: Filters by `workspaceId` ✅
  - `getProjectContext()`: Filters by `projectId` AND `workspaceId` ✅
  - `getPageContext()`: Filters by `pageId` AND `workspaceId` ✅
  - `getTaskContext()`: Filters by `taskId` AND `workspaceId` ✅
  - `getOrgContext()`: Filters by `workspaceId` ✅
  - `getActivityContext()`: Filters by `workspaceId` ✅
  - `getPersonalSpaceDocs()`: Filters by `workspaceId` AND `userId` ✅
  - `getOrgPeopleContext()`: Filters by `workspaceId` ✅

**✅ CONFIRMED SAFE:**
- **Embedding Service** (`src/lib/loopbrain/embedding-service.ts`):
  - `searchSimilarContextItems()`: Filters `ContextItem` by `workspaceId` ✅
  - `searchEmbeddings()`: Filters `ContextEmbedding` by `workspaceId` ✅

**✅ CONFIRMED SAFE:**
- **Context Store** (`src/lib/loopbrain/store/context-repository.ts`):
  - `saveContextItem()`: Includes `workspaceId` in unique constraint ✅
  - `getContextItem()`: Filters by `contextId`, `type`, AND `workspaceId` ✅

### Private Project Access Control

**❌ SUSPICIOUS - MISSING PROJECTSPACE VISIBILITY CHECK:**

**Location**: `src/lib/loopbrain/context-engine.ts:1519-1607` (`getWorkspaceContextObjects()`)

**Current Implementation:**
```typescript
const projects = await prisma.project.findMany({
  where: {
    workspaceId,
    isArchived: false // Only active projects by default
  },
  // ❌ MISSING: No ProjectSpace visibility check
})
```

**Problem:**
- Projects belong to `ProjectSpace` which has `visibility: PUBLIC | TARGETED`
- `TARGETED` spaces should only be visible to `ProjectSpaceMember`
- Current code returns ALL projects in workspace, regardless of ProjectSpace visibility
- This leaks private projects to users who shouldn't see them

**Expected Behavior (from `/api/projects` route):**
```typescript
where.OR = [
  { projectSpaceId: null }, // Legacy projects (treat as PUBLIC)
  { projectSpace: { visibility: 'PUBLIC' } },
  {
    projectSpace: {
      visibility: 'TARGETED',
      members: { some: { userId } }
    }
  },
  { createdById: userId }, // Creator always has access
  { ownerId: userId }      // Owner always has access
]
```

**Impact:**
- **HIGH**: Users can see projects in TARGETED spaces they're not members of
- **MEDIUM**: ContextObjects include private projects in LLM prompts
- **LOW**: Semantic search might return private projects

**Fix Required:**
- Add ProjectSpace visibility filtering to `getWorkspaceContextObjects()`
- Use same logic as `/api/projects` route
- Pass `userId` parameter to check ProjectSpace membership

### Other Access Control Checks

**✅ CONFIRMED SAFE:**
- **Personal Space Docs**: Filters by `workspaceId` AND `createdById: userId` ✅
- **Org People**: Filters by `workspaceId` (org data is workspace-scoped) ✅
- **Epics/Tasks**: Inherit project access (if project is filtered, epics/tasks are too) ✅

**⚠️ POTENTIAL ISSUE:**
- **Tasks in `getWorkspaceContextObjects()`**: When `includeTasks: true`, tasks are filtered by `workspaceId` and `projectId: { in: projectIds }`
- If projects are not properly filtered by ProjectSpace visibility, tasks from private projects might leak
- **Fix**: Tasks will be correctly filtered once projects are filtered properly

### Authorization Path Summary

**✅ Confirmed Safe Call Sites:**
1. `/api/loopbrain/chat` - Uses `getUnifiedAuth()` + `assertAccess()` ✅
2. `/api/loopbrain/search` - Uses `getUnifiedAuth()` + `assertAccess()` ✅
3. `/api/loopbrain/context` - Uses `getUnifiedAuth()` + `assertAccess()` ✅
4. `contextEngine.getWorkspaceContext()` - Filters by `workspaceId` ✅
5. `contextEngine.getProjectContext()` - Filters by `workspaceId` ✅
6. `contextEngine.getPageContext()` - Filters by `workspaceId` ✅
7. `contextEngine.getTaskContext()` - Filters by `workspaceId` ✅
8. `searchSimilarContextItems()` - Filters by `workspaceId` ✅
9. `getPersonalSpaceDocs()` - Filters by `workspaceId` AND `userId` ✅
10. `getOrgPeopleContext()` - Filters by `workspaceId` ✅

**❌ Suspicious Call Sites:**
1. **`getWorkspaceContextObjects()`** - Missing ProjectSpace visibility check ❌
   - **File**: `src/lib/loopbrain/context-engine.ts:1519-1607`
   - **Issue**: Returns all projects in workspace, ignoring ProjectSpace visibility
   - **Fix**: Add ProjectSpace visibility filtering (same as `/api/projects` route)

### Checklist

- [x] All API routes use `getUnifiedAuth()` for workspaceId
- [x] All API routes call `assertAccess()` for authorization
- [x] No client-provided workspaceId is used
- [x] All Prisma queries filter by workspaceId
- [x] ContextItem queries filter by workspaceId
- [x] Embedding queries filter by workspaceId
- [ ] **`getWorkspaceContextObjects()` filters by ProjectSpace visibility** ❌
- [x] Personal space docs filter by userId
- [x] Org data is workspace-scoped
- [ ] **Tasks inherit project access correctly** (depends on project filtering fix)

### Recommended Fixes

**Priority 1: Fix ProjectSpace Visibility Filtering**

Update `getWorkspaceContextObjects()` in `src/lib/loopbrain/context-engine.ts`:

```typescript
// Add ProjectSpace visibility filtering (same as /api/projects route)
const where: any = {
  workspaceId,
  isArchived: false,
  OR: [
    { projectSpaceId: null }, // Legacy projects (treat as PUBLIC)
    { projectSpace: { visibility: 'PUBLIC' } },
    {
      projectSpace: {
        visibility: 'TARGETED',
        members: { some: { userId } }
      }
    },
    { createdById: userId },
    { ownerId: userId }
  ]
}

const projects = await prisma.project.findMany({
  where,
  // ... rest of query
})
```

**Priority 2: Verify Task Filtering**

Once projects are filtered correctly, tasks will automatically be filtered correctly (they're filtered by `projectId: { in: projectIds }`).

