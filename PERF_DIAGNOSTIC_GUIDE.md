# Performance Diagnostic Guide

**Date:** January 2025  
**Issue:** User reports no visible speed improvements after optimizations

---

## What We've Optimized

### ✅ Task A: User Status + Role Consolidation
- **Change:** Included `role` in `/api/auth/user-status` response
- **Expected Impact:** Eliminated 1 API request (100-200ms saved)
- **Status:** ✅ Deployed

### ✅ Task B: Org Positions Optimization
- **Change:** Default flat mode with `childCount` (70-80% smaller payload)
- **Expected Impact:** 50-60% faster (100-300ms vs 300-800ms)
- **Status:** ✅ Deployed

### ✅ Task C: Performance Instrumentation
- **Change:** Added timing logs to `/api/org/departments` and `/api/admin/users`
- **Status:** ✅ Just added (needs deployment)

---

## Why You Might Not See Improvements

### 1. **Sequential Waterfall Still Exists**

The org page still has a sequential pattern:
```
1. Fetch /api/auth/user-status (200-400ms) ← WAIT
2. Then fetch /api/org/positions (100-300ms) ← Parallel
3. Then fetch /api/org/departments (100-200ms) ← Parallel
4. Then fetch /api/admin/users (200-400ms) ← Parallel (if admin)
```

**Total:** 200-400ms (user-status) + max(100-300ms, 100-200ms, 200-400ms) = **400-800ms**

Even if `/api/org/positions` is faster, the page still waits for `user-status` first.

### 2. **Other Endpoints May Be Slow**

- `/api/org/departments` uses `include: { teams: ... }` - could be slow with many teams
- `/api/admin/users` has nested `workspaceMemberships` query - could be slow with many users
- These endpoints weren't instrumented before, so we couldn't see if they were bottlenecks

### 3. **Database Indexes May Be Missing**

If these queries are slow, it might be due to missing indexes:
- `org_departments.workspace_id + is_active`
- `org_teams.department_id + is_active`
- `users` table for workspace membership lookups

### 4. **Payload Size vs Response Time**

The optimization reduced **payload size** (70-80% smaller), but if the **database query** is still slow, you won't see much improvement in total time.

---

## How to Diagnose

### Step 1: Check Production Logs

After deploying the instrumentation, check logs for:

```bash
# Look for these log entries:
grep "org/positions GET" logs | grep "payloadMode"
grep "org/departments GET" logs | grep "durationMs"
grep "admin/users GET" logs | grep "durationMs"
```

**What to look for:**
- `payloadMode: 'flat'` (not `'tree'`) - confirms optimization is active
- `dbDurationMs` > 300ms - indicates slow database queries
- `durationMs` > 500ms - indicates slow endpoint overall

### Step 2: Check Browser DevTools

1. Open Network tab
2. Reload the org page
3. Check timing for each request:
   - `/api/auth/user-status` - should be 150-300ms
   - `/api/org/positions` - should be 100-300ms (was 300-800ms)
   - `/api/org/departments` - check if this is slow
   - `/api/admin/users` - check if this is slow

**Look for:**
- Which request is the slowest?
- Is there a sequential waterfall?
- Are requests happening in parallel or sequentially?

### Step 3: Check Database Performance

If `dbDurationMs` is high, check database indexes:

```sql
-- Check if indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('org_positions', 'org_departments', 'org_teams', 'workspace_members');

-- Check query performance
EXPLAIN ANALYZE 
SELECT * FROM org_positions 
WHERE workspace_id = '...' AND is_active = true;
```

---

## Next Steps Based on Findings

### If `/api/org/positions` is still slow:
- Check if it's using `tree=1` mode (should be `flat`)
- Check `dbDurationMs` - if >300ms, optimize query or add indexes
- Check if there are many positions (>200) - may need pagination

### If `/api/org/departments` is slow:
- Optimize query: use `select` instead of `include` for teams
- Add database indexes
- Consider lazy-loading teams

### If `/api/admin/users` is slow:
- Optimize query: reduce nested `workspaceMemberships` complexity
- Add database indexes
- Consider pagination for large workspaces

### If sequential waterfall is the issue:
- Use React Query's `useUserStatus` hook from layout (already available)
- Start fetching org data earlier (don't wait for user-status)
- Consider Server Components for initial data fetch

---

## Quick Fixes to Try

### 1. Optimize Sequential Waterfall

The org page could use the `userStatus` from the layout instead of fetching again:

```typescript
// Instead of fetching user-status again, use it from layout context
// Or start fetching org data in parallel with user-status
```

### 2. Add Database Indexes

If queries are slow, add these indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_org_departments_workspace_active 
ON org_departments(workspace_id, is_active);

CREATE INDEX IF NOT EXISTS idx_org_teams_department_active 
ON org_teams(department_id, is_active);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_user 
ON workspace_members(workspace_id, user_id);
```

### 3. Optimize Departments Query

Change from `include` to `select` to reduce payload:

```typescript
// Instead of:
include: { teams: { ... } }

// Use:
select: {
  id: true,
  name: true,
  teams: { select: { id: true, name: true } }
}
```

---

## Expected Improvements After Fixes

- **Sequential waterfall fix:** 200-400ms reduction
- **Database indexes:** 50-150ms reduction per query
- **Query optimization:** 100-200ms reduction per endpoint

**Total potential:** 350-750ms faster page load

---

## Monitoring

After fixes, monitor these metrics:

1. **`payloadMode` distribution:** Should be 95%+ `'flat'` (not `'tree'`)
2. **`dbDurationMs` p95:** Target <300ms
3. **`durationMs` p95:** Target <500ms for all endpoints
4. **`tree=1` usage:** Should be <5% (tripwire)

---

## Questions to Answer

1. **What are the actual `durationMs` values in production logs?**
2. **Which endpoint is the slowest?** (positions, departments, or users)
3. **Is `payloadMode: 'flat'` being used?** (not `'tree'`)
4. **What is the `dbDurationMs`?** (database query time)
5. **Are there sequential waterfalls in the browser?** (check Network tab)

Once we have these answers, we can target the specific bottleneck.
