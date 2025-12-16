-- Force Delete User and Workspace Script for Supabase
-- WARNING: This script will permanently delete all data associated with the user and workspace
-- Use with extreme caution! This operation cannot be undone.
--
-- Usage:
-- 1. Replace 'USER_ID_HERE' with the actual user ID
-- 2. Replace 'WORKSPACE_ID_HERE' with the actual workspace ID
-- 3. Review the script carefully before executing
-- 4. Consider backing up your database first

-- ============================================
-- CONFIGURATION: Set these variables
-- ============================================
DO $$
DECLARE
    target_user_id TEXT := 'USER_ID_HERE';  -- Replace with actual user ID
    target_workspace_id TEXT := 'WORKSPACE_ID_HERE';  -- Replace with actual workspace ID
BEGIN
    -- ============================================
    -- STEP 1: Delete all workspace-related data
    -- ============================================
    
    -- Delete workspace invites (cascade should handle this, but being explicit)
    DELETE FROM workspace_invites WHERE workspace_id = target_workspace_id;
    
    -- Delete workspace members (cascade should handle this, but being explicit)
    DELETE FROM workspace_members WHERE workspace_id = target_workspace_id;
    
    -- Delete context items and related data
    DELETE FROM context_summaries WHERE workspace_id = target_workspace_id;
    DELETE FROM context_embeddings WHERE workspace_id = target_workspace_id;
    DELETE FROM context_items WHERE workspace_id = target_workspace_id;
    
    -- Delete wiki-related data
    DELETE FROM wiki_workspaces WHERE workspace_id = target_workspace_id;
    DELETE FROM wiki_chunks WHERE workspace_id = target_workspace_id;
    -- Wiki pages will cascade delete related data (comments, versions, etc.)
    DELETE FROM wiki_pages WHERE workspace_id = target_workspace_id;
    
    -- Delete workflow data
    DELETE FROM workflow_assignments WHERE instance_id IN (
        SELECT id FROM workflow_instances WHERE workspace_id = target_workspace_id
    );
    DELETE FROM workflow_instances WHERE workspace_id = target_workspace_id;
    DELETE FROM workflows WHERE workspace_id = target_workspace_id;
    
    -- Delete chat sessions and messages
    DELETE FROM chat_messages WHERE session_id IN (
        SELECT id FROM chat_sessions WHERE workspace_id = target_workspace_id
    );
    DELETE FROM chat_sessions WHERE workspace_id = target_workspace_id;
    
    -- Delete project-related data (tasks cascade from projects)
    DELETE FROM custom_field_vals WHERE task_id IN (
        SELECT t.id FROM tasks t
        INNER JOIN projects p ON t.project_id = p.id
        WHERE p.workspace_id = target_workspace_id
    );
    DELETE FROM task_history WHERE task_id IN (
        SELECT t.id FROM tasks t
        INNER JOIN projects p ON t.project_id = p.id
        WHERE p.workspace_id = target_workspace_id
    );
    DELETE FROM task_comments WHERE task_id IN (
        SELECT t.id FROM tasks t
        INNER JOIN projects p ON t.project_id = p.id
        WHERE p.workspace_id = target_workspace_id
    );
    DELETE FROM subtasks WHERE task_id IN (
        SELECT t.id FROM tasks t
        INNER JOIN projects p ON t.project_id = p.id
        WHERE p.workspace_id = target_workspace_id
    );
    DELETE FROM tasks WHERE workspace_id = target_workspace_id;
    DELETE FROM epics WHERE workspace_id = target_workspace_id;
    DELETE FROM milestones WHERE workspace_id = target_workspace_id;
    DELETE FROM custom_field_defs WHERE project_id IN (
        SELECT id FROM projects WHERE workspace_id = target_workspace_id
    );
    DELETE FROM project_documentation WHERE project_id IN (
        SELECT id FROM projects WHERE workspace_id = target_workspace_id
    );
    DELETE FROM project_daily_summaries WHERE project_id IN (
        SELECT id FROM projects WHERE workspace_id = target_workspace_id
    );
    DELETE FROM project_assignees WHERE project_id IN (
        SELECT id FROM projects WHERE workspace_id = target_workspace_id
    );
    DELETE FROM project_watchers WHERE project_id IN (
        SELECT id FROM projects WHERE workspace_id = target_workspace_id
    );
    DELETE FROM project_members WHERE project_id IN (
        SELECT id FROM projects WHERE workspace_id = target_workspace_id
    );
    DELETE FROM projects WHERE workspace_id = target_workspace_id;
    
    -- Delete org structure data
    DELETE FROM org_audit_log WHERE workspace_id = target_workspace_id;
    -- Org positions cascade from teams/departments
    DELETE FROM role_cards WHERE workspace_id = target_workspace_id;
    DELETE FROM org_positions WHERE workspace_id = target_workspace_id;
    DELETE FROM org_teams WHERE workspace_id = target_workspace_id;
    DELETE FROM org_departments WHERE workspace_id = target_workspace_id;
    
    -- Delete onboarding data
    DELETE FROM onboarding_task_assignments WHERE plan_id IN (
        SELECT id FROM onboarding_plans WHERE workspace_id = target_workspace_id
    );
    DELETE FROM onboarding_plans WHERE workspace_id = target_workspace_id;
    DELETE FROM onboarding_tasks WHERE template_id IN (
        SELECT id FROM onboarding_templates WHERE workspace_id = target_workspace_id
    );
    DELETE FROM onboarding_templates WHERE workspace_id = target_workspace_id;
    
    -- Delete templates
    DELETE FROM task_template_items WHERE template_id IN (
        SELECT id FROM task_templates WHERE workspace_id = target_workspace_id
    );
    DELETE FROM task_templates WHERE workspace_id = target_workspace_id;
    DELETE FROM project_templates WHERE workspace_id = target_workspace_id;
    
    -- Delete integrations and migrations
    DELETE FROM integrations WHERE workspace_id = target_workspace_id;
    DELETE FROM migrations WHERE workspace_id = target_workspace_id;
    DELETE FROM feature_flags WHERE workspace_id = target_workspace_id;
    
    -- Finally delete the workspace (this should cascade remaining relationships)
    DELETE FROM workspaces WHERE id = target_workspace_id;
    
    -- ============================================
    -- STEP 2: Delete all user-related data
    -- ============================================
    
    -- Delete user's workspace invites (where user created them)
    DELETE FROM workspace_invites WHERE created_by_user_id = target_user_id;
    
    -- Delete user's workspace memberships
    DELETE FROM workspace_members WHERE user_id = target_user_id;
    
    -- Delete user's activities
    DELETE FROM activities WHERE actor_id = target_user_id;
    
    -- Delete user's chat sessions (messages cascade)
    DELETE FROM chat_sessions WHERE user_id = target_user_id;
    
    -- Delete user's wiki interactions
    DELETE FROM wiki_ai_interactions WHERE user_id = target_user_id;
    DELETE FROM wiki_favorites WHERE user_id = target_user_id;
    DELETE FROM wiki_comments WHERE user_id = target_user_id;
    DELETE FROM wiki_page_permissions WHERE user_id = target_user_id;
    DELETE FROM wiki_page_views WHERE user_id = target_user_id;
    DELETE FROM wiki_workspaces WHERE created_by_id = target_user_id;
    -- Wiki pages created by user (will cascade related data)
    DELETE FROM wiki_pages WHERE created_by_id = target_user_id;
    DELETE FROM wiki_versions WHERE created_by_id = target_user_id;
    
    -- Delete user's workflow data
    DELETE FROM workflow_assignments WHERE user_id = target_user_id;
    DELETE FROM workflow_instances WHERE user_id = target_user_id;
    
    -- Delete user's project-related data
    DELETE FROM project_assignees WHERE user_id = target_user_id;
    DELETE FROM project_members WHERE user_id = target_user_id;
    DELETE FROM project_watchers WHERE user_id = target_user_id;
    -- Projects owned/created by user
    DELETE FROM projects WHERE owner_id = target_user_id OR created_by_id = target_user_id;
    
    -- Delete user's task-related data
    DELETE FROM task_comments WHERE user_id = target_user_id;
    DELETE FROM task_history WHERE actor_id = target_user_id;
    -- Tasks assigned/created by user (set to null or delete based on cascade)
    UPDATE tasks SET assignee_id = NULL WHERE assignee_id = target_user_id;
    UPDATE tasks SET created_by_id = NULL WHERE created_by_id = target_user_id;
    UPDATE subtasks SET assignee_id = NULL WHERE assignee_id = target_user_id;
    
    -- Delete user's org-related data
    DELETE FROM org_audit_log WHERE user_id = target_user_id;
    DELETE FROM org_positions WHERE user_id = target_user_id;
    DELETE FROM role_cards WHERE created_by_id = target_user_id;
    
    -- Delete user's onboarding data
    DELETE FROM onboarding_plans WHERE user_id = target_user_id;
    DELETE FROM onboarding_tasks WHERE id IN (
        SELECT task_id FROM onboarding_task_assignments ota
        INNER JOIN onboarding_plans op ON ota.plan_id = op.id
        WHERE op.user_id = target_user_id
    );
    
    -- Delete user's templates
    DELETE FROM task_templates WHERE created_by_id = target_user_id;
    DELETE FROM project_templates WHERE created_by_id = target_user_id;
    
    -- Delete user's sessions and accounts (NextAuth)
    DELETE FROM sessions WHERE user_id = target_user_id;
    DELETE FROM accounts WHERE user_id = target_user_id;
    
    -- Finally delete the user (this should cascade any remaining relationships)
    DELETE FROM users WHERE id = target_user_id;
    
    RAISE NOTICE 'Successfully deleted user % and workspace %', target_user_id, target_workspace_id;
END $$;

-- ============================================
-- VERIFICATION QUERIES (Run these after deletion to verify)
-- ============================================
-- Uncomment and run these to verify deletion:

-- SELECT COUNT(*) as remaining_workspaces FROM workspaces WHERE id = 'WORKSPACE_ID_HERE';
-- SELECT COUNT(*) as remaining_users FROM users WHERE id = 'USER_ID_HERE';
-- SELECT COUNT(*) as remaining_memberships FROM workspace_members WHERE workspace_id = 'WORKSPACE_ID_HERE' OR user_id = 'USER_ID_HERE';
-- SELECT COUNT(*) as remaining_projects FROM projects WHERE workspace_id = 'WORKSPACE_ID_HERE' OR created_by_id = 'USER_ID_HERE';
-- SELECT COUNT(*) as remaining_tasks FROM tasks WHERE workspace_id = 'WORKSPACE_ID_HERE' OR created_by_id = 'USER_ID_HERE' OR assignee_id = 'USER_ID_HERE';
