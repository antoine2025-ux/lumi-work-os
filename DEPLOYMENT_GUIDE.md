# Deployment Guide

Complete guide for deploying Lumi Work OS to production, including Vercel setup, environment variables, and post-deployment verification.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Variables](#environment-variables)
3. [Vercel Deployment](#vercel-deployment)
4. [Database Setup](#database-setup)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Changes Ready
- [ ] All features tested locally
- [ ] Database migrations created and tested
- [ ] Environment variables documented
- [ ] Build passes locally (`npm run build`)
- [ ] No console errors or warnings

### Environment Variables Required

See [Environment Variables](#environment-variables) section below for complete list.

### Database Migration
- [ ] Prisma migrations are up to date
- [ ] Run migrations on production database if needed
- [ ] Verify all tables exist (see `DATABASE_MIGRATION_GUIDE.md`)

---

## Environment Variables

### Required Variables

Set these in **Vercel Dashboard → Settings → Environment Variables**:

#### Database
```bash
DATABASE_URL="postgresql://user:password@host:5432/database"
```

#### NextAuth
```bash
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret" # Generate with: openssl rand -base64 32
```

#### Google OAuth
```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### App URL
```bash
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

#### Supabase (if using)
```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

#### Blog Admin (Required for blog management)
```bash
BLOG_ADMIN_PASSWORD="your-strong-random-password-here"
# Generate with: openssl rand -base64 32
# This password is required to access /blog/admin
```

### Optional Variables

```bash
# OpenAI (for AI features)
OPENAI_API_KEY="your-openai-api-key"

# Anthropic (for AI features)
ANTHROPIC_API_KEY="your-anthropic-api-key"

# Mailchimp (for email subscriptions)
MAILCHIMP_API_KEY="your-mailchimp-api-key"
MAILCHIMP_LIST_ID="your-mailchimp-list-id"

# Redis (for caching)
REDIS_URL="your-redis-connection-string"

# Sentry (for error tracking)
SENTRY_DSN="your-sentry-dsn"

# Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS="true"

# Feature Flags
ENABLE_ASSISTANT="true"
ALLOW_DEV_LOGIN="false" # Must be false in production
PROD_LOCK="true" # Must be true in production
```

### Setting Environment Variables in Vercel

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Click **Add New**
3. Enter variable name and value
4. Select environments: **Production**, **Preview**, **Development** (as needed)
5. Click **Save**
6. **Redeploy** for changes to take effect

---

## Vercel Deployment

### Option 1: Automatic Deployment (Recommended)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click **Add New Project**
   - Import your GitHub/GitLab repository
   - Vercel will auto-detect Next.js

2. **Configure Project**
   - Framework Preset: Next.js
   - Root Directory: `./` (or your project root)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

3. **Add Environment Variables**
   - Add all required variables (see above)
   - Set for Production, Preview, and Development

4. **Deploy**
   - Click **Deploy**
   - Vercel will build and deploy automatically
   - Future pushes to main branch will auto-deploy

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Option 3: Change Production Branch

To deploy from a different branch (e.g., `enhanced-pm-features`):

1. **Via Vercel Dashboard:**
   - Go to **Settings** → **Git**
   - Find **Production Branch** section
   - Change from `main` to your branch name
   - Click **Save**
   - Vercel will trigger new deployment

2. **Via Vercel CLI:**
   ```bash
   npx vercel --prod --branch enhanced-pm-features
   ```

### Configure Domain

1. **Add Domain**
   - Go to **Project Settings** → **Domains**
   - Add your domain (e.g., `loopwell.io`)
   - Add `www` subdomain if needed

2. **Configure DNS**
   - Add DNS records as instructed by Vercel
   - Usually CNAME or A records
   - Wait for DNS propagation (can take up to 48 hours)

3. **SSL Certificate**
   - Vercel automatically provisions SSL certificates
   - HTTPS will be enabled automatically

---

## Database Setup

### Pre-Deployment

1. **Ensure Database is Accessible**
   - Database should be accessible from Vercel's IP ranges
   - Check firewall rules if using managed database
   - Verify connection string format

2. **Run Migrations**
   - See `DATABASE_MIGRATION_GUIDE.md` for details
   - Migrations run automatically on Vercel deployment
   - Or run manually after deployment

3. **Verify Tables Exist**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

### Post-Deployment

If migrations fail during build:

1. **Run Migrations Manually:**
   ```bash
   export DATABASE_URL="your-production-database-url"
   npx prisma migrate deploy
   ```

2. **Or Use DB Push:**
   ```bash
   export DATABASE_URL="your-production-database-url"
   npx prisma db push --accept-data-loss
   ```

See `DATABASE_MIGRATION_GUIDE.md` for troubleshooting.

---

## Post-Deployment Verification

### 1. Check Build Logs

- Go to **Vercel Dashboard** → **Deployments**
- Click on latest deployment
- Review build logs for errors
- Check for migration errors

### 2. Test Core Functionality

- [ ] Landing page loads correctly
- [ ] Login/Sign up works
- [ ] Google OAuth works
- [ ] Workspace creation works
- [ ] Dashboard loads
- [ ] API routes respond correctly

### 3. Test Feature-Specific Functionality

**If deploying org chart features:**
- [ ] User invitation flow works
- [ ] Email invitations are sent
- [ ] Org chart clean slate flow works
- [ ] Department/team/position creation works
- [ ] Role card assignment works

**If deploying email features:**
- [ ] Newsletter subscription works
- [ ] Welcome emails are sent
- [ ] Mailchimp integration works

### 4. Check Environment Variables

- [ ] All required variables are set
- [ ] Variables are set for correct environments
- [ ] No development values in production

### 5. Performance Check

- [ ] Page load times are acceptable
- [ ] API response times are fast
- [ ] No console errors
- [ ] Check Vercel Analytics

### 6. Security Check

- [ ] `ALLOW_DEV_LOGIN="false"` in production
- [ ] `PROD_LOCK="true"` in production
- [ ] No hardcoded secrets in code
- [ ] HTTPS is enabled

---

## Troubleshooting

### Build Fails

**Check:**
- Build logs in Vercel dashboard
- Environment variables are set correctly
- Dependencies are installed (`package.json` is correct)
- TypeScript errors (run `npm run build` locally)

**Fix:**
- Review build logs for specific errors
- Fix TypeScript/build errors
- Verify environment variables
- Check `next.config.ts` for issues

### Database Connection Fails

**Check:**
- `DATABASE_URL` is set correctly
- Database is accessible from Vercel
- Connection string format is correct
- Database is running

**Fix:**
- Verify `DATABASE_URL` format
- Check database firewall rules
- Test connection locally with production URL
- Review database provider status

### Migrations Fail

**Check:**
- Migration files exist in `prisma/migrations/`
- Database schema matches Prisma schema
- Migration hasn't been partially applied

**Fix:**
- See `DATABASE_MIGRATION_GUIDE.md`
- Run migrations manually after deployment
- Use `prisma db push` as fallback

### Environment Variables Not Working

**Check:**
- Variables are set in Vercel dashboard
- Variables are set for correct environment (Production)
- App has been redeployed after adding variables

**Fix:**
- Add variables in Vercel dashboard
- Redeploy application
- Check variable names match code exactly

### OAuth Not Working

**Check:**
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Redirect URIs are configured in Google Console
- `NEXTAUTH_URL` matches your domain
- `NEXTAUTH_SECRET` is set

**Fix:**
- Verify Google OAuth credentials
- Add redirect URI: `https://your-domain.com/api/auth/callback/google`
- Set `NEXTAUTH_URL` to production URL
- Generate new `NEXTAUTH_SECRET` if needed

---

## Rollback Plan

If deployment causes issues:

1. **Revert to Previous Deployment:**
   - Go to **Vercel Dashboard** → **Deployments**
   - Find previous working deployment
   - Click **⋯** → **Promote to Production**

2. **Or Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Check:**
   - Vercel build logs
   - Environment variables are correct
   - Database migrations didn't cause issues

---

## Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com/)
   - Create/select a project

2. **Enable Google+ API**
   - Go to **APIs & Services** → **Library**
   - Search for "Google+ API"
   - Click **Enable**

3. **Create OAuth 2.0 Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: "Lumi Work OS Production"
   - Authorized redirect URIs:
     - `https://your-domain.com/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google` (for dev)

4. **Copy Credentials**
   - Copy **Client ID** → `GOOGLE_CLIENT_ID`
   - Copy **Client Secret** → `GOOGLE_CLIENT_SECRET`
   - Add to Vercel environment variables

---

## Best Practices

### Security

- ✅ Never commit secrets to git
- ✅ Use environment variables for all secrets
- ✅ Set `ALLOW_DEV_LOGIN="false"` in production
- ✅ Set `PROD_LOCK="true"` in production
- ✅ Use different credentials for dev/staging/prod
- ✅ Rotate secrets regularly

### Performance

- ✅ Enable caching (Redis if available)
- ✅ Add database indexes (see `PERFORMANCE_GUIDE.md`)
- ✅ Monitor performance with Vercel Analytics
- ✅ Optimize bundle size

### Monitoring

- ✅ Set up error tracking (Sentry)
- ✅ Monitor Vercel Analytics
- ✅ Check database performance
- ✅ Review API response times

---

## Next Steps

1. ✅ Complete pre-deployment checklist
2. ✅ Set all environment variables
3. ✅ Deploy to Vercel
4. ✅ Run database migrations
5. ✅ Verify deployment
6. ✅ Test all functionality
7. ✅ Monitor performance and errors

---

For database migration issues, see `DATABASE_MIGRATION_GUIDE.md`.  
For performance optimization, see `PERFORMANCE_GUIDE.md`.
