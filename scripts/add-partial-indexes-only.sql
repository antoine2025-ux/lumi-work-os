-- Partial Indexes Only (Prisma can't create indexes with WHERE clauses)
-- Run this AFTER running: npx prisma db push
-- These indexes require WHERE clauses which Prisma doesn't support

-- Wiki pages - published filter (partial index for better performance)
CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_published_partial 
ON wiki_pages(workspaceId, isPublished) 
WHERE isPublished = true;

-- Chat sessions - drafts only (partial index)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_drafts_partial 
ON chat_sessions(workspaceId, userId, phase) 
WHERE draftTitle IS NOT NULL AND draftBody IS NOT NULL;

-- Tasks - with project (partial index for tasks that have projects)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status_partial 
ON tasks(projectId, status) 
WHERE projectId IS NOT NULL;

-- Note: If you get column errors, the columns might be lowercase.
-- Try uncommenting these versions instead:

/*
-- Lowercase version (if quoted camelCase doesn't work)
CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_published_partial 
ON wiki_pages(workspaceid, ispublished) 
WHERE ispublished = true;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_drafts_partial 
ON chat_sessions(workspaceid, userid, phase) 
WHERE drafttitle IS NOT NULL AND draftbody IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project_status_partial 
ON tasks(projectid, status) 
WHERE projectid IS NOT NULL;
*/



