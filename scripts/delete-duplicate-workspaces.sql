-- =====================================================
-- Script to Safely Delete Duplicate Workspaces
-- =====================================================
-- WARNING: This will permanently delete workspaces and ALL associated data
-- Projects, Tasks, Wiki Pages, Chat Sessions, etc. will all be deleted
-- =====================================================

-- STEP 1: First, identify which workspaces to keep vs delete
-- Keep the MOST RECENT workspace (or the one with most activity)
-- Delete older/duplicate workspaces

-- View users with multiple workspaces
SELECT 
  u.email,
  u.name as user_name,
  w.id as workspace_id,
  w.name as workspace_name,
  w.slug,
  w."createdAt",
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT wp.id) as wiki_page_count,
  CASE 
    WHEN w.slug ~ '^[0-9]+$' THEN 'Possible test workspace'
    WHEN LENGTH(w.name) < 5 THEN 'Possible test workspace'
    ELSE 'Normal workspace'
  END as workspace_type
FROM users u
JOIN workspace_members wm ON u.id = wm."userId"
JOIN workspaces w ON wm."workspaceId" = w.id
LEFT JOIN projects p ON p."workspaceId" = w.id
LEFT JOIN tasks t ON t."workspaceId" = w.id
LEFT JOIN wiki_pages wp ON wp."workspaceId" = w.id
WHERE wm.role = 'OWNER'
  AND u.email IN (
    SELECT u2.email
    FROM users u2
    JOIN workspace_members wm2 ON u2.id = wm2."userId"
    WHERE wm2.role = 'OWNER'
    GROUP BY u2.email
    HAVING COUNT(DISTINCT wm2."workspaceId") > 1
  )
GROUP BY u.email, u.name, w.id, w.name, w.slug, w."createdAt"
ORDER BY u.email, w."createdAt" DESC;

-- STEP 2: For a specific user, see all their workspaces in detail
-- Replace 'email@example.com' with the actual email
/*
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.slug,
  w."createdAt",
  w."updatedAt",
  COUNT(DISTINCT wm2.id) FILTER (WHERE wm2.id IS NOT NULL) as member_count,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT wp.id) as wiki_page_count,
  COUNT(DISTINCT cs.id) as chat_session_count
FROM users u
JOIN workspace_members wm ON u.id = wm."userId"
JOIN workspaces w ON wm."workspaceId" = w.id
LEFT JOIN workspace_members wm2 ON w.id = wm2."workspaceId"
LEFT JOIN projects p ON p."workspaceId" = w.id
LEFT JOIN tasks t ON t."workspaceId" = w.id
LEFT JOIN wiki_pages wp ON wp."workspaceId" = w.id
LEFT JOIN chat_sessions cs ON cs."workspaceId" = w.id
WHERE u.email = 'email@example.com'
  AND wm.role = 'OWNER'
GROUP BY w.id, w.name, w.slug, w."createdAt", w."updatedAt"
ORDER BY w."createdAt" DESC;
*/

-- STEP 3: Backup data before deleting (if needed)
-- Export workspace data to CSV before deletion
-- This is a manual step - use Supabase dashboard or pg_dump

-- STEP 4: Delete a specific workspace by ID
-- REPLACE 'workspace-id-here' with the actual workspace ID you want to delete
-- UNCOMMENT the DELETE statement when ready

/*
BEGIN;

-- Delete workspace (cascading will handle related data)
DELETE FROM workspaces 
WHERE id = 'workspace-id-here';

COMMIT;
*/

-- STEP 5: Delete multiple duplicate workspaces for a specific user
-- This keeps the MOST RECENT workspace and deletes older ones
-- REPLACE 'email@example.com' with actual email
-- UNCOMMENT when ready

/*
BEGIN;

-- Get workspace IDs to delete (all except the most recent)
WITH user_workspaces AS (
  SELECT 
    w.id,
    w."createdAt",
    ROW_NUMBER() OVER (PARTITION BY u.email ORDER BY w."createdAt" DESC) as rn
  FROM users u
  JOIN workspace_members wm ON u.id = wm."userId"
  JOIN workspaces w ON wm."workspaceId" = w.id
  WHERE u.email = 'email@example.com'
    AND wm.role = 'OWNER'
)
DELETE FROM workspaces
WHERE id IN (
  SELECT id FROM user_workspaces WHERE rn > 1
);

COMMIT;
*/

-- STEP 6: Verify deletion
-- Check remaining workspaces for the user
/*
SELECT 
  u.email,
  w.id,
  w.name,
  w.slug,
  w."createdAt"
FROM users u
JOIN workspace_members wm ON u.id = wm."userId"
JOIN workspaces w ON wm."workspaceId" = w.id
WHERE u.email = 'email@example.com'
ORDER BY w."createdAt" DESC;
*/



