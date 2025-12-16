# Implementation Plan: Feature-Flagged Prisma Scoping + Multi-Workspace API

## Current State Summary

### How `getUnifiedAuth` Chooses `workspaceId`
- **Priority order** (in `resolveActiveWorkspaceIdWithMember()`):
  1. URL query param `workspaceId` (validated via `WorkspaceMember.findUnique()`)
  2. URL query param `projectId` → derive `workspaceId` from project
  3. Header `x-workspace-id` (validated via membership)
  4. User's first workspace membership (default)
  5. Create default workspace if none exists
- **Returns**: `AuthContext` with `workspaceId` and `user.userId`
- **Caching**: Request-level caching via `getCachedAuth()` / `setCachedAuth()`

### How `assertAccess` is Used in Typical API Routes
- **Pattern**: `getUnifiedAuth(request)` → `assertAccess({ userId, workspaceId, scope, requireRole })`
- **`assertAccess()` behavior**:
  - Validates workspace membership via `WorkspaceMember.findUnique()`
  - Checks role hierarchy (VIEWER < MEMBER < ADMIN < OWNER)
  - For project scope: also checks `ProjectMember` or creator/owner status
  - Throws `Error('Forbidden: ...')` if unauthorized
- **Usage**: Called in 100+ API routes before data queries

### Current Scoping Middleware in `src/lib/db.ts`
- **Status**: **Disabled** (commented out, lines 93-122)
- **Why disabled**: TODO comment says "Re-enable scoping middleware once Prisma $use issue is resolved"
- **Existing implementation**: 
  - `scopingMiddleware.ts` exists with `WORKSPACE_SCOPED_MODELS` list (43 models)
  - `scoped-prisma.ts` exists with `$extends` pattern (Prisma v5+)
  - `setWorkspaceContext()` function exists in `scopingMiddleware.ts`
  - Currently: `setWorkspaceContext()` is called in 39 API routes but is a no-op
- **Current behavior**: Base Prisma client, no automatic scoping

### What `GET /api/workspaces` Currently Returns
- **Current implementation** (`src/app/api/workspaces/route.ts:6-42`):
  - Returns **only first workspace** where user is member
  - Shape: `{ workspaces: [{ id, name, slug, description, createdAt, updatedAt, userRole }] }`
  - Uses `auth.workspaceId` from `getUnifiedAuth()` (first workspace)
  - Returns empty array if no workspace found

### How `WorkspaceProvider` Uses It
- **File**: `src/lib/workspace-context.tsx`
- **Usage** (line 92-96):
  - Fetches `/api/workspaces`
  - Expects `workspacesData.workspaces` array
  - Uses `workspacesList[0]` as current workspace
  - Also fetches role separately via `/api/workspaces/${workspaceId}/user-role`
- **Current limitation**: Only sees first workspace, can't switch between multiple

---

## Files to Modify

### A. Feature-Flagged Prisma Scoping

#### 1. `src/lib/db.ts`
**Changes**:
- Add feature flag check: `PRISMA_WORKSPACE_SCOPING_ENABLED` (env var, default "false")
- When flag is "false": Export plain Prisma client (no scoping) with explicit comment
- When flag is "true": Export scoped Prisma client via `createScopedPrisma()` with explicit comment
- Export `prismaUnscoped` for scripts/background jobs (always unscoped, clearly named)
- Document which models are workspace-scoped
- Document that this is defense-in-depth, not replacement for `assertAccess()`

#### 2. `src/lib/prisma/scopingMiddleware.ts`
**Changes**:
- Update `setWorkspaceContext()` to be safe when called multiple times
- Ensure it's a no-op when feature flag is off (already is, but document it)
- Add comment about feature flag dependency

#### 3. `docs/PRISMA_SCOPING_FEATURE_FLAG.md` (NEW)
**Content**:
- How the scoping flag works
- How to enable in staging
- What errors to expect if query forgot workspace context
- List of workspace-scoped models
- How to use `prismaUnscoped` for scripts/background jobs

### B. Multi-Workspace API

#### 4. `src/app/api/workspaces/route.ts`
**Changes**:
- **GET handler**: Return **all** workspaces where user has `WorkspaceMember` record
- Query: `prisma.workspaceMember.findMany({ where: { userId }, include: { workspace: true } })`
- Shape: `{ workspaces: [{ id, name, slug, createdAt, userRole }] }` (match existing shape)
- Include user's role from `WorkspaceMember.role` (no separate role fetch needed)
- Keep `getUnifiedAuth()` + appropriate access checks
- Do not trust client-supplied `workspaceId`

#### 5. `src/app/api/workspaces/[workspaceId]/user-role/route.ts` (if exists)
**Changes**:
- Keep working (may be used elsewhere)
- Consider deprecation note if `/api/workspaces` now includes role

### C. Documentation & Testing

#### 6. `docs/MULTI_TENANT_HARDENING.md` (NEW or UPDATE)
**Content**:
- Mention new scoping flag
- Mention `/api/workspaces` changes
- Manual verification steps
- Testing checklist

---

## Implementation Details

### A. Feature-Flagged Scoping

**Environment Variable**:
- Name: `PRISMA_WORKSPACE_SCOPING_ENABLED`
- Values: `"true"` or `"false"` (string, not boolean)
- Default: `"false"` (backwards compatible)

**When Flag is "false"**:
- Export plain Prisma client (no scoping) - current behavior
- `setWorkspaceContext()` is effectively a no-op
- All queries work as they do today
- Code comments explicitly state: "Unscoped Prisma client - workspace scoping disabled"

**When Flag is "true"**:
- Export scoped Prisma client via `createScopedPrisma()` wrapper
- `setWorkspaceContext()` sets in-memory context
- All queries for workspace-scoped models automatically get `workspaceId` injected
- **Strict behavior**: If `workspaceId` not set and query targets workspace-scoped model:
  - **Development**: Throw clear error with helpful message (fail-fast to catch bugs)
  - **Production**: Throw error (fail-fast for safety)
  - **No silent bypass**: Queries without workspace context must not execute
- Code comments explicitly state: "Scoped Prisma client - workspace scoping enabled"

**Workspace-Scoped Models** (from `scopingMiddleware.ts`):
- Project, Task, Epic, Milestone
- WikiPage, WikiChunk, WikiEmbed, WikiAttachment, WikiComment, WikiVersion, WikiPagePermission, WikiFavorite
- ChatSession, ChatMessage
- FeatureFlag, Integration, Migration
- Workflow, WorkflowInstance
- OnboardingTemplate, OnboardingPlan, OnboardingTask
- OrgPosition
- ProjectTemplate, TaskTemplate, TaskTemplateItem
- Activity (newly added)
- CustomFieldDef, CustomFieldVal, TaskHistory
- ProjectDailySummary, ProjectMember, ProjectWatcher, ProjectAssignee
- Subtask, TaskComment
- ContextItem, ContextEmbedding, ContextSummary

**Safety Checks**:
- Only inject `workspaceId` if not already present in query
- Skip models that don't have `workspaceId` field (scope via relations)
- Document that routes must still use `assertAccess()` + explicit `where: { workspaceId }`

### B. Multi-Workspace API

**GET `/api/workspaces` Response Shape**:
```typescript
{
  workspaces: [
    {
      id: string
      name: string
      slug: string
      description: string | null
      createdAt: Date
      updatedAt: Date
      userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
    },
    // ... more workspaces
  ]
}
```

**Query Logic**:
```typescript
const memberships = await prisma.workspaceMember.findMany({
  where: { userId: auth.user.userId },
  include: {
    workspace: {
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true
      }
    }
  }
})

const workspaces = memberships.map(m => ({
  id: m.workspace.id,
  name: m.workspace.name,
  slug: m.workspace.slug,
  description: m.workspace.description,
  createdAt: m.workspace.createdAt,
  updatedAt: m.workspace.updatedAt,
  userRole: m.role
}))
```

**Backwards Compatibility**:
- Shape matches existing (just more items in array)
- `WorkspaceProvider` will work without changes (uses `workspaces[0]`)

---

## Testing Checklist

### Feature Flag Off (Default)
- [ ] App behaves exactly as before
- [ ] All API routes work normally
- [ ] No performance degradation

### Feature Flag On
- [ ] Routes with `setWorkspaceContext()` work correctly
- [ ] Routes without `setWorkspaceContext()` log warnings (dev) or fail (prod)
- [ ] Queries automatically get `workspaceId` injected
- [ ] Explicit `where: { workspaceId }` still works (doesn't double-inject)

### Multi-Workspace API
- [ ] User with 1 workspace → returns array with 1 workspace
- [ ] User with 2+ workspaces → returns array with all workspaces (no duplicates)
- [ ] Response shape matches existing format
- [ ] `userRole` is included for each workspace
- [ ] Unauthenticated requests return 401

### Integration
- [ ] `WorkspaceProvider` can consume new response format
- [ ] No breaking changes to existing frontend code
- [ ] Role fetching still works (if `/api/workspaces/[id]/user-role` exists)

---

## Rollback Plan

If issues arise:

1. **Disable feature flag**: Set `PRISMA_WORKSPACE_SCOPING_ENABLED=false`
2. **Revert API changes**: Restore `/api/workspaces` to return first workspace only
3. **No database changes**: All changes are code-only, no migration needed

---

## Notes

- **Defense-in-depth**: Scoping middleware is additional safety layer, not replacement for `assertAccess()`
- **Backwards compatible**: Feature flag defaults to "false", API shape matches existing
- **No URL changes**: All changes are backend-only
- **No Loopbrain changes**: Loopbrain behavior unchanged
- **Gradual rollout**: Enable flag in staging first, monitor, then enable in production
