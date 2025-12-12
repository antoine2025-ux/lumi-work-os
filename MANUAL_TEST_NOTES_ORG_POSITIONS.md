# Manual Test Notes: /api/org/positions Optimization

**Date:** January 2025  
**Purpose:** Verify optimized endpoint works correctly before/after deployment

---

## Quick Test Checklist

### ✅ Test 1: Default Flat Mode

**Request:**
```bash
GET /api/org/positions
```

**Expected:**
- ✅ Returns array of positions
- ✅ Each position has `childCount` field (number)
- ✅ No `children` arrays in response
- ✅ Required fields: `id`, `title`, `level`, `parentId`, `isActive`
- ✅ Response size: ~10-40KB for typical org (vs 50-200KB before)

**Verify:**
```javascript
const data = await response.json()
console.assert(Array.isArray(data), 'Response is array')
console.assert(data.every(p => typeof p.childCount === 'number'), 'All have childCount')
console.assert(data.every(p => !p.children || p.children.length === 0), 'No children arrays')
```

---

### ✅ Test 2: Lazy-Load Children Mode

**Request:**
```bash
GET /api/org/positions?includeChildren=true&parentId=<position-id>
```

**Expected:**
- ✅ Returns array of positions
- ✅ All positions have `parentId` matching the query param
- ✅ Count matches `childCount` from parent position
- ✅ Same DTO shape as flat mode

**Verify:**
```javascript
const parentId = 'pos-123'
const children = await fetch(`/api/org/positions?includeChildren=true&parentId=${parentId}`)
  .then(r => r.json())
console.assert(children.every(c => c.parentId === parentId), 'All have correct parentId')
```

---

### ✅ Test 3: Legacy Tree Mode (Deprecated)

**Request:**
```bash
GET /api/org/positions?tree=1
```

**Expected:**
- ✅ Returns array with nested `children` arrays
- ✅ Includes legacy fields: `roleDescription`, `responsibilities`, `parent.user`
- ✅ Full backward compatibility maintained

**Verify:**
```javascript
const tree = await fetch('/api/org/positions?tree=1').then(r => r.json())
console.assert(tree.some(p => Array.isArray(p.children)), 'Has nested children')
```

---

## Browser DevTools Test

1. **Open Org Page:**
   - Navigate to `/w/[workspaceSlug]/org`
   - Open DevTools → Network tab

2. **Check Request:**
   - Find `GET /api/org/positions`
   - Check response time (should be 100-300ms, not 300-800ms)
   - Check payload size (should be ~10-40KB, not 50-200KB)

3. **Verify Response:**
   - Open response in DevTools
   - Confirm no `children` arrays in default mode
   - Confirm `childCount` field exists
   - Confirm UI still renders correctly

4. **Test Lazy Loading (if implemented):**
   - Expand a position node
   - Check for new request: `GET /api/org/positions?includeChildren=true&parentId=...`
   - Verify children load correctly

---

## Production Monitoring (Post-Deploy)

### Watch These Metrics

**Log Fields to Monitor:**
```json
{
  "payloadMode": "flat" | "children" | "tree",
  "resultCount": 50,
  "dbDurationMs": 150.23,
  "durationMs": 200.45,
  "workspaceIdHash": "abc123"
}
```

**Expected Distribution:**
- `payloadMode: "flat"` → 95%+ of requests (new default)
- `payloadMode: "children"` → <5% (lazy loading)
- `payloadMode: "tree"` → <1% (legacy, should decrease over time)

**Performance Targets:**
- `dbDurationMs` p95: <300ms (down from 500-700ms)
- `durationMs` p95: <400ms (down from 800-1000ms)
- `resultCount`: <200 (safety limit working)

**Alert If:**
- `payloadMode: "tree"` > 10% of requests (legacy mode overused)
- `dbDurationMs` p95 > 500ms (regression)
- `resultCount` > 200 frequently (need pagination)

---

## Rollback Plan

If issues occur:

1. **Immediate:** Add `?tree=1` to frontend requests temporarily
2. **Investigate:** Check logs for errors, verify database indexes
3. **Fix:** Address root cause, re-test
4. **Re-deploy:** Remove `?tree=1` after fix verified

---

**Last Updated:** January 2025
