# 🔍 Production Performance Diagnostic Checklist

Use this checklist to identify and verify performance bottlenecks in your production deployment.

## Quick Checks (5 minutes each)

### ✅ 1. Check Database Region Match
**Location**: Vercel Dashboard + Supabase Dashboard

**Steps**:
1. Vercel: Project → Settings → General → Check "Deployment Region"
2. Supabase: Project Settings → Infrastructure → Check "Database Region"
3. **Result**: Should match! If not, this adds 200-500ms latency per query

**Fix**: Change Vercel deployment region to match Supabase (or vice versa)

---

### ✅ 2. Check Vercel Environment Variables
**Location**: Vercel Dashboard → Project → Settings → Environment Variables

**Check**:
- [ ] `DATABASE_URL` does NOT contain `connection_limit=1`
- [ ] `DATABASE_URL` contains `pgbouncer=true` (if using pooler)
- [ ] `DATABASE_URL` contains `prepared_statements=false` (if using pooler)

**Fix**: Remove `connection_limit=1` if present (already fixed in code, but check env vars)

---

### ✅ 3. Check Bundle Size
**Command**: `npm run build`

**Look for**:
- "First Load JS" should be <300KB (yours is 491KB - too large!)
- Large chunks indicate heavy dependencies

**Fix**: See bundle optimization section in main document

---

### ✅ 4. Check Cold Start Frequency
**Location**: Vercel Dashboard → Analytics → Functions

**Check**:
- [ ] "Cold Start" percentage (should be <10% for good performance)
- [ ] Average function duration
- [ ] Functions with >1s cold start time

**Fix**: Implement keep-alive pings or upgrade to Vercel Pro

---

### ✅ 5. Check Network Tab (Browser DevTools)
**Location**: Production site → DevTools → Network tab

**Check**:
- [ ] API response times (should be <500ms)
- [ ] Sequential vs parallel requests
- [ ] Large JavaScript bundles (>500KB)
- [ ] Blocking resources

**Look for**:
- Multiple API calls happening sequentially (bad)
- API calls happening in parallel (good)
- Large JS files blocking render

---

### ✅ 6. Check Database Indexes
**Location**: Supabase SQL Editor

**Run**:
```sql
-- Check if critical indexes exist
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND (
    indexname LIKE '%workspace_members%' OR
    indexname LIKE '%wiki_pages%' OR
    indexname LIKE '%projects%' OR
    indexname LIKE '%tasks%'
)
ORDER BY tablename, indexname;
```

**Expected Indexes**:
- `idx_workspace_members_user_workspace` on `workspace_members(userId, workspaceId)`
- `idx_wiki_pages_workspace_published` on `wiki_pages(workspaceId, isPublished)`
- `idx_projects_workspace_created` on `projects(workspaceId, createdAt)`
- `idx_tasks_workspace_status` on `tasks(workspaceId, status)`

**Fix**: Add missing indexes (see main document for SQL)

---

### ✅ 7. Check Authentication Query Performance
**Location**: Supabase Dashboard → Database → Query Performance

**Check**:
- [ ] Queries from `getUnifiedAuth` (should be <100ms)
- [ ] `workspace_members` queries (should use index)
- [ ] `users` queries (should be fast)

**Fix**: Add caching to `getUnifiedAuth()` function

---

### ✅ 8. Check API Route Caching
**Location**: Browser DevTools → Network tab → Response Headers

**Check**:
- [ ] `Cache-Control` header present
- [ ] `X-Cache: HIT` on second request (indicates caching working)
- [ ] Cache TTL values (should be 30s-5min for dynamic data)

**Fix**: Already implemented, but verify it's working

---

### ✅ 9. Check React Query Usage
**Location**: Codebase search for `useQuery` vs `fetch`

**Check**:
- [ ] All data fetching uses `useQuery` (not raw `fetch`)
- [ ] `staleTime` configured appropriately
- [ ] Request deduplication working (same query key = one request)

**Fix**: Convert remaining `fetch` calls to `useQuery`

---

### ✅ 10. Check Lazy Loading
**Location**: Codebase search for `dynamic()` imports

**Check**:
- [ ] Heavy components use `dynamic()` import
- [ ] TipTap editor lazy loaded
- [ ] Charts lazy loaded
- [ ] Tree view lazy loaded

**Fix**: Add `dynamic()` imports for heavy components

---

## Performance Test Results Template

After running checks, fill this out:

```
Date: ___________
Environment: Production

1. Database Region Match: [ ] Match [ ] Mismatch
   - Vercel Region: ___________
   - Supabase Region: ___________

2. Bundle Size: __________ KB (Target: <300KB)

3. Cold Start Frequency: __________% (Target: <10%)

4. Average API Response Time: __________ ms (Target: <500ms)

5. TTFB (Time to First Byte): __________ ms (Target: <600ms)

6. LCP (Largest Contentful Paint): __________ s (Target: <2.5s)

7. Missing Indexes: __________ (List any missing)

8. Authentication Query Time: __________ ms (Target: <100ms)

9. Caching Working: [ ] Yes [ ] No

10. Heavy Components Lazy Loaded: [ ] Yes [ ] No
```

---

## Quick Fixes Priority Order

1. **Database Region Match** (5 min) - If mismatched, huge impact
2. **Check Environment Variables** (5 min) - Ensure no `connection_limit=1`
3. **Add Missing Indexes** (15 min) - Run SQL from main document
4. **Implement Keep-Alive Pings** (30 min) - Prevent cold starts
5. **Cache Authentication** (1 hour) - Add caching to `getUnifiedAuth()`
6. **Lazy Load Components** (2 hours) - Reduce bundle size
7. **Optimize Bundle** (4-6 hours) - Replace heavy libraries

---

## Tools for Monitoring

### Vercel Analytics
- Function performance
- Cold start frequency
- Response times

### Supabase Dashboard
- Query performance
- Database metrics
- Connection pool status

### Browser DevTools
- Network tab (API calls)
- Performance tab (LCP, FCP, TTI)
- Lighthouse (overall score)

### Next.js Bundle Analyzer
```bash
npm install @next/bundle-analyzer
# Add to next.config.ts
# Run: ANALYZE=true npm run build
```

---

## Expected Results After Fixes

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| TTFB | 1.74s | 600-800ms | ~1s faster |
| LCP | 8s | 2-3s | ~5s faster |
| API Response | 800ms-2s | 400-600ms | ~500ms faster |
| Bundle Size | 491KB | <300KB | ~200KB smaller |

