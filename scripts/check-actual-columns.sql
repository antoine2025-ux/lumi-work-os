-- STEP 1: Run this FIRST to see actual column names
-- Copy the results and share them

-- Check workspace_members table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workspace_members'
ORDER BY ordinal_position;

-- Also try checking with pg_catalog (more reliable)
SELECT 
    a.attname as column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type
FROM pg_catalog.pg_attribute a
JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND c.relname = 'workspace_members'
AND a.attnum > 0
AND NOT a.attisdropped
ORDER BY a.attnum;



