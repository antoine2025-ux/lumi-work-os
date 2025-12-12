-- Critical Performance Indexes
-- These indexes are essential for the slow queries identified in production logs
-- 
-- Issues found:
-- 1. getUnifiedAuth: 1.36s (user query: 0.56s, workspace query: 0.79s)
-- 2. /api/org/positions: 3.3s (db query: 1.37s for just 4 positions)
--
-- Root cause: Missing composite indexes on frequently queried columns

-- OrgPosition: Composite index for workspace + isActive (most common query)
-- This is used in: WHERE workspaceId = ? AND isActive = true
CREATE INDEX IF NOT EXISTS "idx_org_positions_workspace_active" 
ON "org_positions"("workspaceId", "isActive") 
WHERE "isActive" = true;

-- OrgPosition: Index on parentId for groupBy queries
-- This is used in: GROUP BY parentId (for childCount calculation)
CREATE INDEX IF NOT EXISTS "idx_org_positions_parent_id" 
ON "org_positions"("parentId") 
WHERE "parentId" IS NOT NULL;

-- Workspace: Ensure slug has an index (should exist from @unique, but verify)
-- This is used in: WHERE slug = ? (workspace lookup by slug)
-- Note: @unique should create this automatically, but adding explicitly for safety
CREATE INDEX IF NOT EXISTS "idx_workspaces_slug" 
ON "workspaces"("slug");

-- User: Ensure email has an index (should exist from @unique, but verify)
-- This is used in: WHERE email = ? (user lookup by email)
-- Note: @unique should create this automatically, but adding explicitly for safety
CREATE INDEX IF NOT EXISTS "idx_users_email" 
ON "users"("email");

-- WorkspaceMember: Composite index for workspace + user lookup
-- This is used in workspace resolution with members filter
-- Note: Already exists as idx_workspace_members_user_workspace, but verify it's being used
-- Adding a covering index that includes role for faster lookups
CREATE INDEX IF NOT EXISTS "idx_workspace_members_workspace_user_role" 
ON "workspace_members"("workspaceId", "userId", "role");

-- Analyze tables to update query planner statistics
ANALYZE "org_positions";
ANALYZE "workspaces";
ANALYZE "users";
ANALYZE "workspace_members";
