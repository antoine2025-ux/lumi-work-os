# Performance Validation Checklist

This checklist helps validate performance improvements before and after optimizations.

## Pre-Implementation Baseline

### Server Metrics (Collect for 24 hours)

- [ ] `getUnifiedAuth` p50, p95, p99 durations
- [ ] `/api/auth/user-status` p50, p95, p99 durations
- [ ] `/api/org/positions` p50, p95, p99 durations
- [ ] `/api/projects` p50, p95, p99 durations
- [ ] `/api/workspaces/[workspaceId]` p50, p95, p99 durations
- [ ] Database query duration per endpoint
- [ ] Error rates per endpoint

### Client Metrics (Collect for 24 hours)

- [ ] Time to First Byte (TTFB) - p50, p95, p99
- [ ] First Contentful Paint (FCP) - p50, p95, p99
- [ ] Largest Contentful Paint (LCP) - p50, p95, p99
- [ ] Time to Interactive (TTI) - p50, p95, p99
- [ ] Total Blocking Time (TBT) - p50, p95, p99
- [ ] Cumulative Layout Shift (CLS) - p50, p95, p99

### Network Waterfall Analysis

- [ ] Screenshot of Network tab for `/w/[workspaceSlug]/org` page load
- [ ] Screenshot of Network tab for `/w/[workspaceSlug]/settings` page load
- [ ] Screenshot of Network tab for dashboard home (`/home`) page load
- [ ] Count of sequential vs parallel requests
- [ ] Total time from HTML load to content visible

---

## Quick Wins Validation

### 1. Database Indexes

**Before:**
- [ ] Run `EXPLAIN ANALYZE` on org positions query
- [ ] Note query execution time
- [ ] Check for sequential scans

**After:**
- [ ] Run `EXPLAIN ANALYZE` on same query
- [ ] Verify index usage (should show "Index Scan")
- [ ] Measure query execution time reduction
- [ ] **Target:** 50-150ms reduction

**Validation:**
```sql
-- Check if indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('workspace_members', 'org_positions', 'projects', 'wiki_pages');

-- Test query performance
EXPLAIN ANALYZE 
SELECT * FROM org_positions 
WHERE workspace_id = 'test-workspace-id' AND is_active = true;
```

---

### 2. Bundle Auth + Role

**Before:**
- [ ] Count requests: `/api/auth/user-status` + `/api/workspaces/[id]/user-role`
- [ ] Measure total time for both requests
- [ ] Check Network tab waterfall

**After:**
- [ ] Verify `/api/auth/user-status` returns `role` field
- [ ] Verify `/api/workspaces/[id]/user-role` is no longer called
- [ ] Measure single request time
- [ ] **Target:** 100-200ms reduction, 1 fewer request

**Validation:**
```bash
# Test user-status response
curl -H "Cookie: ..." https://your-app.com/api/auth/user-status | jq '.role'
# Should return: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
```

---

### 3. Reduce Org Positions Payload

**Before:**
- [ ] Measure `/api/org/positions` response size (in Network tab)
- [ ] Measure response time
- [ ] Count nested objects in response

**After:**
- [ ] Measure new response size
- [ ] Measure new response time
- [ ] Verify UI still works (no broken features)
- [ ] **Target:** 70-80% smaller payload, 200-400ms faster

**Validation:**
```bash
# Compare response sizes
curl -H "Cookie: ..." https://your-app.com/api/org/positions | wc -c
# Before: ~50-200KB
# After: ~10-40KB
```

---

## Medium Fixes Validation

### 1. Server Components Conversion

**Before:**
- [ ] Measure client-side data fetching time
- [ ] Count React Query requests on page load
- [ ] Measure TTI

**After:**
- [ ] Verify data is fetched server-side (check Network tab - no client requests)
- [ ] Measure new TTI
- [ ] Verify hydration works correctly
- [ ] **Target:** 500-800ms reduction in TTI

**Validation:**
- Check Network tab: Should see data in initial HTML (view page source)
- No client-side `/api/*` requests on initial load
- React DevTools: Verify server components are marked as such

---

### 2. Suspense Boundaries

**Before:**
- [ ] Measure time until first content visible
- [ ] Note if entire page is blank until all data loads

**After:**
- [ ] Verify skeleton loaders appear immediately
- [ ] Verify content appears progressively
- [ ] Measure perceived load time
- [ ] **Target:** Instant perceived load, progressive enhancement

**Validation:**
- Open DevTools → Performance tab
- Record page load
- Verify skeleton appears before data loads
- Verify content streams in progressively

---

### 3. Prisma Query Optimization

**Before:**
- [ ] Measure database query duration (from logs)
- [ ] Count number of queries per endpoint
- [ ] Measure response payload size

**After:**
- [ ] Measure new query duration
- [ ] Count new number of queries (should be same or fewer)
- [ ] Measure new payload size
- [ ] **Target:** 200-400ms reduction per endpoint

**Validation:**
- Check server logs for `dbDurationMs` before/after
- Use Prisma query logging to count queries
- Compare Network tab response sizes

---

## Post-Implementation Metrics

### Server Metrics (Collect for 24 hours after changes)

- [ ] `getUnifiedAuth` p50, p95, p99 durations (compare to baseline)
- [ ] `/api/auth/user-status` p50, p95, p99 durations
- [ ] `/api/org/positions` p50, p95, p99 durations
- [ ] `/api/projects` p50, p95, p99 durations
- [ ] Database query duration per endpoint
- [ ] Error rates (should not increase)

### Client Metrics (Collect for 24 hours after changes)

- [ ] TTFB - compare to baseline
- [ ] FCP - compare to baseline
- [ ] LCP - compare to baseline
- [ ] TTI - compare to baseline (target: <3s)
- [ ] TBT - compare to baseline
- [ ] CLS - compare to baseline

### Success Criteria

**Quick Wins:**
- ✅ 30-40% reduction in API endpoint durations
- ✅ 1-2 fewer requests on initial page load
- ✅ 30-50% reduction in payload sizes

**Medium Fixes:**
- ✅ 50-60% total reduction in TTI
- ✅ <3s TTI for dashboard
- ✅ Progressive rendering (no blank screens)

**Full Implementation:**
- ✅ 70-85% total reduction in TTI
- ✅ <1.5s TTI for dashboard
- ✅ <200ms p95 for all API endpoints

---

## Monitoring Dashboard

### Key Metrics to Track

1. **API Response Times:**
   - `getUnifiedAuth` duration
   - `/api/auth/user-status` duration
   - `/api/org/positions` duration
   - `/api/projects` duration

2. **Database Performance:**
   - Query duration per endpoint
   - Slow query count (>500ms)
   - Index usage (from EXPLAIN ANALYZE)

3. **Client Performance:**
   - TTI distribution
   - LCP distribution
   - Request count per page load

4. **Error Rates:**
   - 5xx errors (should not increase)
   - Timeout errors
   - Database connection errors

### Alert Thresholds

- ⚠️ **Warning:** p95 duration > baseline + 20%
- 🔴 **Critical:** p95 duration > baseline + 50%
- 🔴 **Critical:** Error rate > 1%

---

## Rollback Plan

If performance degrades:

1. **Immediate:**
   - [ ] Revert last deployment
   - [ ] Check error logs
   - [ ] Verify database indexes are working

2. **Investigation:**
   - [ ] Compare before/after metrics
   - [ ] Check for N+1 queries introduced
   - [ ] Verify cache invalidation is working

3. **Fix:**
   - [ ] Address root cause
   - [ ] Re-test in staging
   - [ ] Re-deploy with fix

---

## Notes

- All metrics should be collected in production (or production-like staging)
- Use percentiles (p50, p95, p99) not averages (outliers skew averages)
- Compare same time periods (e.g., weekday mornings)
- Account for traffic variations
- Monitor for at least 24 hours before declaring success

---

**Last Updated:** January 2025
