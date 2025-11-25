-- First, let's check what the actual column names are in your database
-- Run this FIRST to see the real column names

-- Check workspace_members columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'workspace_members'
ORDER BY ordinal_position;

-- Check wiki_pages columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'wiki_pages'
ORDER BY ordinal_position;

-- Check projects columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

-- Check chat_sessions columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'chat_sessions'
ORDER BY ordinal_position;



