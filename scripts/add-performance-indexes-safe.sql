-- Performance Optimization: Database Indexes (SAFE VERSION)
-- This version uses a different approach - creating indexes one at a time
-- with error handling. Run this if the main script fails.

-- ============================================
-- METHOD: Create indexes individually to see which ones fail
-- ============================================

-- Try workspace_members with different column name formats
-- Uncomment the one that works:

-- Option 1: Quoted camelCase (Prisma default)
-- CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
-- ON workspace_members("userId", "workspaceId");

-- Option 2: Lowercase (PostgreSQL default)
-- CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
-- ON workspace_members(userid, workspaceid);

-- Option 3: Try with table name quoted too
-- CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
-- ON "workspace_members"("userId", "workspaceId");

-- ============================================
-- ALTERNATIVE: Use Prisma to create indexes instead
-- ============================================
-- Instead of SQL, you can add indexes directly in prisma/schema.prisma:
-- 
-- model WorkspaceMember {
--   ...
--   @@index([userId, workspaceId], map: "idx_workspace_members_user_workspace")
-- }
--
-- Then run: npx prisma db push
-- This will create indexes using Prisma's column name handling



