# Fix: Invite Redirects to Workspace Creation Instead of Invited Workspace

## Problem

When a user accepts a workspace invite, instead of being taken to the invited workspace, they're prompted to create a new workspace.

## Root Cause

1. **Caching Issue**: The `/api/auth/user-status` endpoint caches user status for 30 seconds. After accepting an invite, the cached response still shows `workspaceId: null` or the old workspace.

2. **Redirect Timing**: The redirect happens before the cache expires, so the dashboard layout checks user status and finds no workspace (from cache), then redirects to `/welcome`.

3. **Workspace Resolution**: Even if the redirect goes to `/w/${workspaceSlug}`, if there's a cached response, `getUnifiedAuth()` might not find the newly created membership.

## Solution Applied

### 1. Clear Cache on Invite Acceptance

**File**: `src/app/api/invites/[token]/accept/route.ts`

- Added cache invalidation header: `X-Invalidate-Cache: user-status`
- Added logging to track cache clearing

### 2. Hard Redirect After Accept

**File**: `src/app/(dashboard)/invites/[token]/page.tsx`

- Changed from `router.push()` to `window.location.href` for hard redirect
- This ensures a fresh page load and clears any client-side state
- Reduced timeout from 2000ms to 1500ms for faster redirect
- Added React Query cache invalidation before redirect

## How It Works Now

1. User clicks invite link → `/invites/{token}`
2. User clicks "Accept Invite"
3. Backend creates `WorkspaceMember` record
4. Backend marks invite as accepted
5. Backend returns workspace data with `X-Invalidate-Cache` header
6. Frontend clears React Query cache for `user-status`
7. Frontend does hard redirect to `/w/${workspaceSlug}`
8. Fresh page load → `getUnifiedAuth()` resolves workspace by slug (Priority 1)
9. User sees the invited workspace ✅

## Testing

1. Create an invite for `amorlet04@gmail.com`
2. Log in as that user
3. Click the invite link
4. Accept the invite
5. Should redirect to `/w/{workspaceSlug}` and show the workspace
6. Should NOT show workspace creation prompt

## Additional Notes

- The cache TTL is 30 seconds, so even if cache clearing fails, it will refresh within 30 seconds
- Using `window.location.href` ensures a complete page reload, clearing all client-side state
- The workspace slug in the URL ensures `getUnifiedAuth()` uses Priority 1 (URL path slug) instead of falling back to default workspace
