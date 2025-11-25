# Performance Troubleshooting Guide

Quick reference for diagnosing and fixing performance issues in production.

## Quick Diagnostic Checklist

### 1. Check Database Region Match ⚡ (5 min)

**Problem:** Database in different region adds 200-500ms latency per query

**Check:**
1. Vercel: Project → Settings → General → "Deployment Region"
2. Supabase: Project Settings → Infrastructure → "Database Region"

**Fix:** Change Vercel deployment region to match Supabase (or vice versa)

---

### 2. Check Vercel Environment Variables ⚡ (5 min)

**Problem:** `connection_limit=1` forces sequential queries

**Check:**
- Vercel Dashboard → Project → Settings → Environment Variables
- Find `DATABASE_URL`
- Verify it does NOT contain `connection_limit=1`

**Fix:** Remove `connection_limit=1` if present and redeploy

---

### 3. Check Bundle Size ⚡ (5 min)

**Problem:** Large bundles block rendering

**Check:**
```bash
npm run build
# Look for "First Load JS" - should be <300KB
```

**Fix:** See bundle optimization in main performance guide

---

### 4. Check Cold Start Frequency ⚡ (5 min)

**Problem:** Serverless cold starts add 1-3s delay

**Check:**
- Vercel Dashboard → Analytics → Functions
- "Cold Start" percentage should be <10%

**Fix:** Implement keep-alive pings or upgrade to Vercel Pro

---

### 5. Check Network Tab ⚡ (5 min)

**Problem:** Sequential API calls or large payloads

**Check:**
- Browser DevTools → Network tab
- API response times (should be <500ms)
- Sequential vs parallel requests
- Large JavaScript bundles (>500KB)

**Fix:**
- Sequential calls → Use `Promise.all()`
- Large payloads → Use `select` instead of `include`
- Large bundles → Lazy load components

---

### 6. Check Database Indexes ⚡ (15 min)

**Problem:** Missing indexes cause slow queries

**Check:**
```sql
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

**Expected Indexes:**
- `idx_workspace_members_user_workspace` on `workspace_members(userId, workspaceId)`
- `idx_wiki_pages_workspace_published` on `wiki_pages(workspaceId, isPublished)`
- `idx_projects_workspace_created` on `projects(workspaceId, createdAt)`
- `idx_tasks_workspace_status` on `tasks(workspaceId, status)`

**Fix:** Add missing indexes (see PERFORMANCE_GUIDE.md for SQL)

---

### 7. Check Authentication Query Performance ⚡ (10 min)

**Problem:** `getUnifiedAuth()` called on every request

**Check:**
- Supabase Dashboard → Database → Query Performance
- Queries from `getUnifiedAuth` should be <100ms

**Fix:** Add caching to `getUnifiedAuth()` function (30-60s TTL)

---

### 8. Check API Route Caching ⚡ (5 min)

**Problem:** No caching headers on API responses

**Check:**
- Browser DevTools → Network tab → Response Headers
- Should see `Cache-Control` header
- Should see `X-Cache: HIT` on second request

**Fix:** Already implemented, but verify it's working

---

### 9. Check React Query Usage ⚡ (10 min)

**Problem:** Raw `fetch` calls instead of React Query

**Check:**
- Search codebase for `fetch(` vs `useQuery`
- All data fetching should use `useQuery`

**Fix:** Convert remaining `fetch` calls to `useQuery`

---

### 10. Check Lazy Loading ⚡ (10 min)

**Problem:** Heavy components loaded upfront

**Check:**
- Search codebase for `dynamic()` imports
- TipTap editor should be lazy loaded
- Charts should be lazy loaded
- Tree view should be lazy loaded

**Fix:** Add `dynamic()` imports for heavy components

---

## Common Issues & Solutions

### Issue: 8s LCP (Largest Contentful Paint)

**Likely Causes:**
1. Vercel serverless cold starts (1-3s)
2. Large bundle size (491KB → should be <300KB)
3. Database region mismatch (200-500ms)
4. Sequential API calls (200-400ms)
5. Missing database indexes (100-300ms)

**Solution:** Fix in priority order:
1. Check database region match (5 min)
2. Check environment variables (5 min)
3. Add database indexes (15 min)
4. Implement keep-alive pings (30 min)
5. Optimize bundle size (4-6 hours)

---

### Issue: Slow API Responses

**Likely Causes:**
1. Missing database indexes
2. Heavy database queries (loading too much data)
3. No caching layer
4. Sequential queries instead of parallel

**Solution:**
1. Add database indexes (see PERFORMANCE_GUIDE.md)
2. Use `select` instead of `include` in Prisma queries
3. Enable Redis caching
4. Use `Promise.all()` for parallel API calls

---

### Issue: High Database Load

**Likely Causes:**
1. No caching layer
2. N+1 queries
3. Loading unnecessary data

**Solution:**
1. Enable Redis caching
2. Use React Query for client-side caching
3. Optimize queries with `select` instead of `include`
4. Add query limits (`take: 50`)

---

## Performance Test Results Template

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
3. **Add Missing Indexes** (15 min) - Run SQL from PERFORMANCE_GUIDE.md
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

---

For detailed optimization steps, see `PERFORMANCE_GUIDE.md`.



