# Activity Workspace Scoping - Implementation Summary

## Overview
Added `workspaceId` field to `Activity` model to ensure tenant isolation. All Activity queries now filter by `workspaceId` from server-side auth context.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)

**Activity Model Changes:**
- Added `workspaceId String` field
- Added `workspace Workspace` relation with foreign key
- Added indexes: `[workspaceId]` and `[workspaceId, createdAt DESC]`

**Workspace Model Changes:**
- Added reverse relation: `activities Activity[]`

### 2. Context Engine (`src/lib/loopbrain/context-engine.ts`)

**Before:** Workaround that fetched all activities and filtered client-side by checking entity workspaceId
**After:** Direct database query with `where: { workspaceId }` filter

**Key changes:**
- Removed workaround logic (lines 730-761)
- Simplified query to use `where: { workspaceId }`
- Updated comment to reflect fix

### 3. AI Chat Route (`src/app/api/ai/chat/route.ts`)

**Before:** Filtered by `actorId` only
**After:** Filters by both `workspaceId` and `actorId`

**Key changes:**
- Added `workspaceId: auth.workspaceId` to `where` clause
- Added comment explaining workspace scoping for tenant safety

### 4. Migration (`prisma/migrations/20251210110313_add_workspace_to_activity/migration.sql`)

**Migration steps:**
1. Add `workspaceId` column (nullable initially)
2. Backfill `workspaceId` from related entities:
   - `entity = 'project'` → from `projects.workspaceId`
   - `entity = 'task'` → from `tasks.workspaceId`
   - `entity = 'wiki_page'` → from `wiki_pages.workspaceId`
3. Delete orphaned activities (NULL `workspaceId` after backfill)
4. Set `workspaceId` to NOT NULL
5. Add foreign key constraint
6. Add indexes for efficient queries

## Code Diffs

### `prisma/schema.prisma`

```diff
model Activity {
  id        String   @id @default(cuid())
  actorId   String
+ workspaceId String
  entity    String
  entityId  String
  action    String
  meta      Json?
  createdAt DateTime @default(now())
  actor     User     @relation(fields: [actorId], references: [id], onDelete: Cascade)
+ workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([actorId, entity, entityId], map: "idx_activities_actor_entity")
  @@index([createdAt(sort: Desc)], map: "idx_activities_created")
+ @@index([workspaceId], map: "idx_activities_workspace")
+ @@index([workspaceId, createdAt(sort: Desc)], map: "idx_activities_workspace_created")
  @@map("activities")
}

model Workspace {
  ...
+ activities          Activity[]
  ...
}
```

### `src/lib/loopbrain/context-engine.ts`

```diff
  /**
   * Get activity/recent changes context
   * v1: Last N activities for the workspace
-  * 
-  * Note: Activity model doesn't have workspaceId, so we fetch recent activities
-  * and filter by checking if the entity belongs to the workspace.
-  * This is a limitation that should be fixed in the schema.
   */
  async getActivityContext(
    workspaceId: string,
    options?: ContextOptions
  ): Promise<ActivityContext | null> {
    try {
-     // Fetch recent activities (limit to 100, we'll filter by workspace after)
      const activities = await prisma.activity.findMany({
+       where: {
+         workspaceId
+       },
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
-       take: 100, // Fetch more to filter by workspace
+       take: options?.limit || 50,
        orderBy: {
          createdAt: 'desc'
        }
      })

-     // Filter by workspace by checking entity workspaceId
-     // This is a workaround - Activity should have workspaceId in future
-     const workspaceActivityIds = new Set<string>()
-     
-     // Check projects
-     const projectIds = await prisma.project.findMany({
-       where: { workspaceId },
-       select: { id: true }
-     })
-     projectIds.forEach(p => workspaceActivityIds.add(p.id))
-
-     // Check tasks
-     const taskIds = await prisma.task.findMany({
-       where: { workspaceId },
-       select: { id: true }
-     })
-     taskIds.forEach(t => workspaceActivityIds.add(t.id))
-
-     // Check wiki pages
-     const pageIds = await prisma.wikiPage.findMany({
-       where: { workspaceId },
-       select: { id: true }
-     })
-     pageIds.forEach(p => workspaceActivityIds.add(p.id))
-
-     // Filter activities that belong to this workspace
-     const workspaceActivities = activities
-       .filter(activity => {
-         // Check if entityId matches any workspace entity
-         return workspaceActivityIds.has(activity.entityId)
-       })
-       .slice(0, options?.limit || 50) // Apply limit after filtering

-     const activitySummaries: ActivitySummary[] = workspaceActivities.map(activity => ({
+     const activitySummaries: ActivitySummary[] = activities.map(activity => ({
        id: activity.id,
        entity: activity.entity,
        entityId: activity.entityId,
        action: activity.action,
        userId: activity.actorId,
        userName: activity.actor.name || 'Unknown',
        timestamp: activity.createdAt.toISOString(),
        description: undefined,
        metadata: activity.meta as Record<string, unknown> | undefined
      }))
```

### `src/app/api/ai/chat/route.ts`

```diff
    // Recent activities
+   // Recent activities (scoped to workspace for tenant safety)
    const recentActivities = await prisma.activity.findMany({
-     where: { actorId: chatSession.userId },
+     where: { 
+       workspaceId: auth.workspaceId,
+       actorId: chatSession.userId 
+     },
      select: {
        entity: true,
        action: true,
        meta: true,
        createdAt: true
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
```

## Migration SQL

See `prisma/migrations/20251210110313_add_workspace_to_activity/migration.sql`

**Key points:**
- Backfills `workspaceId` only from deterministically related entities (projects, tasks, wiki_pages)
- Deletes orphaned activities that cannot be backfilled (ensures tenant safety)
- Adds foreign key constraint and indexes for performance

## Manual Testing Guide

### Prerequisites
- Database with existing Activity records (if any)
- At least 2 workspaces with different users
- Test user with access to one workspace

### Test 1: Migration Execution
1. **Run migration:**
   ```bash
   npx prisma migrate dev
   ```
2. **Verify migration:**
   - Check that migration runs without errors
   - Verify all existing activities have `workspaceId` populated (if any exist)
   - Check that orphaned activities are deleted (if any existed)

### Test 2: Activity Context Query (Loopbrain)
1. **Setup:**
   - Create activities in workspace A (if Activity creation code exists)
   - Create activities in workspace B (if Activity creation code exists)
2. **Test `getActivityContext()`:**
   - Call Loopbrain context API with `mode=activity` and `workspaceId=workspaceA`
   - Verify only activities from workspace A are returned
   - Call with `workspaceId=workspaceB`
   - Verify only activities from workspace B are returned
   - Verify no cross-workspace data leakage

### Test 3: AI Chat Route Activity Query
1. **Setup:**
   - User belongs to workspace A
   - User has activities in workspace A
   - User has activities in workspace B (if user belongs to both)
2. **Test `/api/ai/chat`:**
   - Make POST request to `/api/ai/chat` as user
   - Verify `recentActivities` in response only includes activities from workspace A
   - Verify no activities from workspace B appear

### Test 4: Database Query Verification
1. **Direct database check:**
   ```sql
   -- Verify all activities have workspaceId
   SELECT COUNT(*) FROM activities WHERE "workspaceId" IS NULL;
   -- Should return 0
   
   -- Verify foreign key constraint works
   SELECT COUNT(*) FROM activities a
   LEFT JOIN workspaces w ON a."workspaceId" = w.id
   WHERE w.id IS NULL;
   -- Should return 0
   
   -- Verify indexes exist
   SELECT indexname FROM pg_indexes WHERE tablename = 'activities' AND indexname LIKE '%workspace%';
   -- Should show idx_activities_workspace and idx_activities_workspace_created
   ```

### Test 5: Cross-Workspace Isolation
1. **Setup:**
   - User A in workspace 1
   - User B in workspace 2
   - Activities created by both users
2. **Test:**
   - Authenticate as User A
   - Query activities via API
   - Verify no activities from workspace 2 appear
   - Authenticate as User B
   - Query activities via API
   - Verify no activities from workspace 1 appear

### Test 6: Performance Check
1. **With indexes:**
   - Query activities for a workspace with many activities
   - Verify query performance is acceptable
   - Check query plan uses indexes

## Rollback Plan

If migration needs to be rolled back:

1. **Revert code changes:**
   ```bash
   git revert <commit-hash>
   ```

2. **Rollback migration:**
   ```bash
   npx prisma migrate resolve --rolled-back 20251210110313_add_workspace_to_activity
   ```

3. **Manual cleanup (if needed):**
   ```sql
   ALTER TABLE "activities" DROP COLUMN IF EXISTS "workspaceId";
   DROP INDEX IF EXISTS "idx_activities_workspace";
   DROP INDEX IF EXISTS "idx_activities_workspace_created";
   ```

## Notes

- **Activity creation**: Currently no code creates Activity records, but schema is now ready for future use
- **Backward compatibility**: Migration handles existing data gracefully by backfilling from related entities
- **Safety**: Orphaned activities are deleted to ensure tenant isolation
- **Performance**: Indexes added for efficient workspace-scoped queries
