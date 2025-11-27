# Blog Post SQL Queries for Supabase

## Basic Queries

### 1. View All Blog Posts
```sql
SELECT 
  id,
  title,
  slug,
  excerpt,
  category,
  status,
  "publishedAt",
  "createdAt",
  "updatedAt"
FROM blog_posts
ORDER BY "createdAt" DESC;
```

### 2. View Only Published Posts
```sql
SELECT 
  id,
  title,
  slug,
  excerpt,
  category,
  "publishedAt"
FROM blog_posts
WHERE status = 'PUBLISHED'
ORDER BY "publishedAt" DESC;
```

### 3. View Only Drafts
```sql
SELECT 
  id,
  title,
  slug,
  excerpt,
  category,
  "createdAt",
  "updatedAt"
FROM blog_posts
WHERE status = 'DRAFT'
ORDER BY "updatedAt" DESC;
```

### 4. Check a Specific Post by Slug
```sql
SELECT 
  id,
  title,
  slug,
  excerpt,
  category,
  status,
  "publishedAt",
  "createdAt",
  "updatedAt"
FROM blog_posts
WHERE slug = 'your-slug-here';
```

### 5. Count Posts by Status
```sql
SELECT 
  status,
  COUNT(*) as count
FROM blog_posts
GROUP BY status;
```

### 6. Count Posts by Category
```sql
SELECT 
  category,
  COUNT(*) as count
FROM blog_posts
WHERE status = 'PUBLISHED'
GROUP BY category
ORDER BY count DESC;
```

## Debugging Queries

### 7. List All Slugs (to verify URL matching)
```sql
SELECT 
  slug,
  title,
  status,
  "publishedAt"
FROM blog_posts
ORDER BY slug;
```

### 8. Find Posts with Missing Published Date
```sql
SELECT 
  id,
  title,
  slug,
  status,
  "publishedAt"
FROM blog_posts
WHERE status = 'PUBLISHED' AND "publishedAt" IS NULL;
```

### 9. Find Posts Published in Last 30 Days
```sql
SELECT 
  id,
  title,
  slug,
  category,
  "publishedAt"
FROM blog_posts
WHERE status = 'PUBLISHED' 
  AND "publishedAt" >= NOW() - INTERVAL '30 days'
ORDER BY "publishedAt" DESC;
```

### 10. Check for Duplicate Slugs
```sql
SELECT 
  slug,
  COUNT(*) as count,
  array_agg(id) as post_ids,
  array_agg(title) as titles
FROM blog_posts
GROUP BY slug
HAVING COUNT(*) > 1;
```

## Maintenance Queries

### 11. Update Draft to Published
```sql
UPDATE blog_posts
SET 
  status = 'PUBLISHED',
  "publishedAt" = NOW()
WHERE id = 'post-id-here';
```

### 12. Update Published Post Back to Draft
```sql
UPDATE blog_posts
SET 
  status = 'DRAFT',
  "publishedAt" = NULL
WHERE id = 'post-id-here';
```

### 13. Delete a Post
```sql
DELETE FROM blog_posts
WHERE id = 'post-id-here';
```

### 14. Fix Published Posts Missing Published Date
```sql
UPDATE blog_posts
SET "publishedAt" = "createdAt"
WHERE status = 'PUBLISHED' 
  AND "publishedAt" IS NULL;
```

## Table Structure Check

### 15. Verify Table Exists
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'blog_posts'
) as table_exists;
```

### 16. Check Table Columns
```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'blog_posts'
ORDER BY ordinal_position;
```

### 17. Check Indexes
```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'blog_posts';
```

## Quick Diagnostic Query

### 18. Full Diagnostic (Run this first if having issues)
```sql
-- Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name = 'blog_posts'
) as table_exists;

-- Count all posts
SELECT COUNT(*) as total_posts FROM blog_posts;

-- Count by status
SELECT status, COUNT(*) as count 
FROM blog_posts 
GROUP BY status;

-- List all slugs
SELECT slug, title, status, "publishedAt"
FROM blog_posts
ORDER BY "createdAt" DESC;
```

