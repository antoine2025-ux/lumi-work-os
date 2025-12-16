-- Force Delete User and Workspace - Direct SQL for Supabase
-- WARNING: This will permanently delete all data. Cannot be undone!
--
-- INSTRUCTIONS:
-- 1. Replace 'YOUR_USER_ID' with the actual user ID
-- 2. Replace 'YOUR_WORKSPACE_ID' with the actual workspace ID
-- 3. Review carefully before executing
-- 4. Consider backing up first

-- ============================================
-- STEP 1: Clear foreign key references that don't cascade
-- ============================================

-- Clear user references in tasks
UPDATE tasks 
SET assignee_id = NULL 
WHERE assignee_id = 'YOUR_USER_ID';

UPDATE tasks 
SET created_by_id = NULL 
WHERE created_by_id = 'YOUR_USER_ID';

-- Clear user references in subtasks
UPDATE subtasks 
SET assignee_id = NULL 
WHERE assignee_id = 'YOUR_USER_ID';

-- Clear user references in org positions
UPDATE org_positions 
SET user_id = NULL 
WHERE user_id = 'YOUR_USER_ID';

-- Clear user references in projects
UPDATE projects 
SET owner_id = NULL 
WHERE owner_id = 'YOUR_USER_ID';

UPDATE projects 
SET created_by_id = NULL 
WHERE created_by_id = 'YOUR_USER_ID';

-- ============================================
-- STEP 2: Delete Workspace (cascades to related data)
-- ============================================
DELETE FROM workspaces 
WHERE id = 'YOUR_WORKSPACE_ID';

-- ============================================
-- STEP 3: Delete User (cascades to related data)
-- ============================================
DELETE FROM users 
WHERE id = 'YOUR_USER_ID';

-- ============================================
-- VERIFICATION (optional - run after deletion)
-- ============================================
-- SELECT COUNT(*) FROM workspaces WHERE id = 'YOUR_WORKSPACE_ID';
-- SELECT COUNT(*) FROM users WHERE id = 'YOUR_USER_ID';
