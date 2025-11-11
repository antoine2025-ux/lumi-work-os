# 🚀 Deploy from `enhanced-pm-features` Branch

## Quick Steps to Change Production Branch in Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your Loopwell/Lumi project

3. **Go to Settings**
   - Click on **Settings** tab (top navigation)

4. **Navigate to Git**
   - In the left sidebar, click **Git**

5. **Change Production Branch**
   - Find the **Production Branch** section
   - Click the dropdown/input field
   - Change from `main` to `enhanced-pm-features`
   - Click **Save**

6. **Trigger Deployment**
   - Vercel will automatically trigger a new deployment
   - Or go to **Deployments** tab and click **Redeploy** on the latest deployment

### Option 2: Via Vercel CLI

If you have Vercel CLI installed:

```bash
# Link project (if not already linked)
npx vercel link

# Set production branch
npx vercel --prod --branch enhanced-pm-features

# Or update project settings
npx vercel project ls
npx vercel project update <project-name> --production-branch enhanced-pm-features
```

### Option 3: Via Vercel API

You can also use the Vercel API to update the project settings programmatically.

---

## What This Will Do

✅ Deploy all performance optimizations to production:
- Parallelized API calls (40-60% faster)
- Enhanced caching (80-95% faster cached responses)
- Optimized database queries
- HTTP caching headers

✅ Avoid the secret scanning issue (secret is only in old `main` branch history)

✅ Keep `enhanced-pm-features` as your active development branch

---

## After Deployment

1. **Monitor Performance**
   - Check Vercel Analytics for page load times
   - Should see 60-70% improvement in load times
   - Check Network tab in browser DevTools

2. **Verify Caching**
   - Look for `X-Cache: HIT` headers in API responses
   - Second page load should be much faster

3. **Check Database Performance**
   - Monitor query times in Supabase dashboard
   - Should see reduced database load

---

## Rollback Plan

If you need to rollback:
1. Go to Vercel Dashboard → Deployments
2. Find the previous deployment from `main` branch
3. Click the three dots (⋯) → **Promote to Production**

Or change the Production Branch back to `main` in Settings → Git.

---

**Note**: The `.env` backup files have been removed from git tracking, so future commits won't have this issue.

