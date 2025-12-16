# Merge Checklist: /api/org/positions Optimization

**Date:** January 2025  
**Status:** ✅ Ready for merge

---

## Pre-Merge Checklist

### ✅ Code Changes
- [x] API endpoint optimized with flat mode default
- [x] Lazy-load children mode implemented
- [x] Legacy `tree=1` mode preserved (deprecated)
- [x] Frontend interface updated
- [x] Edge case handling added (null level, missing parentId)

### ✅ Safety Checks
- [x] Test script has production guard (BASE_URL check)
- [x] Test script is GET-only (non-destructive)
- [x] Flat mode never returns `children` field (explicitly omitted)
- [x] UI handles null level (defaults to 0)
- [x] UI handles missing parentId (treats as root/orphan gracefully)

### ✅ Documentation
- [x] PR description file present (`PR_DESCRIPTION_ORG_POSITIONS.md`)
- [x] Deprecation date in code (Jan 31, 2026)
- [x] Deprecation date in perf note
- [x] Manual test notes include rollback plan
- [x] Monitoring guidance with tripwire (tree=1 > 5%)

### ✅ Security & Authorization
- [x] All queries use `auth.workspaceId` (not client-provided)
- [x] Authorization checks intact (`getUnifiedAuth` + `assertAccess`)
- [x] Logs use `workspaceIdHash` (privacy-safe)

### ✅ Performance
- [x] No N+1 queries (2 queries: positions + grouped counts)
- [x] Limits in place (200 default, 100 children, 500 tree)
- [x] Instrumentation added (payloadMode, dbDurationMs, resultCount)

---

## Post-Deploy Monitoring (First 24 Hours)

### Metrics to Watch

**Payload Mode Distribution:**
- Target: 95%+ `payloadMode: 'flat'`
- Target: <5% `payloadMode: 'children'`
- Target: <1% `payloadMode: 'tree'`
- **Tripwire:** If `tree=1` > 5% over 24h → investigate source

**Performance:**
- Target: `dbDurationMs` p95 < 300ms (down from 500-700ms)
- Target: `durationMs` p95 < 400ms (down from 800-1000ms)
- Alert if p95 > 500ms (regression)

**Payload Size:**
- Expected: 10-40KB for typical org (down from 50-200KB)
- Monitor `resultCount` stays < 200 (safety limit working)

### Log Query Examples

**Check payload mode distribution:**
```sql
SELECT 
  payloadMode,
  COUNT(*) as request_count,
  PERCENTILE(dbDurationMs, 95) as p95_db_ms
FROM logs
WHERE route = '/api/org/positions'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY payloadMode
ORDER BY request_count DESC
```

**Check tree=1 usage (tripwire):**
```sql
SELECT 
  COUNT(*) as tree_requests,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM logs
WHERE route = '/api/org/positions'
  AND payloadMode = 'tree'
  AND timestamp > NOW() - INTERVAL '24 hours'
-- If percentage > 5%, investigate which clients are using tree=1
```

---

## Rollback Plan

If issues occur:

1. **Immediate:** Add `?tree=1` to frontend requests temporarily
   ```typescript
   // In org/page.tsx loadOrgData()
   fetch(`/api/org/positions?tree=1`, fetchOptions)
   ```

2. **Investigate:**
   - Check logs for errors
   - Verify database indexes exist
   - Check for data inconsistencies (null levels, missing parents)

3. **Fix & Re-deploy:**
   - Address root cause
   - Re-test in staging
   - Remove `?tree=1` after fix verified

---

## Success Criteria

**After 24 hours:**
- ✅ 95%+ requests use flat mode
- ✅ `dbDurationMs` p95 < 300ms
- ✅ No increase in error rates
- ✅ UI renders correctly
- ✅ No user-reported issues

**After 1 week:**
- ✅ `tree=1` usage < 1% (legacy mode fading)
- ✅ Performance improvements sustained
- ✅ No regressions detected

---

**Ready to merge:** ✅ Yes  
**Risk level:** Low (backward compatible, rollback available)
