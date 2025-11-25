-- User Login Search Query for Supabase Database
-- WORKING VERSION - Returns all users by default, with optional search filters

-- ============================================================================
-- BASIC SEARCH: Returns all users with login information (no filters)
-- ============================================================================
SELECT 
  u.id,
  u.email,
  u.name,
  u."createdAt" as account_created,
  u."emailVerified" as email_verified,
  COUNT(DISTINCT s.id) as total_sessions,
  MAX(s.expires) as last_session_expires,
  MAX(s.expires) - INTERVAL '30 days' as estimated_last_login,
  CASE 
    WHEN MAX(s.expires) IS NULL THEN 'Never'
    WHEN MAX(s.expires) < NOW() THEN 'Expired'
    ELSE 'Active'
  END as login_status,
  -- Count active sessions
  COUNT(CASE WHEN s.expires > NOW() THEN 1 END) as active_sessions_count
FROM users u
LEFT JOIN sessions s ON s."userId" = u.id
GROUP BY u.id, u.email, u.name, u."createdAt", u."emailVerified"
ORDER BY estimated_last_login DESC NULLS LAST;

-- ============================================================================
-- SEARCH WITH FILTERS: Uncomment and modify the WHERE clause to search
-- ============================================================================
-- SELECT 
--   u.id,
--   u.email,
--   u.name,
--   u."createdAt" as account_created,
--   u."emailVerified" as email_verified,
--   COUNT(DISTINCT s.id) as total_sessions,
--   MAX(s.expires) as last_session_expires,
--   MAX(s.expires) - INTERVAL '30 days' as estimated_last_login,
--   CASE 
--     WHEN MAX(s.expires) IS NULL THEN 'Never'
--     WHEN MAX(s.expires) < NOW() THEN 'Expired'
--     ELSE 'Active'
--   END as login_status,
--   COUNT(CASE WHEN s.expires > NOW() THEN 1 END) as active_sessions_count
-- FROM users u
-- LEFT JOIN sessions s ON s."userId" = u.id
-- WHERE 
--   -- Replace 'your-search-term' with actual search text
--   (u.email ILIKE '%your-search-term%' OR 
--    u.name ILIKE '%your-search-term%')
-- GROUP BY u.id, u.email, u.name, u."createdAt", u."emailVerified"
-- ORDER BY estimated_last_login DESC NULLS LAST;

-- ============================================================================
-- SEARCH BY SPECIFIC USER ID
-- ============================================================================
-- SELECT 
--   u.id,
--   u.email,
--   u.name,
--   u."createdAt" as account_created,
--   u."emailVerified" as email_verified,
--   COUNT(DISTINCT s.id) as total_sessions,
--   MAX(s.expires) as last_session_expires,
--   MAX(s.expires) - INTERVAL '30 days' as estimated_last_login,
--   CASE 
--     WHEN MAX(s.expires) IS NULL THEN 'Never'
--     WHEN MAX(s.expires) < NOW() THEN 'Expired'
--     ELSE 'Active'
--   END as login_status,
--   COUNT(CASE WHEN s.expires > NOW() THEN 1 END) as active_sessions_count
-- FROM users u
-- LEFT JOIN sessions s ON s."userId" = u.id
-- WHERE 
--   u.id = 'paste-user-id-here'
-- GROUP BY u.id, u.email, u.name, u."createdAt", u."emailVerified"
-- ORDER BY estimated_last_login DESC NULLS LAST;

-- ============================================================================
-- RECENT LOGINS: Users who logged in within last 30 days
-- ============================================================================
SELECT 
  u.id,
  u.email,
  u.name,
  u."createdAt" as account_created,
  MAX(s.expires) as last_session_expires,
  MAX(s.expires) - INTERVAL '30 days' as estimated_last_login,
  CASE 
    WHEN MAX(s.expires) IS NULL THEN 'Never'
    WHEN MAX(s.expires) < NOW() THEN 'Expired'
    ELSE 'Active'
  END as login_status
FROM users u
INNER JOIN sessions s ON s."userId" = u.id
WHERE 
  s.expires >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.email, u.name, u."createdAt"
ORDER BY last_session_expires DESC;

-- ============================================================================
-- ALL ACTIVE SESSIONS: Users with currently active sessions
-- ============================================================================
SELECT 
  u.id,
  u.email,
  u.name,
  s.id as session_id,
  s."sessionToken" as session_token,
  s.expires as session_expires,
  EXTRACT(EPOCH FROM (s.expires - NOW())) / 3600 as hours_until_expiry
FROM users u
INNER JOIN sessions s ON s."userId" = u.id
WHERE 
  s.expires > NOW()
ORDER BY s.expires DESC;





