-- Add performance indexes for frequently queried fields
-- This migration adds indexes to improve query performance

-- Index for tasks by project and status (most common query)
CREATE INDEX IF NOT EXISTS "idx_tasks_project_status" ON "tasks"("projectId", "status");

-- Index for tasks by workspace and assignee
CREATE INDEX IF NOT EXISTS "idx_tasks_workspace_assignee" ON "tasks"("workspaceId", "assigneeId");

-- Index for tasks by due date (for overdue queries)
CREATE INDEX IF NOT EXISTS "idx_tasks_due_date" ON "tasks"("dueDate") WHERE "dueDate" IS NOT NULL;

-- Index for wiki pages by workspace and updated date
CREATE INDEX IF NOT EXISTS "idx_wiki_pages_workspace_updated" ON "wiki_pages"("workspaceId", "updatedAt");

-- Index for wiki pages by tags (for tag-based searches)
CREATE INDEX IF NOT EXISTS "idx_wiki_pages_tags" ON "wiki_pages" USING GIN("tags");

-- Index for projects by workspace and status
CREATE INDEX IF NOT EXISTS "idx_projects_workspace_status" ON "projects"("workspaceId", "status");

-- Index for chat sessions by user and workspace
CREATE INDEX IF NOT EXISTS "idx_chat_sessions_user_workspace" ON "chat_sessions"("userId", "workspaceId");

-- Index for chat messages by session and created date
CREATE INDEX IF NOT EXISTS "idx_chat_messages_session_created" ON "chat_messages"("sessionId", "createdAt");

-- Index for workspace members by user
CREATE INDEX IF NOT EXISTS "idx_workspace_members_user" ON "workspace_members"("userId");

-- Index for project members by user
CREATE INDEX IF NOT EXISTS "idx_project_members_user" ON "project_members"("userId");

-- Index for activities by actor and entity
CREATE INDEX IF NOT EXISTS "idx_activities_actor_entity" ON "activities"("actorId", "entity", "entityId");

-- Index for activities by created date (for recent activity queries)
CREATE INDEX IF NOT EXISTS "idx_activities_created" ON "activities"("createdAt" DESC);

-- Index for onboarding plans by employee and status
CREATE INDEX IF NOT EXISTS "idx_onboarding_plans_employee_status" ON "onboarding_plans"("employeeId", "status");

-- Index for task templates by workspace and category
CREATE INDEX IF NOT EXISTS "idx_task_templates_workspace_category" ON "task_templates"("workspaceId", "category");

-- Index for feature flags by workspace and key
CREATE INDEX IF NOT EXISTS "idx_feature_flags_workspace_key" ON "feature_flags"("workspaceId", "key");

-- Index for wiki page permissions by page and user
CREATE INDEX IF NOT EXISTS "idx_wiki_page_permissions_page_user" ON "wiki_page_permissions"("pageId", "userId");

-- Index for wiki versions by page and version
CREATE INDEX IF NOT EXISTS "idx_wiki_versions_page_version" ON "wiki_versions"("pageId", "version");

-- Index for subtasks by task and order
CREATE INDEX IF NOT EXISTS "idx_subtasks_task_order" ON "subtasks"("taskId", "order");

-- Index for task comments by task and created date
CREATE INDEX IF NOT EXISTS "idx_task_comments_task_created" ON "task_comments"("taskId", "createdAt" DESC);

-- Index for wiki comments by page and created date
CREATE INDEX IF NOT EXISTS "idx_wiki_comments_page_created" ON "wiki_comments"("pageId", "createdAt" DESC);

-- Index for workflow instances by workspace and status
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_workspace_status" ON "workflow_instances"("workspaceId", "status");

-- Index for integrations by workspace and type
CREATE INDEX IF NOT EXISTS "idx_integrations_workspace_type" ON "integrations"("workspaceId", "type");

-- Index for migrations by workspace and status
CREATE INDEX IF NOT EXISTS "idx_migrations_workspace_status" ON "migrations"("workspaceId", "status");



