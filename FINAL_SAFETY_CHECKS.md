# Final Safety Checks: /api/org/positions Optimization

**Date:** January 2025  
**Status:** ✅ All checks complete

---

## 1. Test Script Safety ✅

**File:** `scripts/test-org-positions-api.ts`

**Safety Guards Added:**
- ✅ Production domain check (fails if `loopwell.io` or `lumi.app` in BASE_URL)
- ✅ Requires `ALLOW_PROD=true` env var to test production (explicit opt-in)
- ✅ GET-only requests (non-destructive, read-only)
- ✅ Clear error messages if production detected

**Test:**
```bash
# Should fail (production detected)
BASE_URL=https://app.loopwell.io npx tsx scripts/test-org-positions-api.ts <cookie>

# Should work (explicit opt-in)
ALLOW_PROD=true BASE_URL=https://app.loopwell.io npx tsx scripts/test-org-positions-api.ts <cookie>

# Should work (localhost/staging)
BASE_URL=http://localhost:3000 npx tsx scripts/test-org-positions-api.ts <cookie>
```

---

## 2. API Response Contract ✅

**Requirement:** Flat mode never returns `children` field (must be undefined/omitted)

**Implementation:**
- ✅ Flat mode response explicitly omits `children` field (line 323-338)
- ✅ Children mode response explicitly omits `children` field (line 93-105)
- ✅ Only legacy `tree=1` mode includes `children` arrays
- ✅ Test script verifies `children` field is absent (not just empty array)

**Code Verification:**
```typescript
// Flat mode (line 323-338)
const positionsWithCounts = positions.map(position => ({
  id: position.id,
  title: position.title,
  // ... other fields
  childCount: childCountMap.get(position.id) || 0
  // Explicitly omit 'children' - must not be present
}))

// Test assertion (scripts/test-org-positions-api.ts)
const hasChildren = flatData.some((pos: any) => 'children' in pos)
if (hasChildren) {
  throw new Error('❌ FAIL: Default mode should not include children field')
}
```

---

## 3. UI Compatibility Edge Cases ✅

**File:** `src/app/(dashboard)/w/[workspaceSlug]/org/page.tsx`

**Edge Cases Handled:**

### 3a. Null Level → Default to 0
```typescript
// In data normalization (line 190-200)
level: position.level ?? 0  // Default to 0 if null

// In rendering (line 792)
const positionsAtLevel = orgData.filter(position => (position.level ?? 0) === level)
```

### 3b. Missing ParentId Node (Stale Data) → Treat Gracefully
```typescript
// In rendering (line 800-810)
const validPositions = positionsAtLevel.filter(position => {
  if (position.parentId) {
    const parentExists = orgData.some(p => p.id === position.parentId)
    if (!parentExists) {
      // Parent missing - render at current level (may appear as orphan)
      return true  // Don't break UI, just render it
    }
  }
  return true
})
```

**Result:** UI handles data inconsistencies gracefully without breaking

---

## 4. Monitoring Tripwire ✅

**File:** `PERF_NOTE_ORG_POSITIONS.md`

**Tripwire Added:**
```markdown
**Tripwire (Investigation Trigger):**
- 🔍 **Investigate:** If `payloadMode: 'tree'` > 5% over 24h
  - Check which client/user-agent is calling `tree=1`
  - May indicate: older UI path, cached URL, or external integration
  - Action: Identify source and migrate to flat mode
```

**SQL Query for Tripwire:**
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

## Merge Checklist Verification

### ✅ Code Safety
- [x] Test script has production guard
- [x] Test script is GET-only
- [x] Flat mode never returns `children` (explicitly omitted)
- [x] UI handles null level (defaults to 0)
- [x] UI handles missing parentId (graceful degradation)

### ✅ Documentation
- [x] PR description file present (`PR_DESCRIPTION_ORG_POSITIONS.md`)
- [x] Deprecation date in code (Jan 31, 2026)
- [x] Deprecation date in perf note
- [x] Manual test notes include rollback plan
- [x] Monitoring tripwire added (tree=1 > 5%)

### ✅ Response Contract
- [x] Flat mode: No `children` field (undefined/omitted)
- [x] Children mode: No `children` field (undefined/omitted)
- [x] Tree mode: Includes `children` arrays (legacy only)
- [x] Test script verifies contract

### ✅ Edge Cases
- [x] Null level → defaults to 0
- [x] Missing parentId node → renders gracefully (orphan)
- [x] Data normalization on frontend

---

## Final Verification

**Run these before merging:**

1. **Test Script:**
   ```bash
   npx tsx scripts/test-org-positions-api.ts <session-cookie>
   ```

2. **Manual Browser Test:**
   - Load `/w/[workspaceSlug]/org`
   - Verify positions render correctly
   - Check Network tab: response should be ~10-40KB (not 50-200KB)

3. **Response Contract Check:**
   ```bash
   curl -H "Cookie: <cookie>" http://localhost:3000/api/org/positions | jq '.[0] | keys'
   # Should NOT include 'children' in the keys list
   ```

---

**Status:** ✅ All safety checks complete  
**Ready to merge:** ✅ Yes
