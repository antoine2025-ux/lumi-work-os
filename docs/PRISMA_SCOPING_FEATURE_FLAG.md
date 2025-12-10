# Prisma Workspace Scoping Feature Flag

## Overview

The `PRISMA_WORKSPACE_SCOPING_ENABLED` feature flag enables a defense-in-depth layer for workspace isolation. When enabled, all Prisma queries for workspace-scoped models automatically require workspace context, preventing accidental cross-workspace data leaks.

## How It Works

### When Disabled (Default: `PRISMA_WORKSPACE_SCOPING_ENABLED=false`)

- **Exports**: Plain Prisma client (unscoped)
- **Behavior**: Current behavior - routes must manually filter by `workspaceId`
- **Safety**: Relies entirely on explicit `where: { workspaceId }` clauses in queries
- **Performance**: No overhead

### When Enabled (`PRISMA_WORKSPACE_SCOPING_ENABLED=true`)

- **Exports**: Scoped Prisma client (wraps base client with `$extends`)
- **Behavior**: All workspace-scoped queries automatically require `workspaceId` context
- **Safety**: Missing workspace context throws errors (both dev and prod) - fail-fast
- **Performance**: Minimal overhead (in-memory context lookup)

## Enabling in Staging

1. **Set environment variable**:
   ```bash
   PRISMA_WORKSPACE_SCOPING_ENABLED=true
   ```

2. **Restart application**:
   - Check logs for: `✅ Workspace scoping ENABLED`

3. **Verify behavior**:
   - Routes with `setWorkspaceContext()` should work normally
   - Routes without `setWorkspaceContext()` should throw clear errors

## Workspace-Scoped Models

The following models require workspace context when scoping is enabled:

- **Projects**: Project, Task, Epic, Milestone, Subtask, TaskComment, TaskHistory
- **Wiki**: WikiPage, WikiChunk, WikiEmbed, WikiAttachment, WikiComment, WikiVersion, WikiPagePermission, WikiFavorite
- **Chat**: ChatSession, ChatMessage
- **Org**: OrgPosition
- **Workflows**: Workflow, WorkflowInstance
- **Onboarding**: OnboardingTemplate, OnboardingPlan, OnboardingTask
- **Templates**: ProjectTemplate, TaskTemplate, TaskTemplateItem
- **Custom Fields**: CustomFieldDef, CustomFieldVal
- **Project Relations**: ProjectMember, ProjectWatcher, ProjectAssignee, ProjectDailySummary
- **Integrations**: FeatureFlag, Integration, Migration
- **Activity**: Activity
- **Loopbrain**: ContextItem, ContextEmbedding, ContextSummary

## Expected Errors

### Missing Workspace Context

**Error message**:
```
Workspace scoping enabled but no workspace context set for findMany on Project.
Call setWorkspaceContext(workspaceId) before querying workspace-scoped models.
This is a safety check to prevent cross-workspace data leaks.
```

**Fix**: Add `setWorkspaceContext(auth.workspaceId)` before the query:

```typescript
// ✅ Correct pattern
const auth = await getUnifiedAuth(request)
await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace' })
setWorkspaceContext(auth.workspaceId) // Required when scoping enabled

const projects = await prisma.project.findMany({
  where: { workspaceId: auth.workspaceId } // Still required for explicit filtering
})
```

### Missing Where Clause (Update/Delete)

**Error message**:
```
Workspace scoping enabled: No where clause provided for update on Project.
Update/delete operations must include a where clause for safety.
```

**Fix**: Always include a `where` clause:

```typescript
// ✅ Correct
await prisma.project.update({
  where: { id: projectId, workspaceId: auth.workspaceId },
  data: { name: 'New Name' }
})
```

## Using Unscoped Prisma for Scripts/Background Jobs

For scripts, cron jobs, or background tasks that need to access data across workspaces:

**Import unscoped client**:
```typescript
import { prismaUnscoped } from '@/lib/db'

// This client bypasses workspace scoping
const allProjects = await prismaUnscoped.project.findMany()
```

**⚠️ Warning**: Only use `prismaUnscoped` in:
- One-off scripts
- Background jobs (cron, queues)
- Admin/debugging tools
- Migration scripts

**Never use `prismaUnscoped` in**:
- API routes
- Server components
- Any user-facing code

## Defense-in-Depth

This scoping layer is **additional safety**, not a replacement for existing patterns:

1. **Still required**: `getUnifiedAuth()` to resolve workspaceId
2. **Still required**: `assertAccess()` to validate membership
3. **Still required**: `setWorkspaceContext()` when scoping enabled
4. **Still required**: Explicit `where: { workspaceId }` in queries

The scoping middleware catches bugs where `setWorkspaceContext()` is forgotten, but doesn't replace explicit filtering.

## Troubleshooting

### "No workspace context set" errors

- **Check**: Is `setWorkspaceContext()` called before the query?
- **Check**: Is the feature flag enabled?
- **Check**: Is the query targeting a workspace-scoped model?

### Queries still work without setWorkspaceContext

- **Check**: Is the feature flag actually set to `"true"` (string, not boolean)?
- **Check**: Did you restart the application after setting the flag?
- **Check**: Are you importing `prisma` (scoped) or `prismaUnscoped` (unscoped)?

### Performance concerns

- Scoping adds minimal overhead (in-memory context lookup)
- If performance degrades, check for queries that forgot `setWorkspaceContext()` (they'll throw errors)

## Migration Path

1. **Phase 1**: Enable flag in staging, monitor errors
2. **Phase 2**: Fix any routes that forgot `setWorkspaceContext()`
3. **Phase 3**: Enable flag in production
4. **Phase 4**: Keep enabled permanently (defense-in-depth)

## Related Documentation

- `docs/MULTI_TENANT_HARDENING.md` - Overall multi-tenant architecture
- `ARCHITECTURE_SUMMARY.md` - Current architecture overview
