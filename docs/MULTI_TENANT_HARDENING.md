# Multi-Tenant Hardening Guide

## Overview

This document describes the multi-tenant hardening measures implemented in Loopwell 2.0, including workspace scoping, access control, and data isolation.

## Architecture

### Tenant Model

- **Workspace**: Primary tenant container (`id`, `name`, `slug`, `ownerId`)
- **WorkspaceMember**: Links users to workspaces with roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)
- **Membership validation**: Via `WorkspaceMember.findUnique()` using composite key `[workspaceId, userId]`

### Authentication & Authorization

**Pattern**: `getUnifiedAuth()` → `assertAccess()` → `setWorkspaceContext()` → query with `where: { workspaceId }`

1. **`getUnifiedAuth(request)`**: Resolves `workspaceId` from URL params → header → user's first workspace
2. **`assertAccess()`**: Validates workspace membership and role requirements
3. **`setWorkspaceContext(workspaceId)`**: Sets workspace context for Prisma scoping (when enabled)
4. **Explicit filtering**: All queries include `where: { workspaceId: auth.workspaceId }`

## Defense-in-Depth Layers

### Layer 1: Application-Level Access Control

- **`assertAccess()`**: Validates workspace membership before queries
- **Explicit `where` clauses**: All queries filter by `workspaceId`
- **Used in**: 100+ API routes

### Layer 2: Prisma Workspace Scoping (Feature-Flagged)

- **Feature flag**: `PRISMA_WORKSPACE_SCOPING_ENABLED` (default: `false`)
- **When enabled**: Automatically requires workspace context for workspace-scoped models
- **Behavior**: Missing workspace context throws errors (fail-fast)
- **Purpose**: Catch bugs where `setWorkspaceContext()` is forgotten

See `docs/PRISMA_SCOPING_FEATURE_FLAG.md` for details.

#### Enabling Scoping Flag in Staging

**Step 1: Set Environment Variable**

In your staging environment (Vercel, Railway, etc.):
```bash
PRISMA_WORKSPACE_SCOPING_ENABLED=true
```

**Step 2: Restart Application**

After setting the flag, restart the application. Check logs for:
```
✅ Workspace scoping ENABLED - Prisma client is scoped, workspace context required
```

**Step 3: Verify Bad Query Fails**

Create a test route or script that attempts a query without workspace context:

```typescript
// Bad query example - should fail when scoping enabled
import { prisma } from '@/lib/db'
// Note: NOT importing setWorkspaceContext

async function badQuery() {
  try {
    // This should throw an error when PRISMA_WORKSPACE_SCOPING_ENABLED=true
    const projects = await prisma.project.findMany()
    console.error('❌ ERROR: Query succeeded without workspace context!')
  } catch (error) {
    // Expected error when scoping enabled
    console.log('✅ Query correctly failed:', error.message)
    // Error message should be:
    // "Workspace scoping enabled but no workspace context set for findMany on Project.
    //  Call setWorkspaceContext(workspaceId) before querying workspace-scoped models."
  }
}
```

**Step 4: Verify Good Query Works**

```typescript
// Good query example - should work when scoping enabled
import { prisma } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

async function goodQuery(workspaceId: string) {
  // Set workspace context before query
  setWorkspaceContext(workspaceId)
  
  // This should work
  const projects = await prisma.project.findMany({
    where: { workspaceId } // Still required for explicit filtering
  })
  console.log('✅ Query succeeded with workspace context')
}
```

**Expected Behavior**:
- Bad query (no context) → throws error immediately
- Good query (with context) → works normally
- Error messages are clear and actionable

### Layer 3: Database-Level Protection (RLS)

- **RLS enabled**: On all tables in database
- **Note**: Prisma uses service role which bypasses RLS
- **Purpose**: Protects direct database access, not Prisma queries

## Multi-Workspace Support

### `/api/workspaces` Endpoint

**GET `/api/workspaces`**:
- Returns **all** workspaces where user has `WorkspaceMember` record
- Response shape:
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
      }
    ]
  }
  ```
- **Backwards compatible**: Same shape, just more items in array

## Workspace-Scoped Models

All domain models have `workspaceId` field and are workspace-scoped:

- Projects: Project, Task, Epic, Milestone, Subtask, TaskComment, TaskHistory
- Wiki: WikiPage, WikiChunk, WikiEmbed, WikiAttachment, WikiComment, WikiVersion, WikiPagePermission, WikiFavorite
- Chat: ChatSession, ChatMessage
- Org: OrgPosition, OrgDepartment, OrgTeam, OrgAuditLog
- Workflows: Workflow, WorkflowInstance
- Onboarding: OnboardingTemplate, OnboardingPlan, OnboardingTask
- Templates: ProjectTemplate, TaskTemplate, TaskTemplateItem
- Custom Fields: CustomFieldDef, CustomFieldVal
- Project Relations: ProjectMember, ProjectWatcher, ProjectAssignee, ProjectDailySummary
- Integrations: FeatureFlag, Integration, Migration
- Activity: Activity
- Loopbrain: ContextItem, ContextEmbedding, ContextSummary

## Manual Verification Steps

### 1. Verify Workspace Scoping (When Enabled)

```bash
# Set feature flag
export PRISMA_WORKSPACE_SCOPING_ENABLED=true

# Restart app and check logs
# Should see: "✅ Workspace scoping ENABLED"
```

**Test queries without workspace context**:
```typescript
// This should throw an error when scoping enabled
const projects = await prisma.project.findMany()
// Error: "Workspace scoping enabled but no workspace context set..."
```

**Test queries with workspace context**:
```typescript
// This should work
setWorkspaceContext(workspaceId)
const projects = await prisma.project.findMany({
  where: { workspaceId }
})
```

### 2. Verify Multi-Workspace API

**Setup**:
- Create user with 2+ workspace memberships

**Test**:
```bash
curl -H "Cookie: next-auth.session-token=..." http://localhost:3000/api/workspaces
```

**Expected**:
- Returns array with all user's workspaces
- Each workspace includes `userRole`
- No duplicates

### 3. Verify Cross-Workspace Isolation

**Setup**:
- User A in workspace 1
- User B in workspace 2
- Activities/projects in both workspaces

**Test**:
- Authenticate as User A
- Query activities/projects via API
- Verify no data from workspace 2 appears

### 4. Verify Scripts Use Unscoped Client

**Check scripts**:
```bash
grep -r "from '@/lib/db'" scripts/
```

**Expected**:
- Scripts import `prismaUnscoped` (not `prisma`)
- Background jobs use `prismaUnscoped`

## Testing Checklist

### Feature Flag Off (Default)
- [ ] App behaves exactly as before
- [ ] All API routes work normally
- [ ] No performance degradation
- [ ] Logs show: "Workspace scoping DISABLED"

### Feature Flag On
- [ ] Logs show: "Workspace scoping ENABLED"
- [ ] Routes with `setWorkspaceContext()` work correctly
- [ ] Routes without `setWorkspaceContext()` throw clear errors
- [ ] Queries automatically get `workspaceId` injected
- [ ] Explicit `where: { workspaceId }` still works (doesn't double-inject)

### Multi-Workspace API
- [ ] User with 1 workspace → returns array with 1 workspace
- [ ] User with 2+ workspaces → returns array with all workspaces (no duplicates)
- [ ] Response shape matches existing format (all fields preserved)
- [ ] `userRole` is included for each workspace
- [ ] Unauthenticated requests return 401

### Cross-Workspace Isolation
- [ ] User A cannot see workspace B's data
- [ ] User B cannot see workspace A's data
- [ ] Activities are workspace-scoped
- [ ] Projects are workspace-scoped
- [ ] Wiki pages are workspace-scoped

## Common Issues

### "No workspace context set" errors

**Cause**: Feature flag enabled but `setWorkspaceContext()` not called

**Fix**: Add `setWorkspaceContext(auth.workspaceId)` before query

### Queries still work without setWorkspaceContext

**Cause**: Feature flag not actually enabled or using `prismaUnscoped`

**Fix**: Check `PRISMA_WORKSPACE_SCOPING_ENABLED=true` and import `prisma` (not `prismaUnscoped`)

### `/api/workspaces` returns empty array

**Cause**: User has no workspace memberships

**Fix**: Create workspace membership for user

## Rollback Plan

If issues arise:

1. **Disable feature flag**: Set `PRISMA_WORKSPACE_SCOPING_ENABLED=false`
2. **Revert API changes**: Restore `/api/workspaces` to return first workspace only
3. **No database changes**: All changes are code-only, no migration needed

## Related Documentation

- `docs/PRISMA_SCOPING_FEATURE_FLAG.md` - Prisma scoping feature flag details
- `ARCHITECTURE_SUMMARY.md` - Overall architecture overview
- `ACTIVITY_WORKSPACE_SCOPING_CHANGES.md` - Activity model workspace scoping
