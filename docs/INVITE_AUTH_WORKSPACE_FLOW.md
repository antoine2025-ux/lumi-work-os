# Invite + Auth + Workspace Flow Analysis

## Purpose

This document maps the complete flow of workspace invites, authentication, and workspace resolution to understand why invite links don't correctly route users to the invited workspace.

---

## 1. Invite Accept UI and API

### File: `src/app/(dashboard)/invites/[token]/page.tsx`

**How it loads the invite:**
- **Client-side only** - No server-side data fetching
- Uses `useSession()` to check authentication status
- Does NOT fetch invite details before showing the page
- Simply shows accept button if authenticated

**How it calls accept endpoint:**
- Line 45: `POST /api/invites/${token}/accept`
- Client-side fetch with no special headers
- Waits for response

**What it does on success:**
- Line 62: `router.push(\`/home?workspaceId=${data.workspaceId}\`)`
- **Uses query parameter `workspaceId`, NOT slug-based URL**
- **Does NOT use workspace slug from response** (`data.workspace.slug` is available but ignored)

### File: `src/app/api/invites/[token]/accept/route.ts`

**How it validates token:**
- Line 31: `prisma.workspaceInvite.findUnique({ where: { token } })`
- Includes workspace data: `{ id, name, slug }`

**How it resolves target workspace:**
- Workspace is included in invite lookup (line 34-39)
- Returns: `workspaceId`, `workspace: { id, name, slug }`

**How it checks email:**
- Line 75-92: Gets user from database, compares `user.email.toLowerCase() !== invite.email.toLowerCase()`
- Returns 403 if mismatch

**How it creates/updates WorkspaceMember:**
- Line 98-147: 
  - Checks if user already a member
  - If exists: Upgrades role if invite role is higher (never downgrades)
  - If not exists: Creates new membership with `invite.role`

**What JSON it returns:**
- Line 163-172: Returns:
  ```json
  {
    "success": true,
    "workspaceId": "...",
    "role": "...",
    "workspace": {
      "id": "...",
      "name": "...",
      "slug": "..."  // ← Available but not used in redirect!
    }
  }
  ```

**Key Issue**: Returns `workspace.slug` but frontend redirect ignores it and uses `workspaceId` query param instead.

---

## 2. Auth + Workspace Resolution Behavior

### File: `src/lib/unified-auth.ts`

**Function: `getUnifiedAuth(request)`**

**Workspace ID Resolution Priority** (lines 139-266):

1. **Priority 1: URL path slug** (`/w/[workspaceSlug]/...`)
   - Line 149: Matches `/^\/w\/([^\/]+)/`
   - Looks up workspace by slug
   - Validates user membership
   - **Throws error if workspace doesn't exist or user not a member**

2. **Priority 2: URL query params** (`?workspaceId=...` or `?projectId=...`)
   - Line 181: Gets `workspaceId` from query params
   - Line 197: Gets `projectId` from query params, resolves to workspace
   - Validates membership

3. **Priority 3: Header** (`x-workspace-id`)
   - Line 222: Gets from request headers
   - Validates membership

4. **Priority 4: User's default workspace**
   - Line 242: `workspaceMember.findFirst({ where: { userId }, orderBy: { joinedAt: 'asc' } })`
   - **Returns FIRST workspace by `joinedAt` (oldest membership)**
   - **This is the problem**: If user has existing workspace, this will be selected, not the newly invited one

5. **If no workspace found:**
   - Line 265: Throws `Error('No workspace found - user needs to create a workspace')`
   - **Does NOT auto-create workspace** (line 395 comment confirms this)

**Function: `resolveActiveWorkspaceIdWithMember()`**
- Same priority order as above
- Returns both `workspaceId` and `workspaceMember`

**Key Issues:**
- Priority 4 always picks the **oldest** workspace (by `joinedAt`)
- If user accepts invite to a new workspace, but already has an old workspace, Priority 4 will return the old one
- Query param `?workspaceId=...` (Priority 2) should work, but may be overridden by other logic

### File: `src/lib/workspace-onboarding.ts`

**Function: `createDefaultWorkspaceForUser(userId)`** (line 431)

**Where it's called:**
- **NOT called from `getUnifiedAuth`** - confirmed by line 395 comment: "Don't auto-create workspace"
- Only called from test routes and explicit workspace creation flows

**When it runs:**
- Only when explicitly invoked (e.g., `/api/test/workspace-creation`)
- **NOT automatically** when user has no workspace

**What it does:**
- Creates workspace with onboarding template
- Creates WorkspaceMember with OWNER role
- Returns workspace ID

**Key Finding**: Workspace creation is **NOT automatic** - users must explicitly create one via `/welcome` page.

---

## 3. Middleware & NextAuth Redirect Behavior

### File: `src/middleware.ts`

**Which paths it matches:**
- Line 74-83: Matches all paths EXCEPT:
  - `/api/*`
  - `/_next/static/*`
  - `/_next/image/*`
  - `/favicon.ico`
- **`/invites/[token]` IS matched by middleware** (not excluded)

**How it handles unauthenticated users:**
- Line 35-44: For `/w/[workspaceSlug]` paths:
  - Checks auth token
  - If not authenticated: Redirects to `/login?callbackUrl=${pathname}`
  - **For `/invites/[token]`, middleware doesn't do special handling** - just passes through

**Redirect behavior:**
- Sets `callbackUrl` query param when redirecting to login
- This should preserve the invite URL, but...

### File: `src/lib/auth.ts`

**NextAuth redirect callback** (line 89-102):
- Handles ngrok → localhost redirect in dev
- Default: Returns provided URL or baseUrl
- **Does NOT have special handling for invite URLs**

**Pages override:**
- Line 105-107: `pages: { signIn: '/login' }`
- Custom login page, not default NextAuth page

### File: `src/app/login/page.tsx`

**Redirect after login:**
- Line 74: `signIn('google', { callbackUrl: '/home', redirect: true })`
- **Hardcoded to `/home`**, ignores `callbackUrl` from query params
- **This is a problem**: Even if middleware sets `callbackUrl=/invites/[token]`, login page ignores it

---

## 4. Workspace Selection on Frontend

### File: `src/lib/workspace-context.tsx`

**How WorkspaceProvider loads workspaces:**
- Line 98: Fetches `/api/workspaces`
- Waits for `userStatus` to be loaded first (line 76)

**How it chooses currentWorkspace:**
- Line 104-137:
  1. **localStorage.currentWorkspaceId** (if exists and valid)
  2. **workspaces[0]** (first workspace in array)
  3. **null** if no workspaces

**How switchWorkspace works:**
- Line 164-186: Updates state and saves to `localStorage.currentWorkspaceId`
- Does NOT navigate - components react to state changes

**Key Issues:**
- If user has existing workspace, `workspaces[0]` will be the first one (oldest by `joinedAt`)
- Newly accepted invite workspace may be at `workspaces[1]` or later
- `localStorage.currentWorkspaceId` may point to old workspace

### File: `src/app/api/workspaces/route.ts`

**What it returns:**
- Line 11-28: Gets all `WorkspaceMember` records for user
- Orders by `joinedAt: 'asc'` (oldest first)
- Returns array of workspaces with `userRole`

**When user has:**
- **No workspaces**: Returns empty array `[]`
- **One workspace**: Returns `[{ workspace }]`
- **Multiple workspaces**: Returns all, ordered by `joinedAt` (oldest first)

**Does it autogenerate workspace?**
- **NO** - Only returns existing memberships
- Does NOT call `createDefaultWorkspaceForUser`

---

## 5. Complete Flow Scenarios

### Scenario A: User Has No Account Yet

**Steps:**

1. **User clicks `/invites/[token]`**
   - Middleware runs (line 5-70): No special handling, passes through
   - Invite page loads (`/invites/[token]/page.tsx`)

2. **Invite page checks auth** (line 23, 87)
   - `useSession()` returns `status === 'unauthenticated'`
   - Shows "Go to Login" button (line 102-107)

3. **User clicks "Go to Login"**
   - Line 103: `router.push('/login')`
   - **Invite token is lost** - not preserved in URL or state

4. **Login page** (`/login/page.tsx`)
   - Line 74: `signIn('google', { callbackUrl: '/home' })`
   - **Hardcoded to `/home`**, ignores invite URL

5. **After OAuth callback:**
   - NextAuth redirects to `/home` (from `callbackUrl`)
   - **Invite token is completely lost**

6. **User lands on `/home`**
   - `HomeLayout` checks workspace (line 23-33)
   - Calls `/api/auth/user-status`
   - `getUnifiedAuth()` runs:
     - User has no workspace memberships
     - Priority 4 fails (no memberships)
     - Throws: "No workspace found" (line 265)

7. **Redirect to `/welcome`**
   - `HomeLayout` line 31: `window.location.href = '/welcome'`
   - User is forced to create a new workspace
   - **Invited workspace is never joined**

**Root Cause**: Invite token is lost during login redirect, and user is forced into workspace creation flow.

---

### Scenario B: User Has Account But No Workspace

**Steps:**

1. **User clicks `/invites/[token]`**
   - Same as Scenario A steps 1-2

2. **User logs in**
   - Same as Scenario A steps 3-5
   - **Invite token lost**

3. **User lands on `/home`**
   - `getUnifiedAuth()` throws "No workspace found"
   - Redirected to `/welcome`
   - **Forced to create workspace instead of joining invited one**

**Root Cause**: Same as Scenario A - invite token lost, no mechanism to preserve it through login.

---

### Scenario C: User Already Has Workspace, Accepts Invite to Another

**Steps:**

1. **User clicks `/invites/[token]` (logged in)**
   - Invite page: `status === 'authenticated'`
   - Shows accept button

2. **User clicks "Accept Invite"**
   - Line 45: `POST /api/invites/${token}/accept`
   - API creates/upgrades WorkspaceMember for invited workspace
   - Returns: `{ workspaceId, workspace: { slug } }`

3. **Redirect after accept** (line 62)
   - `router.push(\`/home?workspaceId=${data.workspaceId}\`)`
   - Uses query param, not slug-based URL

4. **User lands on `/home?workspaceId=...`**
   - `HomeLayout` loads (line 23)
   - Calls `/api/auth/user-status`
   - `getUnifiedAuth(request)` runs:
     - **Priority 2**: Query param `workspaceId` should match
     - BUT: `HomeLayout` doesn't pass request to `getUnifiedAuth`
     - Actually: `/api/auth/user-status` calls `getUnifiedAuth(request)` with the API request
     - The API request URL is `/api/auth/user-status`, NOT `/home?workspaceId=...`
     - **So Priority 2 (query params) doesn't apply to the API call**

5. **Workspace resolution in API:**
   - `getUnifiedAuth()` sees request to `/api/auth/user-status` (no query params)
   - Skips Priority 1 (no slug in path)
   - Skips Priority 2 (no query params in API URL)
   - Skips Priority 3 (no header)
   - **Priority 4**: Returns first workspace by `joinedAt` (oldest)
   - **Returns OLD workspace, not the newly invited one**

6. **Frontend receives workspaceId:**
   - `userStatus.workspaceId` = old workspace ID
   - `WorkspaceProvider` loads workspaces (line 98)
   - Gets all workspaces, ordered by `joinedAt` (oldest first)
   - Selects `workspaces[0]` = old workspace
   - **Newly invited workspace is ignored**

7. **User sees old workspace:**
   - `currentWorkspace` = old workspace
   - WorkspaceSwitcher shows old workspace
   - **Newly joined workspace is not visible or selected**

**Root Cause**: 
- Query param `workspaceId` in page URL doesn't propagate to API calls
- `getUnifiedAuth()` in API routes doesn't see page query params
- Priority 4 always picks oldest workspace
- Frontend `WorkspaceProvider` also picks first workspace (oldest)

---

## 6. Root Cause Summary

### Problem 1: "New user gets forced into creating a new workspace instead of joining invited one"

**Root Causes:**
1. **Invite token lost during login** (`/login/page.tsx` line 74 hardcodes `callbackUrl: '/home'`)
2. **No mechanism to preserve invite token** through OAuth flow
3. **No check for pending invites** when user has no workspace
4. **Automatic redirect to `/welcome`** forces workspace creation (`HomeLayout` line 31)

**Files/Lines:**
- `src/app/login/page.tsx:74` - Hardcoded `callbackUrl: '/home'`
- `src/app/(dashboard)/invites/[token]/page.tsx:103` - Redirects to `/login` without preserving token
- `src/app/home/layout.tsx:31` - Redirects to `/welcome` if no workspace
- `src/lib/unified-auth.ts:265` - Throws "No workspace found" instead of checking invites

### Problem 2: "Existing user gets dropped into old workspace after accepting invite"

**Root Causes:**
1. **Query param `workspaceId` doesn't propagate to API calls**
   - Page URL: `/home?workspaceId=invited-workspace-id`
   - API call: `/api/auth/user-status` (no query params)
   - `getUnifiedAuth()` doesn't see page query params

2. **Priority 4 always picks oldest workspace**
   - `src/lib/unified-auth.ts:242` - `orderBy: { joinedAt: 'asc' }`
   - Returns first workspace user joined, not the newly invited one

3. **Frontend also picks first workspace**
   - `src/lib/workspace-context.tsx:127` - `selectedWorkspace = workspacesList[0]`
   - Workspaces ordered by `joinedAt` (oldest first)

4. **Redirect uses query param instead of slug**
   - `src/app/(dashboard)/invites/[token]/page.tsx:62` - Uses `workspaceId` query param
   - Should use slug-based URL: `/w/${workspace.slug}`

**Files/Lines:**
- `src/app/(dashboard)/invites/[token]/page.tsx:62` - Uses query param, not slug URL
- `src/lib/unified-auth.ts:242` - Picks oldest workspace
- `src/lib/workspace-context.tsx:127` - Picks first workspace
- `src/app/api/auth/user-status/route.ts:24` - Calls `getUnifiedAuth(request)` but request URL doesn't include page query params

---

## 7. Flow Diagrams

### Current Flow: New User Accepting Invite

```
1. User clicks /invites/[token]
   ↓
2. Invite page loads (client-side)
   ↓
3. useSession() → unauthenticated
   ↓
4. Shows "Go to Login" button
   ↓
5. router.push('/login')  ← TOKEN LOST
   ↓
6. Login page: signIn('google', { callbackUrl: '/home' })  ← HARDCODED
   ↓
7. OAuth flow → redirects to /home
   ↓
8. HomeLayout checks workspace
   ↓
9. /api/auth/user-status → getUnifiedAuth()
   ↓
10. No workspace found → throws error
   ↓
11. Redirect to /welcome  ← FORCED WORKSPACE CREATION
   ↓
12. User creates new workspace (invited workspace never joined)
```

### Current Flow: Existing User Accepting Invite

```
1. User clicks /invites/[token] (logged in)
   ↓
2. Invite page: status === 'authenticated'
   ↓
3. User clicks "Accept Invite"
   ↓
4. POST /api/invites/[token]/accept
   ↓
5. Creates WorkspaceMember for invited workspace
   ↓
6. Returns: { workspaceId, workspace: { slug } }
   ↓
7. router.push('/home?workspaceId=invited-id')  ← QUERY PARAM
   ↓
8. HomeLayout loads
   ↓
9. Calls /api/auth/user-status
   ↓
10. getUnifiedAuth(request) where request.url = '/api/auth/user-status'
    - No query params in API URL
    - Priority 4: Returns OLDEST workspace (joinedAt ASC)
   ↓
11. userStatus.workspaceId = OLD workspace ID
   ↓
12. WorkspaceProvider loads /api/workspaces
   ↓
13. Gets all workspaces, ordered by joinedAt (oldest first)
   ↓
14. Selects workspaces[0] = OLD workspace
   ↓
15. User sees old workspace (newly invited one ignored)
```

---

## 8. Key Issues Identified

### Issue 1: Invite Token Not Preserved Through Login

**Location**: `src/app/login/page.tsx:74`
- Hardcoded `callbackUrl: '/home'`
- Should preserve invite URL: `callbackUrl: `/invites/${token}``

### Issue 2: Redirect Uses Query Param Instead of Slug

**Location**: `src/app/(dashboard)/invites/[token]/page.tsx:62`
- Uses `router.push(\`/home?workspaceId=${data.workspaceId}\`)`
- Should use: `router.push(\`/w/${data.workspace.slug}\`)`

### Issue 3: getUnifiedAuth Doesn't See Page Query Params

**Location**: `src/lib/unified-auth.ts:178-196`
- Query param check only works if the request URL has query params
- API routes don't inherit page query params
- Need to pass workspace context differently

### Issue 4: Priority 4 Always Picks Oldest Workspace

**Location**: `src/lib/unified-auth.ts:242`
- `orderBy: { joinedAt: 'asc' }` - picks oldest
- Should prioritize recently joined or explicitly selected workspace

### Issue 5: WorkspaceProvider Picks First Workspace

**Location**: `src/lib/workspace-context.tsx:127`
- `selectedWorkspace = workspacesList[0]`
- Workspaces ordered by `joinedAt` (oldest first)
- Should respect explicit workspace selection

### Issue 6: No Invite Token in Middleware

**Location**: `src/middleware.ts`
- Doesn't preserve invite token when redirecting to login
- Should store token in session/cookie or pass as query param

---

## 9. Where Invite Token/Target Workspace Is Lost

1. **Login redirect** (`src/app/login/page.tsx:74`)
   - Hardcoded `callbackUrl` loses invite token

2. **API request context** (`src/app/api/auth/user-status/route.ts:24`)
   - Request URL doesn't include page query params
   - `getUnifiedAuth(request)` can't see `?workspaceId=...` from page

3. **Workspace resolution priority** (`src/lib/unified-auth.ts:242`)
   - Picks oldest workspace, ignoring newly joined one

4. **Frontend workspace selection** (`src/lib/workspace-context.tsx:127`)
   - Picks first workspace, not the one from invite

---

## 10. Summary

### Root Cause Hypothesis

**Problem 1: "New user gets forced into creating a new workspace"**

The invite token is **lost during the login redirect** because:
1. Login page hardcodes `callbackUrl: '/home'` instead of preserving `/invites/[token]`
2. No mechanism stores invite token in session/cookie during OAuth flow
3. After login, user lands on `/home` with no workspace, triggering redirect to `/welcome`
4. `/welcome` forces workspace creation, and the invited workspace is never joined

**Problem 2: "Existing user gets dropped into old workspace"**

The invited workspace is **ignored** because:
1. Redirect uses query param `?workspaceId=...` but API calls don't see page query params
2. `getUnifiedAuth()` in API routes resolves to oldest workspace (Priority 4)
3. Frontend `WorkspaceProvider` also picks first workspace (oldest)
4. No mechanism to explicitly select the newly joined workspace

### Exact Files and Lines

**Where default workspace is created:**
- `src/app/welcome/page.tsx:48` - Calls `/api/workspace/create`
- `src/app/api/workspaces/route.ts:97` - Creates workspace
- **NOT called automatically** - only via explicit user action

**Where redirect target is chosen:**
- `src/app/(dashboard)/invites/[token]/page.tsx:62` - Redirects to `/home?workspaceId=...`
- `src/app/login/page.tsx:74` - Hardcoded `callbackUrl: '/home'`
- `src/app/home/layout.tsx:31` - Redirects to `/welcome` if no workspace

**Where invite token/target workspace is ignored:**
- `src/app/login/page.tsx:74` - Hardcoded callback URL
- `src/lib/unified-auth.ts:242` - Picks oldest workspace
- `src/lib/workspace-context.tsx:127` - Picks first workspace
- `src/app/api/auth/user-status/route.ts:24` - API request doesn't include page query params

---

## Next Steps

After reviewing this document, the fixes needed are:

1. **Preserve invite token through login flow**
2. **Use slug-based redirect after invite acceptance**
3. **Pass workspace context to API routes** (via header or session)
4. **Prioritize newly joined workspace** in resolution logic
5. **Update frontend to respect explicit workspace selection**

But as requested, **no code changes in this step** - only analysis and documentation.

---

## 11. Post-Fix Verification

After implementing the fixes described in the implementation, verify the following scenarios:

### Scenario A — Brand New User with No Workspace

**Steps:**
1. Use an incognito/private window
2. Click invite link `/invites/[token]`
3. **Expected**: You are sent to `/login?callbackUrl=/invites/[token]`
4. After login/signup via **any sign-in method** (Google OAuth, email/magic link, credentials, etc.)
5. **Expected**: You land back on `/invites/[token]` (not `/home` or `/welcome`)
6. Click "Accept Invite"
7. **Expected**: You are redirected to `/w/[invitedWorkspaceSlug]`
8. **Expected**: No auto-created workspace appears; only the invited workspace exists
9. **Expected**: Workspace switcher shows only the invited workspace

**Test with all sign-in methods:**
- **Google OAuth**: Click "Continue with Google" → Should preserve callbackUrl
- **Email/Magic Link** (if configured): Enter email → Should preserve callbackUrl after email verification
- **Credentials** (if configured): Enter email/password → Should preserve callbackUrl

**Verification:**
- Check browser console: No "No workspace found - user needs to create a workspace" error
- Check network tab: No redirects to `/home` or `/welcome` after accepting invite
- Verify `/api/auth/user-status` returns the invited workspace ID
- Verify `getUnifiedAuth()` resolves to the invited workspace (not a default one)

---

### Scenario B — User with an Existing Workspace

**Steps:**
1. Log in as a user who already has workspace W1
2. Receive invite to workspace W2 (different workspace)
3. Click `/invites/[token]` (while logged in)
4. **Expected**: Invite page loads (no redirect to login)
5. Click "Accept Invite"
6. **Expected**: You are redirected to `/w/[W2.slug]` (not W1)
7. **Expected**: Workspace switcher now shows both W1 and W2
8. **Expected**: You are currently in W2 (the newly invited workspace)

**Verification:**
- Check browser console: No errors about workspace resolution
- Check network tab: Redirect goes to `/w/[W2.slug]`, not `/home?workspaceId=...`
- Verify `/api/auth/user-status` returns W2's workspace ID (not W1)
- Verify `getUnifiedAuth()` resolves to W2 when on `/w/[W2.slug]`
- Verify `WorkspaceProvider` shows both workspaces in the switcher
- Verify `currentWorkspace` is W2, not W1

---

### Scenario C — User Already a Member (Role Upgrade)

**Steps:**
1. Log in as a user who is already a MEMBER of workspace W1
2. Receive invite to W1 with ADMIN role
3. Click `/invites/[token]` and accept
4. **Expected**: Role is upgraded from MEMBER to ADMIN
5. **Expected**: Redirect to `/w/[W1.slug]` (same workspace)
6. **Expected**: User still sees W1, but with ADMIN permissions

**Verification:**
- Check database: `WorkspaceMember.role` is updated to ADMIN
- Verify permissions: User can now access admin-only features
- Verify redirect: Goes to `/w/[W1.slug]` (not a different workspace)

---

### Common Verification Points

**For all scenarios, verify:**

1. **No automatic workspace creation:**
   - No calls to `/api/workspace/create` or `createDefaultWorkspaceForUser`
   - No redirects to `/welcome` page
   - User only has the workspace(s) they were invited to

2. **Correct workspace resolution:**
   - `getUnifiedAuth()` resolves to invited workspace when on `/w/[slug]`
   - Priority 1 (URL slug) takes precedence over Priority 4 (default workspace)
   - No "wrong workspace" issues

3. **Proper redirect chain:**
   - Unauthenticated: `/invites/[token]` → `/login?callbackUrl=/invites/[token]` → `/invites/[token]`
   - After accept: `/invites/[token]` → `/w/[workspaceSlug]`
   - No intermediate redirects to `/home` or `/welcome`
   - **All sign-in methods** (Google, email, credentials) must preserve callbackUrl through the auth flow

4. **Logs and errors:**
   - No "No workspace found" errors in console
   - No 500 errors from `/api/invites/[token]/accept`
   - No unexpected redirects in network tab

---

### Troubleshooting

If issues occur:

1. **User still redirected to `/welcome`:**
   - Check `HomeLayout` redirect logic - should not trigger if user has workspace
   - Verify `getUnifiedAuth()` is returning workspace ID correctly

2. **User lands in wrong workspace:**
   - Check that redirect uses `/w/[slug]` not `/home?workspaceId=...`
   - Verify `getUnifiedAuth()` Priority 1 (slug) is working
   - Check `WorkspaceProvider` is selecting correct workspace

3. **Invite token lost during login:**
   - Verify `callbackUrl` is preserved in login page (`src/app/login/page.tsx`)
   - Check that **all sign-in methods** use the dynamic `callbackUrl` (not hardcoded `/home`)
   - Check NextAuth redirect callback in `src/lib/auth.ts` - should respect the `url` parameter
   - Verify middleware doesn't strip query params
   - If using email/magic link: Verify the email verification flow preserves callbackUrl

4. **API returns wrong workspace:**
   - Check `/api/auth/user-status` response
   - Verify `getUnifiedAuth(request)` sees the correct request URL
   - Check that slug-based resolution is working in API routes

---

## 12. Debugging in Production

To debug invite/login redirect issues in production, check the following log messages:

### Log Messages to Look For

#### 1. "Redirecting unauthenticated user from invite"

**Location**: `src/app/(dashboard)/invites/[token]/page.tsx` (client-side)

**When it appears**: When an unauthenticated user visits an invite link

**What to check**:
```json
{
  "level": "info",
  "message": "Redirecting unauthenticated user from invite",
  "invitePath": "/invites/[token]",
  "callbackUrl": "/invites/[token]",
  "loginUrl": "/login?callbackUrl=%2Finvites%2F[token]",
  "currentHref": "https://loopwell.io/invites/[token]",
  "timestamp": "2025-01-XX..."
}
```

**Healthy flow**:
- `invitePath` should be `/invites/[token]` (not empty or null)
- `callbackUrl` should match `invitePath`
- `loginUrl` should contain the encoded `callbackUrl`

---

#### 2. "Login: calling signIn with callbackUrl"

**Location**: `src/app/login/page.tsx` (client-side)

**When it appears**: Right before calling `signIn('google', ...)`

**What to check**:
```json
{
  "level": "info",
  "message": "Login: calling signIn with callbackUrl",
  "callbackUrl": "/invites/[token]",
  "href": "https://loopwell.io/login?callbackUrl=%2Finvites%2F[token]",
  "searchParams": "?callbackUrl=%2Finvites%2F[token]",
  "timestamp": "2025-01-XX..."
}
```

**Healthy flow**:
- `callbackUrl` should be `/invites/[token]` (not `/home`)
- `href` should contain `callbackUrl` in query params
- `searchParams` should show the encoded `callbackUrl`

**If broken**:
- `callbackUrl` is `/home` → The search param wasn't read correctly
- `callbackUrl` is `null` or missing → Search params weren't parsed

---

#### 3. "NextAuth redirect callback"

**Location**: `src/lib/auth.ts` (server-side, in NextAuth callback)

**When it appears**: After OAuth completes, when NextAuth determines where to redirect

**What to check**:
```json
{
  "timestamp": "2025-01-XX...",
  "level": "info",
  "message": "NextAuth redirect callback",
  "context": {
    "url": "/invites/[token]",
    "baseUrl": "https://loopwell.io",
    "finalUrl": "https://loopwell.io/invites/[token]",
    "urlOrigin": "https://loopwell.io",
    "baseUrlOrigin": "https://loopwell.io",
    "isRelative": true,
    "isSameOrigin": true
  }
}
```

**Healthy flow**:
- `url` should be `/invites/[token]` (the callbackUrl from signIn)
- `finalUrl` should be `https://loopwell.io/invites/[token]` (full URL)
- `isRelative` should be `true` (if url starts with `/`)
- `isSameOrigin` should be `true` (if url is same origin as baseUrl)

**If broken**:
- `url` is `/home` or `/` → The callbackUrl wasn't passed to NextAuth
- `url` is a different origin → Security issue or misconfiguration
- `finalUrl` doesn't match expected invite path → Redirect logic issue

---

### How to Trigger These Logs

1. **Open invite link while logged out**:
   - Visit `/invites/[token]` in incognito/private window
   - Should see log #1 (redirecting to login)

2. **Click sign-in button**:
   - On `/login?callbackUrl=/invites/[token]` page
   - Click "Continue with Google"
   - Should see log #2 (calling signIn)

3. **After OAuth completes**:
   - NextAuth processes the callback
   - Should see log #3 (redirect callback)
   - User should be redirected to `/invites/[token]`

---

### What a Healthy Flow Looks Like

**Step 1 - Invite page redirect**:
```
invitePath: "/invites/abc123"
callbackUrl: "/invites/abc123"
loginUrl: "/login?callbackUrl=%2Finvites%2Fabc123"
```

**Step 2 - Login page signIn**:
```
callbackUrl: "/invites/abc123"
href: "https://loopwell.io/login?callbackUrl=%2Finvites%2Fabc123"
```

**Step 3 - NextAuth redirect callback**:
```
url: "/invites/abc123"
baseUrl: "https://loopwell.io"
finalUrl: "https://loopwell.io/invites/abc123"
```

**Result**: User lands on `/invites/abc123` (not `/home` or `/welcome`)

---

### Common Issues and What Logs Show

**Issue**: User ends up on `/welcome` instead of `/invites/[token]`

**Check logs**:
- If log #1 shows correct `callbackUrl` but log #2 shows `callbackUrl: "/home"` → Login page isn't reading search params
- If log #2 shows correct `callbackUrl` but log #3 shows `url: "/home"` → NextAuth isn't receiving callbackUrl
- If log #3 shows correct `finalUrl` but user still goes to `/welcome` → Client-side redirect happening after NextAuth

**Issue**: User ends up on `/home` instead of `/invites/[token]`

**Check logs**:
- If log #3 shows `url: "/home"` → callbackUrl was lost or overridden
- If log #3 shows correct `url` but `finalUrl` is wrong → Redirect logic issue

---

### Where to Find Logs

- **Development**: Browser console (for client-side logs) and terminal (for server-side logs)
- **Production**: 
  - Client-side logs: Browser console (if enabled) or client-side error tracking
  - Server-side logs: Application logs (Vercel logs, CloudWatch, etc.)
  - Look for JSON-formatted log entries with `level: "info"` and the message strings above
