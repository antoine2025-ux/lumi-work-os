-- DIAGNOSTIC: Check actual column names in your database
-- Run this FIRST to see what column names actually exist
-- Copy the results and share them

-- Check workspace_members columns
SELECT 
    'workspace_members' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workspace_members'
ORDER BY ordinal_position;

-- Check wiki_pages columns  
SELECT 
    'wiki_pages' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'wiki_pages'
ORDER BY ordinal_position;

-- Check projects columns
SELECT 
    'projects' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

-- Check chat_sessions columns
SELECT 
    'chat_sessions' as table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_sessions'
ORDER BY ordinal_position;
