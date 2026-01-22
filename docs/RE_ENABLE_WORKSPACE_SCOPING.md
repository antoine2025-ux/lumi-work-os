# Re-enabling Workspace Scoping - Guide

## Current State

Workspace scoping middleware is **disabled** by default. The feature flag `PRISMA_WORKSPACE_SCOPING_ENABLED` controls whether the scoped Prisma client is used.

**Location**: `src/lib/db.ts` (line 108)

## What Workspace Scoping Does

When enabled, the Prisma client automatically:
1. Requires `setWorkspaceContext(workspaceId)` before querying workspace-scoped models
2. Automatically adds `workspaceId` to `where` clauses for `findMany`, `findFirst`, `count`
3. Automatically sets `workspaceId` in `create` operations
4. Requires `workspaceId` in `where` clause for `update`/`delete` operations
5. Throws errors if workspace context is missing (fail-fast)

## Prerequisites Before Re-enabling

### 1. Audit All Prisma Queries

Run the audit script:
```bash
npx tsx scripts/audit-workspace-scoping.ts
```

This will identify queries that may be missing `workspaceId` filters.

### 2. Ensure All API Routes Call `setWorkspaceContext()`

All API routes should follow this pattern:
```typescript
export async function GET(request: NextRequest) {
  const auth = await getUnifiedAuth(request);
  await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId });
  
  // Set workspace context for scoped Prisma client
  setWorkspaceContext(auth.workspaceId);
  
  // Now queries automatically include workspaceId
  const projects = await prisma.project.findMany({
    where: { status: 'ACTIVE' } // workspaceId automatically added
  });
  
  // Clear context after use (optional, but good practice)
  clearWorkspaceContext();
}
```

### 3. Update Scripts and Background Jobs

Scripts that need unscoped access should use `prismaUnscoped`:
```typescript
import { prismaUnscoped } from '@/lib/db';

// Scripts can query without workspace context
const allUsers = await prismaUnscoped.user.findMany();
```

## Re-enablement Steps

### Step 1: Run Audit
```bash
npx tsx scripts/audit-workspace-scoping.ts > workspace-scoping-audit.txt
```

### Step 2: Fix Missing workspaceId Filters

For each finding:
1. Check if the query truly needs workspaceId (some may scope via relations)
2. If needed, ensure `setWorkspaceContext()` is called before the query
3. Or explicitly add `workspaceId` to the `where` clause

### Step 3: Test in Development

Set the environment variable:
```bash
PRISMA_WORKSPACE_SCOPING_ENABLED=true npm run dev
```

### Step 4: Run Tests

```bash
npm run test
npm run test:e2e
```

### Step 5: Monitor for Errors

Watch for errors like:
```
Workspace scoping enabled but no workspace context set for findMany on Project.
```

These indicate places where `setWorkspaceContext()` is missing.

### Step 6: Enable in Production

Once all tests pass and no errors are found:
1. Set `PRISMA_WORKSPACE_SCOPING_ENABLED=true` in production environment
2. Deploy
3. Monitor logs for any workspace context errors

## Models That Require Workspace Context

When scoping is enabled, these models require `setWorkspaceContext()`:

- Project, Task, Epic, Milestone
- WikiPage, WikiChunk, WikiEmbed, WikiAttachment, WikiComment, WikiVersion
- ChatSession, ChatMessage
- FeatureFlag, Integration, Migration
- Workflow, WorkflowInstance
- OnboardingTemplate, OnboardingPlan
- OrgPosition
- ProjectTemplate, TaskTemplate
- Activity
- CustomFieldDef, CustomFieldVal
- TaskHistory, ProjectDailySummary
- ProjectMember, ProjectWatcher, ProjectAssignee
- Subtask, TaskComment
- ContextItem, ContextEmbedding, ContextSummary

## Models That Don't Require Workspace Context

These models are NOT workspace-scoped:
- User, Account, Session, VerificationToken (auth models)
- Workspace, WorkspaceMember, WorkspaceInvite (workspace management)
- BlogPost (global)
- Child models that scope via parent (e.g., Subtask via Task)

## Troubleshooting

### Error: "Workspace scoping enabled but no workspace context set"

**Solution**: Call `setWorkspaceContext(workspaceId)` before the query.

```typescript
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';

setWorkspaceContext(auth.workspaceId);
const projects = await prisma.project.findMany();
```

### Error: "No where clause provided for update/delete"

**Solution**: Always include a `where` clause for update/delete operations.

```typescript
// ❌ Bad
await prisma.project.update({ data: { name: 'New' } });

// ✅ Good
await prisma.project.update({
  where: { id: projectId },
  data: { name: 'New' }
});
```

### Scripts Failing

**Solution**: Use `prismaUnscoped` for scripts:

```typescript
import { prismaUnscoped } from '@/lib/db';

// No workspace context needed
const users = await prismaUnscoped.user.findMany();
```

## Benefits of Re-enabling

1. **Defense-in-depth**: Automatic workspace filtering prevents data leaks
2. **Fail-fast**: Errors catch missing workspace context early
3. **Consistency**: All queries automatically scoped
4. **Safety**: Harder to accidentally query wrong workspace

## Risks

1. **Breaking changes**: Queries without `setWorkspaceContext()` will fail
2. **Scripts need updates**: Background jobs must use `prismaUnscoped`
3. **Performance**: Minimal - just adds `workspaceId` to where clauses

## Recommendation

**Do not re-enable until:**
1. ✅ All API routes call `setWorkspaceContext()`
2. ✅ Audit script shows no critical missing filters
3. ✅ All tests pass with scoping enabled
4. ✅ Scripts updated to use `prismaUnscoped`

**Current status**: Scoping is ready but disabled. Manual `where: { workspaceId }` filters are the current protection.
