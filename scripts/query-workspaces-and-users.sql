-- Query to see all workspaces and their users
-- Shows workspace details, member count, and user list with roles

SELECT 
  w.id AS workspace_id,
  w.name AS workspace_name,
  w.slug AS workspace_slug,
  w."createdAt" AS workspace_created,
  COUNT(DISTINCT wm."userId") AS member_count,
  COUNT(DISTINCT CASE WHEN wm.role = 'OWNER' THEN wm."userId" END) AS owner_count,
  COUNT(DISTINCT CASE WHEN wm.role = 'ADMIN' THEN wm."userId" END) AS admin_count,
  COUNT(DISTINCT CASE WHEN wm.role = 'MEMBER' THEN wm."userId" END) AS member_role_count,
  COUNT(DISTINCT CASE WHEN wm.role = 'VIEWER' THEN wm."userId" END) AS viewer_count,
  STRING_AGG(
    DISTINCT u.email || ' (' || wm.role || ')',
    ', '
    ORDER BY u.email || ' (' || wm.role || ')'
  ) AS members
FROM "workspaces" w
LEFT JOIN "workspace_members" wm ON wm."workspaceId" = w.id
LEFT JOIN "users" u ON u.id = wm."userId"
GROUP BY w.id, w.name, w.slug, w."createdAt"
ORDER BY w."createdAt" DESC;

-- Alternative: Detailed view with one row per user
-- Uncomment to see individual user details:

/*
SELECT 
  w.id AS workspace_id,
  w.name AS workspace_name,
  w.slug AS workspace_slug,
  u.id AS user_id,
  u.email AS user_email,
  u.name AS user_name,
  wm.role AS member_role,
  wm."joinedAt" AS joined_at,
  w."createdAt" AS workspace_created
FROM "workspaces" w
INNER JOIN "workspace_members" wm ON wm."workspaceId" = w.id
INNER JOIN "users" u ON u.id = wm."userId"
ORDER BY w.name, wm.role, u.email;
*/
