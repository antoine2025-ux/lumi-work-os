# Blog System Deployment - Step-by-Step Guide

This guide walks you through deploying the blog system that now uses a database instead of the file system.

## Prerequisites

- ✅ Code changes have been committed and pushed to GitHub
- ✅ Database connection configured (DATABASE_URL in .env)
- ✅ Vercel project connected to your GitHub repository

---

## Step 1: Run Database Migration Locally

### Option A: Using Prisma Migrate (Recommended)

```bash
# Navigate to your project directory
cd /Users/tonyem/lumi-work-os

# Apply the migration to your local database
npx prisma migrate dev --name add_blog_posts
```

This will:
- Create the `blog_posts` table in your local database
- Update Prisma Client
- Mark the migration as applied

### Option B: Manual SQL Execution

If migrate dev doesn't work, you can run the SQL directly:

1. Connect to your PostgreSQL database:
   ```bash
   psql -h localhost -U lumi_user -d lumi_work_os
   ```
   (Or use your database client like pgAdmin, DBeaver, etc.)

2. Run the migration SQL:
   ```sql
   -- CreateTable
   CREATE TABLE IF NOT EXISTS "blog_posts" (
       "id" TEXT NOT NULL,
       "slug" TEXT NOT NULL,
       "title" TEXT NOT NULL,
       "excerpt" TEXT NOT NULL,
       "content" TEXT NOT NULL,
       "authorName" TEXT NOT NULL DEFAULT 'Loopwell Team',
       "publishedAt" TIMESTAMP(3) NOT NULL,
       "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
       "readingTime" INTEGER DEFAULT 5,
       "coverImage" TEXT,
       "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       "updatedAt" TIMESTAMP(3) NOT NULL,
       CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
   );

   -- CreateIndex
   CREATE UNIQUE INDEX IF NOT EXISTS "blog_posts_slug_key" ON "blog_posts"("slug");
   CREATE INDEX IF NOT EXISTS "blog_posts_slug_idx" ON "blog_posts"("slug");
   CREATE INDEX IF NOT EXISTS "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt");
   ```

3. Mark the migration as applied (if using Prisma):
   ```bash
   npx prisma migrate resolve --applied add_blog_posts
   ```

---

## Step 2: Verify Migration Worked

### Check the table exists:

```bash
# Generate Prisma Client to include the new model
npx prisma generate

# Verify the table was created (using psql or your DB client)
psql -h localhost -U lumi_user -d lumi_work_os -c "\d blog_posts"
```

You should see the `blog_posts` table with all columns.

---

## Step 3: Test Locally

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the blog listing page:**
   - Visit `http://localhost:3000/blog`
   - Should show existing blog posts (from markdown files)

3. **Test the dev blog editor:**
   - Visit `http://localhost:3000/dev-login`
   - Login with your `DEV_BLOG_PASSWORD`
   - Try creating a new blog post
   - Try editing an existing post
   - Verify posts are saved to the database

4. **Check the database:**
   ```bash
   # Using psql
   psql -h localhost -U lumi_user -d lumi_work_os -c "SELECT slug, title FROM blog_posts;"
   ```

---

## Step 4: Deploy to Vercel

The code is already pushed to GitHub. Vercel should automatically deploy, but you can:

1. **Check Vercel Dashboard:**
   - Go to https://vercel.com/dashboard
   - Find your project
   - Check the latest deployment status

2. **Or trigger a manual deployment:**
   - Go to Deployments tab
   - Click "Redeploy" on the latest deployment
   - Make sure "Use existing Build Cache" is **unchecked** (to ensure fresh build)

---

## Step 5: Run Migration on Production Database

**⚠️ CRITICAL:** After Vercel deploys, you MUST run the migration on your production database.

### Option A: Using Vercel's Environment Variables + Local Connection

1. **Get your production DATABASE_URL from Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Copy the `DATABASE_URL` value (or note it down)

2. **Run migration pointing to production:**
   ```bash
   # Set production database URL temporarily
   export DATABASE_URL="your-production-database-url"
   
   # Run migration
   npx prisma migrate deploy
   
   # Or run the SQL directly using psql
   psql "your-production-database-url" -f prisma/migrations/add_blog_posts/migration.sql
   ```

### Option B: Using Database Client

1. Connect to your production PostgreSQL database using your preferred client
2. Run the migration SQL (same as Step 1, Option B)
3. Verify the table was created

### Option C: Using Vercel CLI (if you have database access)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Run migration (if you have database access configured)
vercel env pull .env.production
npx prisma migrate deploy
```

---

## Step 6: Set Environment Variables in Vercel

Make sure these are set in Vercel:

1. **Go to Vercel Dashboard → Your Project → Settings → Environment Variables**

2. **Add/Verify these variables:**
   - `DATABASE_URL` - Your production database connection string
   - `DIRECT_URL` - Your production database direct connection (if using connection pooling)
   - `DEV_BLOG_PASSWORD` - Your secure password for dev blog editor access

3. **Select environments:**
   - ✅ Production
   - ✅ Preview (optional)
   - ✅ Development (optional)

4. **Redeploy after adding variables:**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment

---

## Step 7: Test Production Deployment

1. **Test blog listing:**
   - Visit `https://your-domain.com/blog`
   - Should show blog posts

2. **Test dev login:**
   - Visit `https://your-domain.com/dev-login`
   - Login with your `DEV_BLOG_PASSWORD`
   - Should redirect to `/dev/blog/editor`

3. **Test creating a blog post:**
   - Create a new post
   - Fill in title, content, etc.
   - Click "Save"
   - Should save successfully (no more "read-only file system" error!)

4. **Test editing a blog post:**
   - Edit an existing post
   - Save changes
   - Verify changes are saved

5. **Verify in database:**
   - Check your production database
   - Query: `SELECT * FROM blog_posts;`
   - Should see your new/updated posts

---

## Step 8: Migrate Existing Blog Posts (Optional)

If you want to migrate existing markdown files to the database:

1. **Create a migration script** (or run manually):

```typescript
// scripts/migrate-blog-posts.ts
import { prisma } from '../src/lib/db';
import { getAllBlogPosts } from '../src/lib/blog';

async function migratePosts() {
  const posts = await getAllBlogPosts();
  
  for (const post of posts) {
    try {
      await prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: {
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          authorName: post.author.name,
          publishedAt: new Date(post.publishedAt),
          tags: post.tags,
          readingTime: post.readingTime || 5,
        },
        create: {
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          authorName: post.author.name,
          publishedAt: new Date(post.publishedAt),
          tags: post.tags,
          readingTime: post.readingTime || 5,
        },
      });
      console.log(`✅ Migrated: ${post.slug}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${post.slug}:`, error);
    }
  }
}

migratePosts();
```

2. **Run the migration:**
   ```bash
   npx ts-node scripts/migrate-blog-posts.ts
   ```

---

## Troubleshooting

### Issue: "Table blog_posts already exists"
- **Solution:** The migration already ran. You can skip it or use `CREATE TABLE IF NOT EXISTS`

### Issue: "Cannot connect to database"
- **Solution:** Check your DATABASE_URL in Vercel environment variables

### Issue: "Migration not found"
- **Solution:** Make sure the migration file exists at `prisma/migrations/add_blog_posts/migration.sql`

### Issue: "Prisma Client out of date"
- **Solution:** Run `npx prisma generate` after migration

### Issue: Blog posts not showing
- **Solution:** 
  1. Check database connection
  2. Verify migration ran successfully
  3. Check browser console for errors
  4. Verify posts exist in database: `SELECT * FROM blog_posts;`

---

## Summary Checklist

- [ ] Run migration locally (`npx prisma migrate dev`)
- [ ] Verify `blog_posts` table exists locally
- [ ] Test blog editor locally (create/edit posts)
- [ ] Push code to GitHub (already done ✅)
- [ ] Vercel auto-deploys (or trigger manual deploy)
- [ ] Run migration on production database
- [ ] Set `DEV_BLOG_PASSWORD` in Vercel environment variables
- [ ] Test production blog editor (create/edit posts)
- [ ] Verify posts are saved to production database

---

## Need Help?

If you encounter any issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify database connection strings
4. Ensure migrations ran successfully
5. Check that Prisma Client is generated

