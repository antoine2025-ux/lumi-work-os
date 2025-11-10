-- User Login Search Query for Supabase Database
-- This query provides comprehensive search functionality for user login information

-- ============================================================================
-- BASIC SEARCH: Returns ALL users with login information (no filters)
-- Remove the WHERE clause or modify it to search for specific users
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
-- WHERE clause removed to show all users
-- To search, uncomment and modify the line below:
-- WHERE (u.email ILIKE '%your-search-here%' OR u.name ILIKE '%your-search-here%')
GROUP BY u.id, u.email, u.name, u."createdAt", u."emailVerified"
ORDER BY estimated_last_login DESC NULLS LAST;

-- ============================================================================
-- ADVANCED SEARCH: With date range filtering and additional filters
-- ============================================================================
SELECT 
  u.id,
  u.email,
  u.name,
  u."createdAt" as account_created,
  u."emailVerified" as email_verified,
  u.image as profile_image,
  COUNT(DISTINCT s.id) as total_sessions,
  MAX(s.expires) as last_session_expires,
  MAX(s.expires) - INTERVAL '30 days' as estimated_last_login,
  MIN(s.expires) as first_session_expires,
  CASE 
    WHEN MAX(s.expires) IS NULL THEN 'Never'
    WHEN MAX(s.expires) < NOW() THEN 'Expired'
    ELSE 'Active'
  END as login_status,
  COUNT(CASE WHEN s.expires > NOW() THEN 1 END) as active_sessions_count,
  -- Days since last login
  CASE 
    WHEN MAX(s.expires) IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (NOW() - MAX(s.expires))) / 86400
    ELSE NULL
  END as days_since_last_login
FROM users u
LEFT JOIN sessions s ON s."userId" = u.id
WHERE 
  -- Date range filter for last login
  (MAX(s.expires) >= '2024-01-01'::timestamp OR MAX(s.expires) IS NULL)
  AND (MAX(s.expires) <= '2024-12-31'::timestamp OR MAX(s.expires) IS NULL)
  -- Additional filters
  AND (u.email ILIKE '%search_term%' OR u.name ILIKE '%search_term%' OR '%search_term%' = '')
  -- Filter by login status
  AND (
    CASE 
      WHEN MAX(s.expires) IS NULL THEN 'Never'
      WHEN MAX(s.expires) < NOW() THEN 'Expired'
      ELSE 'Active'
    END = 'Active' -- Change to 'Expired' or 'Never' to filter by status
    OR TRUE -- Set to FALSE to enable status filter
  )
GROUP BY u.id, u.email, u.name, u."createdAt", u."emailVerified", u.image
HAVING 
  -- Filter users who logged in within last N days
  (MAX(s.expires) >= NOW() - INTERVAL '30 days' OR MAX(s.expires) IS NULL)
ORDER BY estimated_last_login DESC NULLS LAST
LIMIT 100; -- Adjust limit as needed

-- ============================================================================
-- QUICK SEARCH: Simple search by email or name
-- ============================================================================
SELECT 
  u.id,
  u.email,
  u.name,
  MAX(s.expires) as last_session_expires,
  CASE 
    WHEN MAX(s.expires) IS NULL THEN 'Never logged in'
    WHEN MAX(s.expires) < NOW() THEN 'Last login: ' || TO_CHAR(MAX(s.expires), 'YYYY-MM-DD HH24:MI:SS')
    ELSE 'Currently active'
  END as login_info
FROM users u
LEFT JOIN sessions s ON s."userId" = u.id
WHERE 
  u.email ILIKE '%search_term%' OR 
  u.name ILIKE '%search_term%'
GROUP BY u.id, u.email, u.name
ORDER BY MAX(s.expires) DESC NULLS LAST;

-- ============================================================================
-- USER ACTIVITY REPORT: Users with login activity in date range
-- ============================================================================
SELECT 
  u.id,
  u.email,
  u.name,
  u."createdAt" as account_created,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT DATE(s.expires)) as unique_login_days,
  MAX(s.expires) as most_recent_login,
  MIN(s.expires) as first_login,
  -- Average days between logins (rough estimate)
  CASE 
    WHEN COUNT(DISTINCT s.id) > 1 THEN
      EXTRACT(EPOCH FROM (MAX(s.expires) - MIN(s.expires))) / 86400 / COUNT(DISTINCT s.id)
    ELSE NULL
  END as avg_days_between_logins
FROM users u
INNER JOIN sessions s ON s."userId" = u.id
WHERE 
  -- Filter sessions within date range
  s.expires >= '2024-01-01'::timestamp
  AND s.expires <= '2024-12-31'::timestamp
GROUP BY u.id, u.email, u.name, u."createdAt"
HAVING COUNT(DISTINCT s.id) > 0
ORDER BY most_recent_login DESC;

-- ============================================================================
-- INACTIVE USERS: Users who haven't logged in for X days
-- ============================================================================
SELECT 
  u.id,
  u.email,
  u.name,
  u."createdAt" as account_created,
  MAX(s.expires) as last_session_expires,
  EXTRACT(EPOCH FROM (NOW() - MAX(s.expires))) / 86400 as days_inactive
FROM users u
LEFT JOIN sessions s ON s."userId" = u.id
GROUP BY u.id, u.email, u.name, u."createdAt"
HAVING 
  (MAX(s.expires) IS NULL OR MAX(s.expires) < NOW() - INTERVAL '30 days')
  -- Uncomment to exclude users who never logged in
  -- AND MAX(s.expires) IS NOT NULL
ORDER BY days_inactive DESC NULLS LAST;

-- ============================================================================
-- ACTIVE USERS: Users with active sessions
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

-- ============================================================================
-- PARAMETERIZED VERSION (for use in Supabase SQL Editor or API)
-- Replace placeholders with actual values:
-- ============================================================================
-- :search_term - Text to search in email/name (use '%' for wildcards)
-- :start_date - Start date for date range filter
-- :end_date - End date for date range filter
-- :min_days_inactive - Minimum days of inactivity
-- :status_filter - 'Active', 'Expired', or 'Never'
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
  COUNT(CASE WHEN s.expires > NOW() THEN 1 END) as active_sessions_count,
  EXTRACT(EPOCH FROM (NOW() - MAX(s.expires))) / 86400 as days_since_last_login
FROM users u
LEFT JOIN sessions s ON s."userId" = u.id
WHERE 
  -- Search term filter
  (:search_term IS NULL OR :search_term = '' OR 
   u.email ILIKE '%' || :search_term || '%' OR 
   u.name ILIKE '%' || :search_term || '%')
  -- Date range filter
  AND (:start_date IS NULL OR MAX(s.expires) >= :start_date::timestamp OR MAX(s.expires) IS NULL)
  AND (:end_date IS NULL OR MAX(s.expires) <= :end_date::timestamp OR MAX(s.expires) IS NULL)
GROUP BY u.id, u.email, u.name, u."createdAt", u."emailVerified"
HAVING 
  -- Inactivity filter
  (:min_days_inactive IS NULL OR 
   MAX(s.expires) IS NULL OR 
   EXTRACT(EPOCH FROM (NOW() - MAX(s.expires))) / 86400 >= :min_days_inactive)
  -- Status filter
  AND (:status_filter IS NULL OR :status_filter = '' OR
       CASE 
         WHEN MAX(s.expires) IS NULL THEN 'Never'
         WHEN MAX(s.expires) < NOW() THEN 'Expired'
         ELSE 'Active'
       END = :status_filter)
ORDER BY 
  CASE 
    WHEN :sort_by = 'email' THEN u.email
    WHEN :sort_by = 'name' THEN u.name
    WHEN :sort_by = 'last_login' THEN MAX(s.expires)::text
    ELSE MAX(s.expires)::text
  END
  DESC NULLS LAST
LIMIT COALESCE(:limit, 100)
OFFSET COALESCE(:offset, 0);

