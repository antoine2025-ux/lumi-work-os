# Run Blog Migration on Production

## Quick Fix - Run Migration Now

The `blog_posts` table is missing in production. Run this migration immediately:

### Option 1: Using Prisma Migrate (Recommended)

```bash
# Set your production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Run the migration
npx prisma migrate deploy
```

### Option 2: Using the Script

```bash
# Set your production DATABASE_URL
export DATABASE_URL="your-production-database-url"

# Run the migration script
./scripts/run-blog-migration-production.sh
```

### Option 3: Using Prisma DB Push (Quick Fix)

If `migrate deploy` fails, use `db push`:

```bash
export DATABASE_URL="your-production-database-url"
npx prisma db push --accept-data-loss
```

### Option 4: Manual SQL (If Prisma fails)

Connect to your production database and run:

```sql
-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "BlogPostCategory" AS ENUM ('NEWS', 'PRODUCT', 'CONTEXTUAL_AI', 'LOOPWELL');

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "BlogPostCategory" NOT NULL DEFAULT 'NEWS',
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_status_idx" ON "blog_posts"("status");
CREATE INDEX "blog_posts_category_idx" ON "blog_posts"("category");
CREATE INDEX "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt" DESC);
```

## Get Production DATABASE_URL

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Find `DATABASE_URL` for Production environment
3. Copy the value
4. Use it in the commands above

## Verify Migration

After running the migration, verify it worked:

```sql
-- Check table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'blog_posts';

-- Check enums exist
SELECT typname FROM pg_type 
WHERE typname IN ('BlogPostStatus', 'BlogPostCategory');
```

## Future Deployments

I've updated `vercel.json` to automatically run migrations during build. Future deployments will include:

```json
"buildCommand": "prisma generate && npx prisma migrate deploy && npm run build"
```

This ensures migrations run automatically on every deployment.

