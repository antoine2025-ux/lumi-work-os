# Fix: Invite Page Shows "Create Workspace" Instead of Accept UI

## Problem

When a user visits `/invites/{token}`, they see the "Create Workspace" prompt instead of the invite acceptance UI. This happens because:

1. The invite page is inside the `(dashboard)` route group
2. The dashboard layout includes `WorkspaceProvider`
3. `WorkspaceProvider` checks if user has a workspace
4. If no workspace, it shows "Create Workspace" UI
5. This UI covers the invite acceptance page

## Root Cause

The `WorkspaceProvider` in `workspace-context.tsx` was checking:
```typescript
if (userStatus.isFirstTime || !userStatus.workspaceId) {
  // Skip workspace load - shows "Create Workspace" UI
}
```

This check runs for ALL pages in the dashboard layout, including invite pages. But invite pages should be exempt because:
- Users haven't accepted the invite yet (so no workspace membership)
- They need to see the accept button, not the create workspace prompt

## Solution

### 1. Skip Workspace Loading on Invite Pages

**File**: `src/lib/workspace-context.tsx`

Added a check to skip workspace loading if we're on an invite page:
```typescript
// Skip workspace loading if we're on an invite page
if (typeof window !== 'undefined') {
  const isInvitePage = window.location.pathname.startsWith('/invites/')
  if (isInvitePage) {
    // Don't load workspaces - user needs to accept invite first
    return
  }
}
```

### 2. Prevent Redirect on Invite Pages

**File**: `src/app/(dashboard)/layout.tsx`

Already had a check to prevent redirect to `/welcome` on invite pages, but added an additional check to prevent redirect if already on welcome page.

## How It Works Now

1. User visits `/invites/{token}`
2. `WorkspaceProvider` detects it's an invite page
3. Skips workspace loading (doesn't show "Create Workspace")
4. Invite page renders normally with "Accept Invite" button
5. User clicks "Accept Invite"
6. Workspace membership is created
7. User is redirected to `/w/{workspaceSlug}`
8. `WorkspaceProvider` now finds the workspace and loads it ✅

## Testing

1. Create an invite for a user
2. Log in as that user (or visit invite link while logged in)
3. Visit `/invites/{token}`
4. Should see "Accept Workspace Invite" card with accept button
5. Should NOT see "Create Workspace" prompt
6. Click "Accept Invite"
7. Should redirect to the workspace

## Additional Notes

- The invite page is intentionally inside the `(dashboard)` route group to share the layout
- But it needs special handling to bypass workspace requirements
- This fix ensures invite pages work correctly while maintaining the shared layout
