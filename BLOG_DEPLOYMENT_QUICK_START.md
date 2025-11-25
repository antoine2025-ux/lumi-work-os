# Blog Deployment - Quick Start Guide

## 🚀 Quick Commands

### 1. Run Migration Locally

```bash
cd /Users/tonyem/lumi-work-os

# Option 1: Using Prisma Migrate (if your DB is set up for migrations)
npx prisma migrate dev --name add_blog_posts

# Option 2: If migrate dev doesn't work, run SQL directly
# Connect to your database and run:
psql -h localhost -U lumi_user -d lumi_work_os -f prisma/migrations/add_blog_posts/migration.sql

# Then mark it as applied:
npx prisma migrate resolve --applied add_blog_posts
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Test Locally

```bash
npm run dev
```

Then visit:
- `http://localhost:3000/blog` - Should show blog posts
- `http://localhost:3000/dev-login` - Login and test editor

### 4. Verify Database Table

```bash
psql -h localhost -U lumi_user -d lumi_work_os -c "\d blog_posts"
```

### 5. Deploy to Vercel

Code is already pushed. Vercel should auto-deploy. Or manually:
- Go to Vercel Dashboard → Deployments → Redeploy

### 6. Run Migration on Production

**⚠️ IMPORTANT:** After Vercel deploys, run migration on production DB:

```bash
# Get production DATABASE_URL from Vercel environment variables
# Then run:
export DATABASE_URL="your-production-database-url"
npx prisma migrate deploy

# Or run SQL directly:
psql "your-production-database-url" -f prisma/migrations/add_blog_posts/migration.sql
```

### 7. Set Vercel Environment Variables

Go to Vercel → Settings → Environment Variables:
- `DATABASE_URL` ✅ (should already exist)
- `DIRECT_URL` ✅ (should already exist)  
- `DEV_BLOG_PASSWORD` ⚠️ **ADD THIS** - Your secure password

### 8. Test Production

Visit your production site:
- `https://your-domain.com/blog`
- `https://your-domain.com/dev-login`

---

## 📋 Checklist

- [ ] Migration run locally
- [ ] `blog_posts` table exists locally
- [ ] Tested blog editor locally
- [ ] Vercel deployment successful
- [ ] Migration run on production database
- [ ] `DEV_BLOG_PASSWORD` set in Vercel
- [ ] Tested blog editor in production

---

## 🆘 Quick Troubleshooting

**"Table already exists"** → Migration already ran, skip it

**"Cannot connect"** → Check DATABASE_URL

**"Read-only file system"** → Migration not run on production yet

**"Posts not showing"** → Check database connection, verify table exists

