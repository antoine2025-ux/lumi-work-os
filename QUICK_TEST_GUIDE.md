# Quick Test Guide - Pre-Merge Development Testing

**Time:** ~10-15 minutes  
**Purpose:** Verify changes work correctly before merging

---

## 1. Start Dev Server

```bash
npm run dev
```

---

## 2. Test Task A: Role in User-Status (5 min)

### Test Steps:

1. **Open browser DevTools → Network tab**
2. **Navigate to any dashboard page** (e.g., `/w/[workspaceSlug]/org`)
3. **Check Network requests:**

   **Expected:**
   - ✅ `GET /api/auth/user-status` returns `role` field
   - ✅ No `GET /api/workspaces/[id]/user-role` request (eliminated!)
   - ✅ UI loads correctly with role from user-status

4. **Verify in Console:**
   ```javascript
   // In browser console
   fetch('/api/auth/user-status', { credentials: 'include' })
     .then(r => r.json())
     .then(data => console.log('Role:', data.role))
   // Should show: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
   ```

5. **Check Org Page:**
   - Navigate to `/w/[workspaceSlug]/org`
   - Should load without errors
   - Should not show "loading role" state (role comes with user-status)

6. **Check Settings Page:**
   - Navigate to `/w/[workspaceSlug]/settings`
   - Should load without errors
   - Role-based tabs should work correctly

**✅ Pass if:** No `/user-role` requests, role works in UI, no console errors

---

## 3. Test Task B: Org Positions Optimization (5 min)

### Test Steps:

1. **Open Org Page:**
   - Navigate to `/w/[workspaceSlug]/org`
   - Open DevTools → Network tab

2. **Check Default Request:**
   - Find `GET /api/org/positions`
   - **Expected:**
     - ✅ Response time: ~100-300ms (not 300-800ms)
     - ✅ Payload size: ~10-40KB (not 50-200KB)
     - ✅ Response is flat array (no nested `children` arrays)
     - ✅ Each position has `childCount` field

3. **Verify Response Structure:**
   ```javascript
   // In browser console
   fetch('/api/org/positions', { credentials: 'include' })
     .then(r => r.json())
     .then(data => {
       console.log('Count:', data.length)
       console.log('Has children?', data.some(p => 'children' in p)) // Should be false
       console.log('Has childCount?', data.every(p => typeof p.childCount === 'number')) // Should be true
       console.log('Sample:', data[0])
     })
   ```

4. **Verify UI Renders:**
   - Org chart should display correctly
   - Positions grouped by level
   - No console errors
   - No "missing data" errors

5. **Test Legacy Mode (Optional):**
   ```javascript
   // Test tree=1 still works
   fetch('/api/org/positions?tree=1', { credentials: 'include' })
     .then(r => r.json())
     .then(data => {
       console.log('Tree mode has children?', data.some(p => Array.isArray(p.children)))
     })
   ```

**✅ Pass if:** Flat mode works, UI renders, no `children` in default mode, faster response

---

## 4. Check Server Logs (2 min)

**Look for performance logs:**

```bash
# In terminal where dev server is running, look for:
# ✅ "user-status" logs with role query duration
# ✅ "org/positions GET" logs with payloadMode: 'flat'
# ✅ No errors or warnings
```

**Expected log entries:**
```
ℹ️  [INFO] user-status
  Context: { durationMs: 150.23, role: "ADMIN", workspaceIdHash: "abc123" }

ℹ️  [INFO] org/positions GET
  Context: { payloadMode: "flat", resultCount: 25, dbDurationMs: 120.45 }
```

---

## 5. Edge Case Tests (3 min)

### Test Null Level Handling:
- If you have positions with `level: null` in database, they should default to 0
- UI should render them (not crash)

### Test Missing Parent:
- If a position has `parentId` pointing to deleted position, UI should render it gracefully
- Should not crash or show errors

### Test Empty Org:
- Workspace with no positions should load without errors
- Should show "No positions yet" message

---

## 6. Quick Smoke Test Checklist

- [ ] Dashboard loads without errors
- [ ] Org page loads and renders positions
- [ ] Settings page loads (role-based tabs work)
- [ ] No `/api/workspaces/[id]/user-role` requests in Network tab
- [ ] `/api/org/positions` response is faster and smaller
- [ ] No console errors
- [ ] No TypeScript errors (`npm run type-check` if available)

---

## If Something Breaks

### Rollback Steps:

1. **Task A (Role):** Revert `src/app/api/auth/user-status/route.ts` and frontend files
2. **Task B (Org):** Add `?tree=1` to org page fetch temporarily:
   ```typescript
   // In org/page.tsx
   fetch(`/api/org/positions?tree=1`, fetchOptions)
   ```

3. **Investigate:** Check console errors, network tab, server logs

---

## Expected Results

**Performance:**
- User-status: 1 fewer request (role included)
- Org positions: 50-60% faster, 70-80% smaller payload

**Functionality:**
- All pages load correctly
- Role-based features work
- Org chart renders correctly
- No regressions

---

**Time to test:** ~10-15 minutes  
**If all pass:** ✅ Ready to merge  
**If issues:** Fix before merging
