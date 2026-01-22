# Failure Triage - Redirect Tests

**Date:** 2026-01-21  
**Commit:** 7a4ffcc

## Test Results Summary

| # | Test Name | Route | Expected URL | Actual URL | Layer Failed |
|---|-----------|-------|--------------|------------|--------------|
| 1 | TC-1 | /home | /login | /home | **Middleware** |
| 2 | TC-1b | /projects | /login | /projects | **Middleware** |
| 3 | TC-1c | /wiki | /login | /wiki | **Middleware** |
| 4 | TC-2 | /login | /home or / | /login | Client-side |
| 5 | TC-4 | /home | dashboard-container visible | Not found | Test ID missing |
| 6 | TC-8 | /home (refresh) | dashboard-container visible | Not found | Test ID missing |
| 7 | TC-9 | /api/auth/session | session.user | {} | Auth state not loaded |
| 8 | TC-10 | /api/projects/:id | 401 | 500 | Different API route |

## Root Cause Analysis

### Primary Issue: Middleware Does NOT Protect /home, /projects, /wiki

**File:** `src/middleware.ts`

```typescript
// Line 18-49: Only checks auth for /w/[workspaceSlug]/ routes
const slugMatch = pathname.match(/^\/w\/([^\/]+)/)

if (slugMatch) {
  // ... auth check only happens here
}
```

**Result:** Routes like `/home`, `/projects`, `/wiki`, `/todos` are NOT protected at the middleware level.

### Current Auth Architecture

| Layer | What it protects | Status |
|-------|------------------|--------|
| Middleware | `/w/[slug]/*` only | ✅ Working |
| Client (redirect-handler) | All routes (intended) | ❌ Not working |
| API routes | Each API individually | ✅ Working |

### Why Client-Side Redirect Fails

The client-side `useSession` hook requires JavaScript to load and execute. In a fresh browser context:
1. HTML is served immediately (200 OK)
2. JavaScript loads
3. `useSession` returns `status: 'loading'` initially
4. By the time it returns `'unauthenticated'`, page is already rendered

**Recommendation:** Move auth check to middleware (server-side) for immediate redirect.

## Fix Strategy

### Option A: Extend Middleware (RECOMMENDED)

Add protected route list to middleware:

```typescript
const PROTECTED_ROUTES = ['/home', '/projects', '/wiki', '/todos', '/settings', '/my-tasks', '/calendar']

const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))

if (isProtectedRoute) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }
}
```

### Option B: Use Next.js Auth Middleware Pattern

Use NextAuth's built-in middleware for protected routes.

### Option C: Fix Client-Side Redirect

Make `useSession` block rendering until status is resolved. Not recommended - poor UX.

---

## Decision

**Implement Option A** - Extend middleware to protect dashboard routes.

## Secondary Issues

### TC-4, TC-8: Missing Test ID

The `dashboard-container` test ID is not in the DOM. This is a test harness issue, not a redirect issue.

**Fix:** Add `data-testid="dashboard-container"` to the dashboard layout.

### TC-9: Empty Session

The authenticated tests use `.auth/user.json` which may be invalid or missing.

**Fix:** Ensure auth setup runs correctly.

### TC-10 (/api/projects): Returns 500 instead of 401

Different API route, not covered by our `tasks/[id]` fix.

**Fix:** Apply same pattern to `/api/projects/[projectId]/route.ts` (separate issue).
