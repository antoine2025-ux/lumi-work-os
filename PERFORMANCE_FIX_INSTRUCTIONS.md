# 🚀 Performance Fix Instructions

## Critical: Check Your Vercel DATABASE_URL

**IMPORTANT**: Even though we removed `connection_limit=1` from the code, if your Vercel environment variable `DATABASE_URL` still has it hardcoded, the bottleneck will remain.

### Step 1: Check Vercel Environment Variables

1. Go to your Vercel dashboard
2. Navigate to: **Settings → Environment Variables**
3. Find `DATABASE_URL`
4. Check if it contains `connection_limit=1`

### Step 2: Update DATABASE_URL (if needed)

**Current (SLOW)**:
```
postgresql://postgres:password@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require
```

**Updated (FAST)**:
```
postgresql://postgres:password@pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
```

**Remove**: `&connection_limit=1` from the URL

### Step 3: Redeploy

After updating the environment variable:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for deployment to complete

---

## Performance Optimizations Applied

### ✅ Code Fixes (Already Deployed)

1. **Removed `connection_limit=1`** from code
2. **Parallelized API calls** - all data loads simultaneously
3. **Optimized database queries**:
   - Projects API: Limits tasks to 5 most recent
   - Tasks API: Limits subtasks/comments to 5 each, max 100 tasks
   - Recent Pages API: Uses `select` instead of `include`, no full content

### 📊 Expected Improvements

| Metric | Before | After |
|--------|--------|-------|
| Page Load | 4-6s | 1-2s |
| API Response | 800ms-2s | 200-500ms |
| Database Query | 200-500ms | 50-150ms |

---

## If Still Slow After Fixes

### Check 1: Database Connection
```bash
# Test database connection speed
curl https://your-app.vercel.app/api/test-db
```

### Check 2: Network Tab
1. Open browser DevTools → Network tab
2. Reload page
3. Check which API calls are slow
4. Look for:
   - **Waiting (TTFB)**: Server processing time
   - **Content Download**: Response size

### Check 3: Database Location
- Is your Supabase database in the same region as Vercel?
- EU → EU = Fast
- EU → US = Slow (200-300ms added latency)

### Check 4: Missing Indexes
Database queries might be slow if indexes are missing. Check:
```sql
-- Check if indexes exist
SELECT * FROM pg_indexes WHERE tablename IN ('projects', 'tasks', 'wiki_pages');
```

---

## Additional Optimizations (Optional)

### Add Caching (High Impact)
Install React Query or SWR for client-side caching:
```bash
npm install @tanstack/react-query
```

### Add Database Indexes (Medium Impact)
If queries are still slow, add indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_projects_workspace_created 
ON projects(workspaceId, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status 
ON tasks(projectId, status, createdAt DESC);

CREATE INDEX IF NOT EXISTS idx_wiki_pages_workspace_updated 
ON wiki_pages(workspaceId, updatedAt DESC);
```

---

## Troubleshooting

### Still Slow? Check These:

1. **Vercel DATABASE_URL** - Remove `connection_limit=1` ✅
2. **Database Region** - Should match Vercel region
3. **API Response Size** - Check Network tab for large payloads
4. **Cold Starts** - First request after inactivity is slower (Vercel free tier)
5. **Concurrent Requests** - Multiple users = slower if connection_limit=1 still exists

---

## Quick Test

After fixing Vercel DATABASE_URL, test:
1. Clear browser cache
2. Hard reload (Cmd+Shift+R / Ctrl+Shift+R)
3. Check Network tab - API calls should complete in 200-500ms
4. Page should load in 1-2 seconds

