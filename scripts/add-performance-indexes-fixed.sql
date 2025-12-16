-- Performance Optimization: Database Indexes
-- Run this in Supabase SQL Editor for instant query performance
-- 
-- IMPORTANT: Run scripts/check-column-names.sql FIRST to verify column names
-- Then use the appropriate version below based on your actual column names

-- ============================================
-- VERSION A: If columns are camelCase (quoted) - Prisma default
-- ============================================

-- Workspace members (most queried table - used in every auth check)
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
ON workspace_members("userId", "workspaceId");

-- Wiki pages - workspace and published filter (most common query)
CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_published 
ON wiki_pages("workspaceId", "isPublished") 
WHERE "isPublished" = true;

-- Wiki pages - workspace type filtering
CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_type 
ON wiki_pages("workspaceId", "workspace_type");

-- Wiki pages - recent pages sorting
CREATE INDEX IF NOT EXISTS idx_wiki_pages_updated_at 
ON wiki_pages("updatedAt" DESC);

-- Projects - workspace and status
CREATE INDEX IF NOT EXISTS idx_projects_workspace_status 
ON projects("workspaceId", "status");

-- Projects - recent projects sorting
CREATE INDEX IF NOT EXISTS idx_projects_updated_at 
ON projects("updatedAt" DESC);

-- Chat sessions - drafts query
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_user_draft 
ON chat_sessions("workspaceId", "userId", "phase") 
WHERE "draftTitle" IS NOT NULL AND "draftBody" IS NOT NULL;

-- Chat sessions - updated at for sorting
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at 
ON chat_sessions("updatedAt" DESC);

-- Wiki workspaces - workspace and type (snake_case, no quotes)
CREATE INDEX IF NOT EXISTS idx_wiki_workspaces_workspace_type 
ON wiki_workspaces(workspace_id, type);

-- Tasks - workspace and status
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status 
ON tasks("workspaceId", "status");

-- Tasks - project and status
CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
ON tasks("projectId", "status") 
WHERE "projectId" IS NOT NULL;

-- Wiki favorites - user and workspace
CREATE INDEX IF NOT EXISTS idx_wiki_favorites_user_workspace 
ON wiki_favorites("userId", "workspaceId");

-- Wiki comments - page and created at
CREATE INDEX IF NOT EXISTS idx_wiki_comments_page_created 
ON wiki_comments("pageId", "createdAt" DESC);

-- ============================================
-- VERSION B: If columns are lowercase (unquoted) - Alternative
-- Uncomment this section if Version A doesn't work
-- ============================================

/*
-- Workspace members
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace 
ON workspace_members(userid, workspaceid);

-- Wiki pages
CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_published 
ON wiki_pages(workspaceid, ispublished) 
WHERE ispublished = true;

CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_type 
ON wiki_pages(workspaceid, workspace_type);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_updated_at 
ON wiki_pages(updatedat DESC);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_workspace_status 
ON projects(workspaceid, status);

CREATE INDEX IF NOT EXISTS idx_projects_updated_at 
ON projects(updatedat DESC);

-- Chat sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_workspace_user_draft 
ON chat_sessions(workspaceid, userid, phase) 
WHERE drafttitle IS NOT NULL AND draftbody IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at 
ON chat_sessions(updatedat DESC);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status 
ON tasks(workspaceid, status);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
ON tasks(projectid, status) 
WHERE projectid IS NOT NULL;

-- Wiki favorites
CREATE INDEX IF NOT EXISTS idx_wiki_favorites_user_workspace 
ON wiki_favorites(userid, workspaceid);

-- Wiki comments
CREATE INDEX IF NOT EXISTS idx_wiki_comments_page_created 
ON wiki_comments(pageid, createdat DESC);
*/

-- ============================================
-- VERIFY INDEXES
-- ============================================

-- Check all indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- ANALYZE TABLES (Update statistics for query planner)
-- ============================================

ANALYZE workspace_members;
ANALYZE wiki_pages;
ANALYZE projects;
ANALYZE chat_sessions;
ANALYZE wiki_workspaces;
ANALYZE tasks;



