# Blog System Production Deployment Checklist

## Pre-Deployment Steps

### 1. Environment Variables
✅ **REQUIRED**: Set `BLOG_ADMIN_PASSWORD` in Vercel Dashboard:
- Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
- Add: `BLOG_ADMIN_PASSWORD` with a strong random password
- Generate password: `openssl rand -base64 32`
- **Important**: Set this for Production environment

### 2. Database Migration
✅ **REQUIRED**: Run Prisma migration on production database:

```bash
# Option 1: Via Vercel (automatic on deploy)
# The build process runs: prisma generate && npm run build
# Migrations run automatically via postinstall hook

# Option 2: Manual migration (if needed)
export DATABASE_URL="your-production-database-url"
npx prisma migrate deploy
```

The migration will create:
- `BlogPostStatus` enum (DRAFT, PUBLISHED)
- `BlogPostCategory` enum (NEWS, PRODUCT, CONTEXTUAL_AI, LOOPWELL)
- `blog_posts` table with all required fields and indexes

### 3. Verify Migration
After deployment, verify the table exists:

```sql
-- Check table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'blog_posts';

-- Check enums exist
SELECT typname FROM pg_type WHERE typname IN ('BlogPostStatus', 'BlogPostCategory');
```

## Post-Deployment Verification

### 1. Public Blog Access
- [ ] Visit `https://your-domain.com/blog` (should work without login)
- [ ] Verify blog listing page loads
- [ ] Check that no authentication is required

### 2. Blog Admin Access
- [ ] Visit `https://your-domain.com/blog/dev-login`
- [ ] Enter `BLOG_ADMIN_PASSWORD`
- [ ] Verify redirect to `/blog/admin`
- [ ] Check admin dashboard loads

### 3. Create Test Post
- [ ] Create a new blog post in admin
- [ ] Set status to "PUBLISHED"
- [ ] Verify post appears on `/blog`
- [ ] Click post and verify detail page loads

### 4. Category Filtering
- [ ] Verify category filter works on `/blog`
- [ ] Test all categories: News, Product, Contextual AI, Loopwell

## Troubleshooting

### Issue: "Database table not found"
**Solution**: Run migration manually:
```bash
export DATABASE_URL="your-production-database-url"
npx prisma migrate deploy
```

### Issue: "Admin authentication not configured"
**Solution**: Set `BLOG_ADMIN_PASSWORD` in Vercel environment variables

### Issue: Blog routes redirect to login
**Solution**: Verify `/blog` is in `publicRoutes` array in `src/components/auth-wrapper.tsx`

### Issue: Migration fails
**Solution**: Check database connection and permissions. Verify `DATABASE_URL` is correct.

## Production URLs

- Public Blog: `https://your-domain.com/blog`
- Blog Admin Login: `https://your-domain.com/blog/dev-login`
- Blog Admin Dashboard: `https://your-domain.com/blog/admin`

## Security Notes

- `BLOG_ADMIN_PASSWORD` should be a strong, random password
- Admin cookie is HttpOnly and Secure (HTTPS only in production)
- Admin cookie expires after 7 days
- Blog posts are public (no authentication required to read)

