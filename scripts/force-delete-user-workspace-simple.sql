-- Force Delete User and Workspace Script for Supabase (Simplified Version)
-- This version relies on database cascade deletes where possible
-- WARNING: This will permanently delete all data. Cannot be undone!
--
-- Usage:
-- Replace 'USER_ID_HERE' and 'WORKSPACE_ID_HERE' with actual IDs before running

-- ============================================
-- CONFIGURATION
-- ============================================
DO $$
DECLARE
    target_user_id TEXT := 'USER_ID_HERE';        -- Replace with actual user ID
    target_workspace_id TEXT := 'WORKSPACE_ID_HERE';  -- Replace with actual workspace ID
BEGIN
    
    -- ============================================
    -- Delete Workspace (most relationships cascade automatically)
    -- ============================================
    -- The workspace deletion will cascade to:
    -- - workspace_members, workspace_invites, projects, tasks, wiki_pages, 
    --   org_positions, workflows, chat_sessions, etc.
    DELETE FROM workspaces WHERE id = target_workspace_id;
    
    -- ============================================
    -- Delete User (most relationships cascade automatically)
    -- ============================================
    -- The user deletion will cascade to:
    -- - accounts, sessions, workspace_members, activities, etc.
    -- 
    -- Note: Some relationships need manual cleanup first:
    
    -- Clear foreign key references that don't cascade
    UPDATE tasks SET assignee_id = NULL WHERE assignee_id = target_user_id;
    UPDATE tasks SET created_by_id = NULL WHERE created_by_id = target_user_id;
    UPDATE subtasks SET assignee_id = NULL WHERE assignee_id = target_user_id;
    UPDATE org_positions SET user_id = NULL WHERE user_id = target_user_id;
    UPDATE projects SET owner_id = NULL WHERE owner_id = target_user_id;
    UPDATE projects SET created_by_id = NULL WHERE created_by_id = target_user_id;
    
    -- Now delete the user (cascades to accounts, sessions, workspace_members, etc.)
    DELETE FROM users WHERE id = target_user_id;
    
    RAISE NOTICE 'Successfully deleted user % and workspace %', target_user_id, target_workspace_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error during deletion: %', SQLERRM;
END $$;
