-- Fix trailing spaces in blog post slugs
-- Run this in Supabase SQL Editor

-- First, check which slugs have trailing spaces
SELECT 
  id,
  title,
  slug,
  LENGTH(slug) as slug_length,
  LENGTH(TRIM(slug)) as trimmed_length,
  slug != TRIM(slug) as has_trailing_space
FROM blog_posts
WHERE slug != TRIM(slug);

-- Fix all slugs with trailing spaces
UPDATE blog_posts
SET slug = TRIM(slug)
WHERE slug != TRIM(slug);

-- Verify the fix
SELECT 
  id,
  title,
  slug,
  LENGTH(slug) as slug_length
FROM blog_posts
WHERE slug = 'contextual-ai';






