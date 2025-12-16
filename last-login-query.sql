-- Query to get users' last login times
-- This query uses the sessions table to determine when users last logged in
-- by finding their most recent active or expired session

SELECT 
  u.id,
  u.email,
  u.name,
  u."createdAt" as account_created,
  MAX(s.expires) as last_session_expires,
  -- Estimate login time by subtracting typical session duration (30 days)
  -- Adjust the interval based on your actual session duration
  MAX(s.expires) - INTERVAL '30 days' as estimated_last_login
FROM users u
LEFT JOIN sessions s ON s."userId" = u.id
GROUP BY u.id, u.email, u.name, u."createdAt"
ORDER BY estimated_last_login DESC NULLS LAST;

-- Alternative query: Get last login with more details
-- This version includes session count and shows users who never logged in

SELECT 
  u.id,
  u.email,
  u.name,
  u."createdAt" as account_created,
  COUNT(s.id) as total_sessions,
  MAX(s.expires) as most_recent_session_expires,
  -- If you know your session duration, adjust this calculation
  -- For example, if sessions last 30 days, subtract 30 days from expires
  MAX(s.expires) - INTERVAL '30 days' as estimated_last_login,
  CASE 
    WHEN MAX(s.expires) IS NULL THEN 'Never'
    WHEN MAX(s.expires) < NOW() THEN 'Expired'
    ELSE 'Active'
  END as login_status
FROM users u
LEFT JOIN sessions s ON s."userId" = u.id
GROUP BY u.id, u.email, u.name, u."createdAt"
ORDER BY estimated_last_login DESC NULLS LAST;

-- Simplified query: Just get the most recent session per user
-- This is the most straightforward approach

SELECT 
  u.id,
  u.email,
  u.name,
  MAX(s.expires) as last_session_expires
FROM users u
LEFT JOIN sessions s ON s."userId" = u.id
GROUP BY u.id, u.email, u.name
ORDER BY MAX(s.expires) DESC NULLS LAST;





