-- Simple SQL to fix trailing spaces in blog post slugs
-- Copy and paste this entire block into Supabase SQL Editor

-- Step 1: Check which slugs have trailing spaces
SELECT 
  id,
  title,
  slug,
  LENGTH(slug) as slug_length,
  LENGTH(TRIM(slug)) as trimmed_length
FROM blog_posts
WHERE slug != TRIM(slug);

-- Step 2: Fix all slugs with trailing spaces
UPDATE blog_posts
SET slug = TRIM(slug)
WHERE slug != TRIM(slug);

-- Step 3: Verify the fix worked
SELECT 
  id,
  title,
  slug,
  LENGTH(slug) as slug_length
FROM blog_posts
WHERE slug LIKE 'contextual-ai%';








