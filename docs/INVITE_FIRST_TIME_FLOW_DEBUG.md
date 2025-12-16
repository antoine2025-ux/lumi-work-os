# Invite First-Time User Flow Debug

## Problem Statement

When a brand-new user (no account, no workspace) clicks an invite link:
- **Intended flow**: `/invites/[token]` → `/login?callbackUrl=/invites/[token]` → `/invites/[token]` → accept → `/w/[slug]`
- **Actual flow**: `/invites/[token]` → `/login?callbackUrl=/invites/[token]` → `/home` → `/welcome`

The user never sees the invite page after login and is forced to create a new workspace instead of joining the invited one.

---

## End-to-End Flow Trace

### Step 1: User clicks invite link (unauthenticated)

**URL**: `/invites/[token]`

**File**: `src/app/(dashboard)/invites/[token]/page.tsx`

**Behavior**:
- Line 97-124: `useEffect` detects `status === 'unauthenticated'`
- Redirects to `/login?callbackUrl=/invites/[token]` ✓ **CORRECT**

**Intended**: `/login?callbackUrl=/invites/[token]`  
**Actual**: `/login?callbackUrl=/invites/[token]` ✓

---

### Step 2: User logs in

**URL**: `/login?callbackUrl=/invites/[token]`

**File**: `src/app/login/page.tsx`

**Behavior**:
- Line 19: Reads `callbackUrl` from search params: `/invites/[token]` ✓
- Line 98: Calls `signIn('google', { callbackUrl: '/invites/[token]' })` ✓ **CORRECT**

**Intended**: Pass `/invites/[token]` to NextAuth  
**Actual**: Passes `/invites/[token]` to NextAuth ✓

---

### Step 3: NextAuth redirect callback

**File**: `src/lib/auth.ts` (lines 90-150)

**Behavior**:
- Receives `url = '/invites/[token]'` from `signIn()` callbackUrl
- Line 105: `finalUrl = ${baseUrl}/invites/[token]` ✓ **CORRECT**
- Returns full URL: `https://loopwell.io/invites/[token]`

**Intended**: Redirect to `/invites/[token]`  
**Actual**: Redirects to `/invites/[token]` ✓

---

### Step 4: User lands on `/invites/[token]` (authenticated, no workspace)

**URL**: `/invites/[token]`

**File**: `src/app/(dashboard)/invites/[token]/page.tsx`

**Layout**: `src/app/(dashboard)/layout.tsx` (wraps all `(dashboard)` routes)

**Problem starts here**:

**File**: `src/app/(dashboard)/layout.tsx`

**Behavior** (lines 48-65):
```typescript
useEffect(() => {
  if (status === 'authenticated' && !isLoadingWorkspace && !workspaceId) {
    const workspaceJustCreated = sessionStorage.getItem('__workspace_just_created__') === 'true'
    if (!workspaceJustCreated) {
      window.location.href = '/welcome'  // ❌ REDIRECTS HERE
    }
  }
}, [status, isLoadingWorkspace, workspaceId, userStatus])
```

**Issue**: 
- User is authenticated ✓
- `workspaceId` is `null` (user hasn't accepted invite yet) ✓
- `workspaceJustCreated` flag is not set ✓
- **Result**: Redirects to `/welcome` ❌

**Intended**: Stay on `/invites/[token]` to show invite UI  
**Actual**: Redirects to `/welcome` ❌

---

### Step 5: Alternative redirect path (AuthWrapper)

**File**: `src/components/auth-wrapper.tsx`

**Behavior** (lines 144-149):
```typescript
if (userStatus.isFirstTime || !userStatus.workspaceId) {
  console.log('[AuthWrapper] No workspace found, redirecting to welcome')
  hasRedirected.current = true
  window.location.href = '/welcome'  // ❌ ALSO REDIRECTS HERE
  return
}
```

**Issue**: 
- If `AuthWrapper` wraps the invite page, it also checks for workspace
- If no workspace, redirects to `/welcome` ❌
- **Does NOT check if user is on `/invites/[token]`**

**Intended**: Allow invite flow to proceed  
**Actual**: Redirects to `/welcome` ❌

---

## Root Cause Analysis

### Primary Issue: Layout redirects before invite can be accepted

**Location**: `src/app/(dashboard)/layout.tsx` lines 48-65

**Problem**: The dashboard layout checks for workspace membership and redirects to `/welcome` if:
1. User is authenticated
2. No workspace ID found
3. `__workspace_just_created__` flag is not set

**Why it breaks invites**:
- User lands on `/invites/[token]` after login
- User has no workspace yet (they need to accept the invite first)
- Layout immediately redirects to `/welcome` before user can see/accept the invite

### Secondary Issue: AuthWrapper also redirects

**Location**: `src/components/auth-wrapper.tsx` lines 144-149

**Problem**: Similar check - if no workspace, redirect to `/welcome`

**Why it breaks invites**:
- Same logic - doesn't check if user is on an invite page
- Redirects before invite can be accepted

---

## Decision Points

### Decision Point 1: Dashboard Layout Workspace Check

**File**: `src/app/(dashboard)/layout.tsx`  
**Line**: 50-54  
**Condition**: `status === 'authenticated' && !isLoadingWorkspace && !workspaceId && !workspaceJustCreated`  
**Action**: `window.location.href = '/welcome'`  
**Issue**: Does not check if pathname starts with `/invites`

### Decision Point 2: AuthWrapper Workspace Check

**File**: `src/components/auth-wrapper.tsx`  
**Line**: 144-149  
**Condition**: `userStatus.isFirstTime || !userStatus.workspaceId`  
**Action**: `window.location.href = '/welcome'`  
**Issue**: Does not check if pathname starts with `/invites`

### Decision Point 3: HomeLayout Workspace Check

**File**: `src/app/home/layout.tsx`  
**Line**: 29-32, 42-45  
**Condition**: `!data.workspaceId` or error includes "No workspace"  
**Action**: `window.location.href = '/welcome'`  
**Note**: This shouldn't affect `/invites/[token]` since invite page is not under `/home`, but worth noting

---

## Solution Strategy

### Fix 1: Exclude `/invites` routes from workspace check in Dashboard Layout

**File**: `src/app/(dashboard)/layout.tsx`

**Change**: Add pathname check before redirecting to `/welcome`

```typescript
// Only redirect to welcome if NOT on an invite page
const pathname = usePathname()
if (status === 'authenticated' && !isLoadingWorkspace && !workspaceId) {
  const workspaceJustCreated = sessionStorage.getItem('__workspace_just_created__') === 'true'
  const isInvitePage = pathname?.startsWith('/invites')
  
  if (!workspaceJustCreated && !isInvitePage) {
    window.location.href = '/welcome'
  }
}
```

### Fix 2: Exclude `/invites` routes from workspace check in AuthWrapper

**File**: `src/components/auth-wrapper.tsx`

**Change**: Add pathname check before redirecting to `/welcome`

```typescript
// Skip welcome redirect if on invite page
const isInvitePage = pathname?.startsWith('/invites')
if (userStatus.isFirstTime || !userStatus.workspaceId) {
  if (!isInvitePage) {
    window.location.href = '/welcome'
    return
  }
}
```

### Fix 3: Ensure invite page doesn't require workspace

**File**: `src/app/(dashboard)/invites/[token]/page.tsx`

**Status**: Already correct - invite page doesn't check for workspace, just shows accept button

---

## Expected Behavior After Fix

### New User Flow (via invite):

1. **User clicks `/invites/[token]`** (unauthenticated)
   - Redirects to `/login?callbackUrl=/invites/[token]` ✓

2. **User logs in**
   - NextAuth redirects to `/invites/[token]` ✓

3. **User lands on `/invites/[token]`** (authenticated, no workspace)
   - Dashboard layout sees pathname starts with `/invites` → **skips welcome redirect** ✓
   - AuthWrapper sees pathname starts with `/invites` → **skips welcome redirect** ✓
   - User sees invite page with "Accept Invite" button ✓

4. **User clicks "Accept Invite"**
   - Calls `/api/invites/[token]/accept`
   - Creates WorkspaceMember
   - Returns workspace slug

5. **User redirected to `/w/[workspaceSlug]`**
   - User is now in the invited workspace ✓

### New User Flow (direct login, no invite):

1. **User goes to `/login`** (no callbackUrl)
   - Defaults to `callbackUrl: '/home'`

2. **User logs in**
   - NextAuth redirects to `/home`

3. **User lands on `/home`** (authenticated, no workspace)
   - Dashboard layout checks: pathname is `/home` (not `/invites`) → redirects to `/welcome` ✓
   - User creates new workspace ✓

---

## Files to Modify

1. `src/app/(dashboard)/layout.tsx` - Add pathname check before welcome redirect
2. `src/components/auth-wrapper.tsx` - Add pathname check before welcome redirect

**No changes needed to**:
- `src/app/(dashboard)/invites/[token]/page.tsx` - Already correct
- `src/app/login/page.tsx` - Already correct
- `src/lib/auth.ts` - Already correct
- `src/app/api/invites/[token]/accept/route.ts` - Already correct
