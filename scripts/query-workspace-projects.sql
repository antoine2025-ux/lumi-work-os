-- =====================================================
-- SQL Queries to Find Project Information Within a Workspace
-- =====================================================
-- Can query by: Workspace ID, Workspace Name, or User Email
-- =====================================================

-- =====================================================
-- QUERY 1: Basic Projects List for a Workspace
-- =====================================================
-- Find by workspace ID:
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."startDate",
  p."endDate",
  p."isArchived",
  p.department,
  p.team,
  p."createdAt",
  p."updatedAt"
FROM projects p
WHERE p."workspaceId" = 'workspace-id-here'  -- Replace with actual workspace ID
ORDER BY p."createdAt" DESC;

-- Find by workspace name:
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."startDate",
  p."endDate",
  p."isArchived",
  p.department,
  p.team,
  p."createdAt",
  p."updatedAt",
  w.name as workspace_name
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
WHERE w.name = 'Workspace Name Here'  -- Replace with actual workspace name
ORDER BY p."createdAt" DESC;

-- Find by workspace slug:
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."startDate",
  p."endDate",
  p."isArchived",
  p.department,
  p.team,
  p."createdAt",
  p."updatedAt",
  w.slug as workspace_slug
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
WHERE w.slug = 'workspace-slug-here'  -- Replace with actual workspace slug
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 2: Projects with Task Counts
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."isArchived",
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'TODO' THEN t.id END) as todo_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS' THEN t.id END) as in_progress_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'SKIPPED' THEN t.id END) as skipped_tasks,
  p."createdAt",
  p."updatedAt"
FROM projects p
LEFT JOIN tasks t ON t."projectId" = p.id
WHERE p."workspaceId" = 'workspace-id-here'  -- Replace with actual workspace ID
GROUP BY p.id, p.name, p.description, p.status, p.priority, p."isArchived", p."createdAt", p."updatedAt"
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 3: Projects with Members and Assignees
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  u_created.email as created_by_email,
  u_created.name as created_by_name,
  u_owner.email as owner_email,
  u_owner.name as owner_name,
  COUNT(DISTINCT pm."userId") as member_count,
  COUNT(DISTINCT pa."userId") as assignee_count,
  COUNT(DISTINCT pw."userId") as watcher_count,
  STRING_AGG(DISTINCT u_member.email, ', ') as member_emails,
  STRING_AGG(DISTINCT u_assignee.email, ', ') as assignee_emails
FROM projects p
LEFT JOIN users u_created ON p."createdById" = u_created.id
LEFT JOIN users u_owner ON p."ownerId" = u_owner.id
LEFT JOIN project_members pm ON p.id = pm."projectId"
LEFT JOIN users u_member ON pm."userId" = u_member.id
LEFT JOIN project_assignees pa ON p.id = pa."projectId"
LEFT JOIN users u_assignee ON pa."userId" = u_assignee.id
LEFT JOIN project_watchers pw ON p.id = pw."projectId"
WHERE p."workspaceId" = 'workspace-id-here'  -- Replace with actual workspace ID
GROUP BY p.id, p.name, p.description, p.status, p.priority, 
         u_created.email, u_created.name, u_owner.email, u_owner.name
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 4: Detailed Project Information
-- =====================================================
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.description,
  p.status,
  p.priority,
  p."startDate",
  p."endDate",
  p.color,
  p."isArchived",
  p.department,
  p.team,
  p."dailySummaryEnabled",
  p."createdAt",
  p."updatedAt",
  -- Creator info
  u_created.name as creator_name,
  u_created.email as creator_email,
  -- Owner info
  u_owner.name as owner_name,
  u_owner.email as owner_email,
  -- Workspace info
  w.name as workspace_name,
  w.slug as workspace_slug,
  -- Counts
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT pm."userId") as member_count,
  COUNT(DISTINCT pa."userId") as assignee_count,
  COUNT(DISTINCT e.id) as epic_count,
  COUNT(DISTINCT m.id) as milestone_count,
  COUNT(DISTINCT wp.id) as wiki_page_count
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
LEFT JOIN users u_created ON p."createdById" = u_created.id
LEFT JOIN users u_owner ON p."ownerId" = u_owner.id
LEFT JOIN tasks t ON p.id = t."projectId"
LEFT JOIN project_members pm ON p.id = pm."projectId"
LEFT JOIN project_assignees pa ON p.id = pa."projectId"
LEFT JOIN epics e ON p.id = e."projectId"
LEFT JOIN milestones m ON p.id = m."projectId"
LEFT JOIN wiki_pages wp ON p."wikiPageId" = wp.id
WHERE p."workspaceId" = 'workspace-id-here'  -- Replace with actual workspace ID
GROUP BY p.id, p.name, p.description, p.status, p.priority, p."startDate", p."endDate",
         p.color, p."isArchived", p.department, p.team, p."dailySummaryEnabled",
         p."createdAt", p."updatedAt", u_created.name, u_created.email,
         u_owner.name, u_owner.email, w.name, w.slug
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 5: Projects by Status within Workspace
-- =====================================================
SELECT 
  p.status,
  COUNT(*) as project_count,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT pm."userId") as total_members
FROM projects p
LEFT JOIN tasks t ON p.id = t."projectId"
LEFT JOIN project_members pm ON p.id = pm."projectId"
WHERE p."workspaceId" = 'workspace-id-here'  -- Replace with actual workspace ID
GROUP BY p.status
ORDER BY project_count DESC;

-- =====================================================
-- QUERY 6: Active Projects with Recent Activity
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.status,
  p.priority,
  p."updatedAt" as last_updated,
  COUNT(DISTINCT t.id) as task_count,
  MAX(t."updatedAt") as latest_task_update
FROM projects p
LEFT JOIN tasks t ON p.id = t."projectId"
WHERE p."workspaceId" = 'workspace-id-here'  -- Replace with actual workspace ID
  AND p."isArchived" = false
GROUP BY p.id, p.name, p.status, p.priority, p."updatedAt"
ORDER BY COALESCE(MAX(t."updatedAt"), p."updatedAt") DESC
LIMIT 10;

-- =====================================================
-- QUERY 7: Projects with Tasks (Detailed View)
-- =====================================================
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.status as project_status,
  t.id as task_id,
  t.title as task_title,
  t.status as task_status,
  t.priority as task_priority,
  t."dueDate",
  u_assignee.name as task_assignee,
  u_assignee.email as task_assignee_email,
  t."createdAt" as task_created
FROM projects p
LEFT JOIN tasks t ON p.id = t."projectId"
LEFT JOIN users u_assignee ON t."assigneeId" = u_assignee.id
WHERE p."workspaceId" = 'workspace-id-here'  -- Replace with actual workspace ID
ORDER BY p.name, t."createdAt" DESC;

-- =====================================================
-- QUERY 8: Find Projects by Workspace Owner Email
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."isArchived",
  p."createdAt",
  w.name as workspace_name,
  w.slug as workspace_slug,
  u_owner.email as workspace_owner_email,
  u_owner.name as workspace_owner_name
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
JOIN users u_owner ON w."ownerId" = u_owner.id
WHERE u_owner.email = 'email@example.com'  -- Replace with actual email
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 9: Projects with Custom Fields
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.status,
  COUNT(DISTINCT cfd.id) as custom_field_count,
  STRING_AGG(DISTINCT cfd.key, ', ') as custom_field_keys
FROM projects p
LEFT JOIN custom_field_defs cfd ON p.id = cfd."projectId"
WHERE p."workspaceId" = 'workspace-id-here'  -- Replace with actual workspace ID
GROUP BY p.id, p.name, p.status
HAVING COUNT(DISTINCT cfd.id) > 0
ORDER BY p.name;

-- =====================================================
-- QUERY 10: Projects Summary by Workspace
-- =====================================================
-- This query finds all workspaces and their project counts
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.slug,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN p."isArchived" = false THEN p.id END) as active_projects,
  COUNT(DISTINCT CASE WHEN p."isArchived" = true THEN p.id END) as archived_projects,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT pm."userId") as total_project_members
FROM workspaces w
LEFT JOIN projects p ON w.id = p."workspaceId"
LEFT JOIN tasks t ON p.id = t."projectId"
LEFT JOIN project_members pm ON p.id = pm."projectId"
GROUP BY w.id, w.name, w.slug
ORDER BY total_projects DESC;

-- =====================================================
-- QUERY BY EMAIL ADDRESS
-- =====================================================

-- =====================================================
-- QUERY 11: All Projects for a User (by Email) - Basic List
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."startDate",
  p."endDate",
  p."isArchived",
  p."createdAt",
  p."updatedAt",
  w.name as workspace_name,
  w.slug as workspace_slug
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
JOIN workspace_members wm ON w.id = wm."workspaceId"
JOIN users u ON wm."userId" = u.id
WHERE u.email = 'email@example.com'  -- Replace with actual email
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 12: Projects with Task Counts by User Email
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."isArchived",
  w.name as workspace_name,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'TODO' THEN t.id END) as todo_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'IN_PROGRESS' THEN t.id END) as in_progress_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END) as completed_tasks,
  p."createdAt",
  p."updatedAt"
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
JOIN workspace_members wm ON w.id = wm."workspaceId"
JOIN users u ON wm."userId" = u.id
LEFT JOIN tasks t ON t."projectId" = p.id
WHERE u.email = 'email@example.com'  -- Replace with actual email
GROUP BY p.id, p.name, p.description, p.status, p.priority, p."isArchived", 
         w.name, p."createdAt", p."updatedAt"
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 13: Detailed Projects with All Info by User Email
-- =====================================================
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.description,
  p.status,
  p.priority,
  p."startDate",
  p."endDate",
  p.color,
  p."isArchived",
  p.department,
  p.team,
  p."createdAt",
  p."updatedAt",
  -- Workspace info
  w.id as workspace_id,
  w.name as workspace_name,
  w.slug as workspace_slug,
  -- Creator info
  u_created.name as creator_name,
  u_created.email as creator_email,
  -- Owner info
  u_owner.name as owner_name,
  u_owner.email as owner_email,
  -- User's role in workspace
  wm.role as user_workspace_role,
  -- Counts
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT pm."userId") as member_count,
  COUNT(DISTINCT pa."userId") as assignee_count,
  COUNT(DISTINCT e.id) as epic_count,
  COUNT(DISTINCT m.id) as milestone_count
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
JOIN workspace_members wm ON w.id = wm."workspaceId"
JOIN users u ON wm."userId" = u.id
LEFT JOIN users u_created ON p."createdById" = u_created.id
LEFT JOIN users u_owner ON p."ownerId" = u_owner.id
LEFT JOIN tasks t ON p.id = t."projectId"
LEFT JOIN project_members pm ON p.id = pm."projectId"
LEFT JOIN project_assignees pa ON p.id = pa."projectId"
LEFT JOIN epics e ON p.id = e."projectId"
LEFT JOIN milestones m ON p.id = m."projectId"
WHERE u.email = 'email@example.com'  -- Replace with actual email
GROUP BY p.id, p.name, p.description, p.status, p.priority, p."startDate", p."endDate",
         p.color, p."isArchived", p.department, p.team, p."createdAt", p."updatedAt",
         w.id, w.name, w.slug, u_created.name, u_created.email,
         u_owner.name, u_owner.email, wm.role
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 14: Projects Grouped by Workspace for a User
-- =====================================================
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.slug as workspace_slug,
  COUNT(DISTINCT p.id) as total_projects,
  COUNT(DISTINCT CASE WHEN p."isArchived" = false THEN p.id END) as active_projects,
  COUNT(DISTINCT CASE WHEN p."isArchived" = true THEN p.id END) as archived_projects,
  COUNT(DISTINCT t.id) as total_tasks,
  wm.role as user_role_in_workspace,
  w."createdAt" as workspace_created
FROM workspaces w
JOIN workspace_members wm ON w.id = wm."workspaceId"
JOIN users u ON wm."userId" = u.id
LEFT JOIN projects p ON w.id = p."workspaceId"
LEFT JOIN tasks t ON p.id = t."projectId"
WHERE u.email = 'email@example.com'  -- Replace with actual email
GROUP BY w.id, w.name, w.slug, wm.role, w."createdAt"
ORDER BY total_projects DESC, workspace_created DESC;

-- =====================================================
-- QUERY 15: Projects with Tasks for a User by Email
-- =====================================================
SELECT 
  w.name as workspace_name,
  p.id as project_id,
  p.name as project_name,
  p.status as project_status,
  t.id as task_id,
  t.title as task_title,
  t.status as task_status,
  t.priority as task_priority,
  t."dueDate",
  u_assignee.name as task_assignee_name,
  u_assignee.email as task_assignee_email,
  t."createdAt" as task_created,
  t."updatedAt" as task_updated
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
JOIN workspace_members wm ON w.id = wm."workspaceId"
JOIN users u ON wm."userId" = u.id
LEFT JOIN tasks t ON p.id = t."projectId"
LEFT JOIN users u_assignee ON t."assigneeId" = u_assignee.id
WHERE u.email = 'email@example.com'  -- Replace with actual email
ORDER BY w.name, p.name, t."createdAt" DESC;

-- =====================================================
-- QUERY 16: Projects Where User is Owner or Creator
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."isArchived",
  w.name as workspace_name,
  CASE 
    WHEN p."ownerId" = u.id THEN 'Owner'
    WHEN p."createdById" = u.id THEN 'Creator'
    ELSE 'Member'
  END as user_role_in_project,
  COUNT(DISTINCT t.id) as task_count,
  p."createdAt"
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
JOIN workspace_members wm ON w.id = wm."workspaceId"
JOIN users u ON wm."userId" = u.id
LEFT JOIN tasks t ON p.id = t."projectId"
WHERE u.email = 'email@example.com'  -- Replace with actual email
  AND (p."ownerId" = u.id OR p."createdById" = u.id)
GROUP BY p.id, p.name, p.description, p.status, p.priority, p."isArchived",
         w.name, p."ownerId", p."createdById", u.id, p."createdAt"
ORDER BY p."createdAt" DESC;

-- =====================================================
-- QUERY 17: Active Projects Only for a User
-- =====================================================
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.priority,
  p."startDate",
  p."endDate",
  w.name as workspace_name,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT CASE WHEN t.status != 'COMPLETED' THEN t.id END) as active_tasks,
  p."updatedAt" as last_updated
FROM projects p
JOIN workspaces w ON p."workspaceId" = w.id
JOIN workspace_members wm ON w.id = wm."workspaceId"
JOIN users u ON wm."userId" = u.id
LEFT JOIN tasks t ON p.id = t."projectId"
WHERE u.email = 'email@example.com'  -- Replace with actual email
  AND p."isArchived" = false
  AND p.status != 'ARCHIVED'
GROUP BY p.id, p.name, p.description, p.status, p.priority, 
         p."startDate", p."endDate", w.name, p."updatedAt"
ORDER BY p."updatedAt" DESC;

