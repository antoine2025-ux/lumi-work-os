# Auth Desync Verification

**Purpose:** Verify that auth state is consistent between client and server  
**Status:** ⚠️ **NOT YET VERIFIED** - Analysis complete, instrumentation needed

---

## Auth State Sources

### Client-Side Sources

1. **NextAuth Session** (`useSession()` hook)
   - **Location:** `next-auth/react`
   - **Storage:** HTTP-only cookie (`next-auth.session-token`)
   - **Read Points:**
     - `src/components/auth-wrapper.tsx:28`
     - `src/app/(dashboard)/DashboardLayoutClient.tsx:21`
     - `src/app/home/layout.tsx:15`
     - `src/providers/user-status-provider.tsx:69`

2. **UserStatusProvider** (React Context)
   - **Location:** `src/providers/user-status-provider.tsx`
   - **Source:** NextAuth session + API fallback
   - **Read Points:** All components using `useUserStatusContext()`

3. **SessionStorage** (⚠️ Legacy workarounds)
   - **Keys:** `__redirect_stopped__`, `__workspace_id__`, `__redirect_count__`
   - **Status:** Should be removed after redirect fix verification

4. **LocalStorage** (if any)
   - **Status:** Need to audit

### Server-Side Sources

1. **NextAuth Session** (`getServerSession()`)
   - **Location:** `src/lib/unified-auth.ts:96`
   - **Storage:** HTTP-only cookie (same as client)
   - **Read Points:**
     - All API routes via `getUnifiedAuth(request)`
     - Server components

2. **JWT Token** (`getToken()`)
   - **Location:** `src/middleware.ts:35`
   - **Storage:** HTTP-only cookie (decoded JWT)
   - **Read Points:** Middleware only (lightweight check)

---

## Auth State Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT SIDE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser Cookie: next-auth.session-token                   │
│         │                                                    │
│         ▼                                                    │
│  useSession() hook (next-auth/react)                        │
│         │                                                    │
│         ├─► session.user.id                                │
│         ├─► session.user.email                              │
│         ├─► session.user.workspaceId (from JWT)            │
│         └─► session.user.role (from JWT)                   │
│                                                             │
│         │                                                    │
│         ▼                                                    │
│  UserStatusProvider (React Context)                         │
│         │                                                    │
│         ├─► Reads session.user.workspaceId                  │
│         └─► Falls back to /api/auth/user-status if missing  │
│                                                             │
│         │                                                    │
│         ▼                                                    │
│  Redirect Handler (getRedirectDecisionWithCookie)           │
│         │                                                    │
│         ├─► Checks sessionStatus                            │
│         ├─► Checks workspaceId                              │
│         └─► Checks session cookie as fallback               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Request (with cookie)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER SIDE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Middleware (src/middleware.ts)                            │
│         │                                                    │
│         ├─► getToken() - lightweight JWT check              │
│         └─► Redirects to /login if no token                 │
│                                                             │
│         │                                                    │
│         ▼                                                    │
│  API Route Handler                                          │
│         │                                                    │
│         ├─► getUnifiedAuth(request)                         │
│         │   └─► getServerSession(authOptions)              │
│         │       └─► Reads cookie → decodes JWT               │
│         │           └─► Returns session object              │
│         │                                                    │
│         ├─► assertAccess()                                  │
│         │   └─► Validates WorkspaceMember record           │
│         │                                                    │
│         └─► Business logic                                  │
│             └─► Queries with workspaceId filter             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Verification Points

### V1: Session Cookie Consistency

**Test:** Verify cookie is set and readable by both client and server

**Steps:**
1. Sign in via OAuth
2. Check browser DevTools → Application → Cookies
3. Verify `next-auth.session-token` exists
4. Make API request
5. Check server logs for session read

**Expected:**
- Cookie exists after sign-in
- Server can read cookie in API routes
- Client can read cookie via `useSession()`

**Actual:** ❓ **NOT TESTED**

---

### V2: Session Data Consistency

**Test:** Verify session.user.id matches between client and server

**Steps:**
1. Sign in
2. Log `session.user.id` in client component
3. Log `auth.user.userId` in API route
4. Compare values

**Expected:**
- Values match exactly
- No undefined/null values

**Actual:** ❓ **NOT TESTED**

---

### V3: WorkspaceId Consistency

**Test:** Verify workspaceId is consistent across client/server

**Steps:**
1. Sign in with user who has workspace
2. Check `session.user.workspaceId` in client
3. Check `auth.workspaceId` in API route
4. Compare values

**Expected:**
- Values match
- Or both undefined (if no workspace)

**Actual:** ❓ **NOT TESTED**

---

### V4: Session Expiry Handling

**Test:** Verify expired sessions are detected consistently

**Steps:**
1. Sign in
2. Manually expire session (delete cookie or wait)
3. Check client: `useSession()` status
4. Check server: `getServerSession()` result
5. Compare

**Expected:**
- Both detect expiry
- Both return `null` or `unauthenticated`
- No desync

**Actual:** ❓ **NOT TESTED**

---

### V5: Workspace Switch Consistency

**Test:** Verify workspace switch updates both client and server

**Steps:**
1. Sign in with user who has 2+ workspaces
2. Switch workspace (if UI exists)
3. Check client session
4. Check server session on next API call
5. Compare workspaceId

**Expected:**
- Both update to new workspaceId
- No stale data

**Actual:** ❓ **NOT TESTED**

---

## Instrumentation Needed

### Client-Side Logging

Add to `src/providers/user-status-provider.tsx`:
```typescript
useEffect(() => {
  console.log('[AUTH-VERIFY] Client session:', {
    status,
    userId: session?.user?.id,
    workspaceId: session?.user?.workspaceId,
    hasCookie: hasSessionCookie(),
  })
}, [status, session])
```

### Server-Side Logging

Add to `src/lib/unified-auth.ts`:
```typescript
logger.info('getUnifiedAuth session read', {
  requestId,
  userId: session?.user?.id,
  email: session?.user?.email,
  workspaceId: session?.user?.workspaceId,
  hasCookie: !!request?.headers.get('cookie'),
})
```

---

## Verification Results

| Verification Point | Status | Evidence |
|-------------------|--------|----------|
| V1: Cookie Consistency | ❌ Not Tested | - |
| V2: Session Data Consistency | ❌ Not Tested | - |
| V3: WorkspaceId Consistency | ❌ Not Tested | - |
| V4: Session Expiry Handling | ❌ Not Tested | - |
| V5: Workspace Switch Consistency | ❌ Not Tested | - |

---

## Remaining Auth State Sources (To Remove)

1. **sessionStorage flags:**
   - `__redirect_stopped__` - Should be removed after redirect verification
   - `__workspace_id__` - Should be removed after redirect verification
   - `__redirect_count__` - Should be removed after redirect verification
   - `__people_page_no_redirect__` - Should be removed after redirect verification

2. **Hardcoded workspace IDs:**
   - Check for any remaining `'ws_1765020555_4662b211'` references
   - Should be removed

---

**Status:** ⚠️ **ANALYSIS COMPLETE - INSTRUMENTATION & TESTING REQUIRED**
