# Blog Post 404 Debugging Guide

## Where to Check for Root Cause

### 1. **Server Logs (Most Important)**
After deploying, check your Vercel deployment logs or server console. Look for:
- `[Blog Post Page] Fetching post with slug: <slug>`
- `[Blog Post Page] Post found: ...` or `null`
- `[Blog Post Page] Found post but status is: ...` (if post exists but isn't published)
- `[Blog Post Page] All posts in database: ...` (lists all slugs)

### 2. **Database Check**
Verify the post exists and is published:
```sql
SELECT slug, title, status, "publishedAt" 
FROM blog_posts 
WHERE slug = '<your-slug>';
```

### 3. **Common Causes**

#### A. Slug Mismatch
- **Symptom**: Post exists but slug doesn't match URL
- **Check**: Compare the slug in the database with the URL slug
- **Fix**: Ensure slugs are URL-encoded correctly (no spaces, special chars)

#### B. Post Not Published
- **Symptom**: Post exists but `status = 'DRAFT'`
- **Check**: Look for `[Blog Post Page] Found post but status is: DRAFT`
- **Fix**: Publish the post in admin panel

#### C. Route Not Found (Next.js Issue)
- **Symptom**: 404 before reaching the page component
- **Check**: Verify `src/app/blog/[slug]/page.tsx` exists
- **Fix**: Ensure file structure is correct

#### D. Database Connection Issue
- **Symptom**: Database errors in logs
- **Check**: Look for Prisma errors in server logs
- **Fix**: Verify `blogPrisma` is correctly configured

### 4. **Quick Diagnostic Steps**

1. **Check the blog listing page** (`/blog`):
   - Does the post appear in the list?
   - What slug is shown in the link?

2. **Check the URL**:
   - What exact URL are you visiting?
   - Does it match the slug in the database?

3. **Check server logs**:
   - After clicking a blog post link, check logs immediately
   - Look for the debug messages added

4. **Test with direct database query**:
   ```bash
   # Using Prisma Studio
   npx prisma studio
   # Navigate to BlogPost table and check slug values
   ```

### 5. **Next Steps**

After checking logs, share:
- The exact URL you're visiting
- The slug value from the database
- Any error messages from server logs
- The output of `[Blog Post Page] All posts in database: ...`

This will help pinpoint the exact issue.

