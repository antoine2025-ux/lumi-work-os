# Redirect Test Matrix

**Purpose:** Verify redirect logic works correctly across all scenarios  
**Status:** ⚠️ **NOT YET EXECUTED** - Test cases defined, need execution

---

## Test Environment Setup

**Prerequisites:**
- Fresh database (or test user)
- Development server running: `pnpm dev`
- Browser with dev tools open (Network + Console tabs)
- Clear browser cookies/localStorage before each test

**Test User States:**
- **User A:** No account (fresh)
- **User B:** Account exists, 0 workspaces
- **User C:** Account exists, 1 workspace
- **User D:** Account exists, 2+ workspaces

---

## Test Cases

### TC-1: Unauthenticated User Hits Protected Route

**Steps:**
1. Clear all cookies/localStorage
2. Navigate to `http://localhost:3000/dashboard`
3. Observe redirect behavior

**Expected:**
- Redirect to `/login?callbackUrl=/dashboard`
- No infinite loops
- Console shows redirect decision: "Not authenticated"

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Check middleware logs
- Check client-side redirect handler logs

---

### TC-2: Authenticated User Hits /login

**Steps:**
1. Sign in with Google OAuth
2. After successful login, manually navigate to `/login`
3. Observe redirect behavior

**Expected:**
- Redirect to `/home` or workspace dashboard
- No infinite loops
- Console shows redirect decision: "All checks passed" or redirect to home

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Should not redirect back to `/login` (infinite loop)

---

### TC-3: Authenticated User with 0 Workspaces

**Steps:**
1. Create user account via OAuth
2. Ensure user has NO workspace memberships
3. Navigate to `/home` or `/dashboard`
4. Observe redirect behavior

**Expected:**
- Redirect to `/welcome` (onboarding page)
- No infinite loops
- Console shows redirect decision: "No workspace found"

**Actual:** ❓ **NOT TESTED**

**Notes:**
- May need to manually delete workspace memberships in DB

---

### TC-4: Authenticated User with 1 Workspace

**Steps:**
1. Sign in with user who has exactly 1 workspace
2. Navigate to `/home`
3. Observe redirect behavior

**Expected:**
- Load `/home` successfully
- No redirects
- Workspace context resolved correctly

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Check that workspaceId is set in session
- Check that API calls include workspaceId

---

### TC-5: Authenticated User with Multiple Workspaces

**Steps:**
1. Sign in with user who has 2+ workspaces
2. Navigate to `/home`
3. Observe redirect behavior

**Expected:**
- Load `/home` successfully
- First workspace selected (or workspace selector shown)
- No redirects

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Check workspace selection logic
- Verify `/api/workspaces` returns all workspaces (not just first)

---

### TC-6: Deep Link to Project Route

**Steps:**
1. Sign in with authenticated user
2. Navigate directly to `/dashboard/projects/[projectId]` (valid project ID)
3. Observe redirect behavior

**Expected:**
- Load project page successfully
- No redirects to `/login` or `/welcome`
- Project data loads correctly

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Test with valid project ID
- Test with invalid project ID (should 404, not redirect)

---

### TC-7: Session Expiry Mid-Navigation

**Steps:**
1. Sign in with authenticated user
2. Manually expire session (delete cookie or wait for expiry)
3. Navigate to protected route
4. Observe redirect behavior

**Expected:**
- Redirect to `/login?callbackUrl=[current-path]`
- No infinite loops
- Session expiry handled gracefully

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Can simulate by deleting `next-auth.session-token` cookie
- Check that `useSession()` detects expiry

---

### TC-8: Hard Refresh on Protected Route

**Steps:**
1. Sign in with authenticated user
2. Navigate to `/dashboard`
3. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
4. Observe redirect behavior

**Expected:**
- Page reloads successfully
- No redirects
- Session persists across refresh

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Check Network tab for session cookie
- Check that `useSession()` rehydrates correctly

---

### TC-9: OAuth Callback Return

**Steps:**
1. Start from unauthenticated state
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Observe redirect after callback

**Expected:**
- Redirect to `callbackUrl` if provided
- Redirect to `/home` if no callbackUrl
- No infinite loops
- Session created successfully

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Test with `callbackUrl=/dashboard/projects/123`
- Test without callbackUrl
- Check NextAuth logs for callback execution

---

### TC-10: Logout Then Back Button

**Steps:**
1. Sign in with authenticated user
2. Navigate to `/dashboard`
3. Click logout
4. Press browser back button
5. Observe redirect behavior

**Expected:**
- Back button shows cached page (browser behavior)
- On interaction, redirects to `/login`
- No infinite loops

**Actual:** ❓ **NOT TESTED**

**Notes:**
- Browser back button may show cached content
- Check that protected routes redirect on navigation

---

## Test Execution Log

| Test Case | Status | Executed By | Date | Notes |
|-----------|--------|-------------|------|-------|
| TC-1 | ❌ Not Tested | - | - | - |
| TC-2 | ❌ Not Tested | - | - | - |
| TC-3 | ❌ Not Tested | - | - | - |
| TC-4 | ❌ Not Tested | - | - | - |
| TC-5 | ❌ Not Tested | - | - | - |
| TC-6 | ❌ Not Tested | - | - | - |
| TC-7 | ❌ Not Tested | - | - | - |
| TC-8 | ❌ Not Tested | - | - | - |
| TC-9 | ❌ Not Tested | - | - | - |
| TC-10 | ❌ Not Tested | - | - | - |

---

## Root Cause Analysis (For Failures)

**If TC-X fails, document:**

1. **Observed Behavior:**
   - What actually happened?
   - Console errors?
   - Network requests?

2. **Root Cause:**
   - Which component failed?
   - Redirect handler?
   - Middleware?
   - Layout component?

3. **Fix Plan:**
   - Specific code changes needed
   - Files to modify
   - Test to verify fix

---

## Automated Test Script (Future)

**TODO:** Create Playwright/E2E tests for these scenarios

```typescript
// Example test structure
test('TC-1: Unauthenticated user redirects to login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
  const url = page.url()
  expect(url).toContain('callbackUrl=/dashboard')
})
```

---

**Status:** ⚠️ **TEST CASES DEFINED - EXECUTION REQUIRED**
