# Multi-Workspace Test Runbook

## Overview

This runbook provides manual test procedures and scripts to verify multi-workspace functionality, including workspace selection, data isolation, and API behavior.

## Prerequisites

- Development server running (`npm run dev`)
- Authenticated user session (via browser login)
- Access to browser DevTools and terminal

---

## Part 1: Setup Test User with Multiple Workspaces

### Step 1: Create User with 2 Workspaces

**Via Browser UI**:
1. Login as user A
2. Create workspace "Workspace A" (if not exists)
3. Create workspace "Workspace B" (if not exists)
4. Verify both workspaces appear in switcher dropdown

**Via API** (for automated testing):
```bash
# Get session cookie from browser DevTools → Application → Cookies
SESSION_COOKIE="your-next-auth-session-token-here"

# Create first workspace
curl -X POST http://localhost:3000/api/workspaces \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name": "Workspace A", "slug": "workspace-a", "description": "Test workspace A"}'

# Create second workspace
curl -X POST http://localhost:3000/api/workspaces \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name": "Workspace B", "slug": "workspace-b", "description": "Test workspace B"}'
```

---

## Part 2: Verify `/api/workspaces` Returns All Workspaces

### Step 1: Call API Endpoint

```bash
# Get session cookie
SESSION_COOKIE="your-next-auth-session-token-here"

# Call workspaces API
curl http://localhost:3000/api/workspaces \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq '.'
```

### Expected Response

```json
{
  "workspaces": [
    {
      "id": "workspace-a-id",
      "name": "Workspace A",
      "slug": "workspace-a",
      "description": "Test workspace A",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "userRole": "OWNER"
    },
    {
      "id": "workspace-b-id",
      "name": "Workspace B",
      "slug": "workspace-b",
      "description": "Test workspace B",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "userRole": "OWNER"
    }
  ]
}
```

### Verification

- [ ] Response contains `workspaces` array
- [ ] Array length matches number of workspaces user belongs to
- [ ] Each workspace includes `userRole` field
- [ ] All fields present: `id`, `name`, `slug`, `description`, `createdAt`, `updatedAt`, `userRole`

---

## Part 3: Verify Workspace Context Affects API Responses

### How Frontend Workspace Selection Affects Server-Side Auth

**Important**: The frontend `localStorage.currentWorkspaceId` does **NOT** directly affect server-side `auth.workspaceId`. 

Server-side workspace resolution (via `getUnifiedAuth()`) uses:
1. URL query param `workspaceId` (if provided)
2. URL query param `projectId` → derive workspaceId
3. Header `x-workspace-id` (if provided)
4. User's first workspace membership (default)

**To test workspace switching**:
- Pass `workspaceId` as URL query param: `/api/projects?workspaceId=workspace-b-id`
- Or pass `x-workspace-id` header: `-H "x-workspace-id: workspace-b-id"`

### Step 1: Create Projects in Each Workspace

```bash
SESSION_COOKIE="your-next-auth-session-token-here"
WORKSPACE_A_ID="workspace-a-id"
WORKSPACE_B_ID="workspace-b-id"

# Create project in Workspace A
curl -X POST http://localhost:3000/api/projects \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: $WORKSPACE_A_ID" \
  -d '{"name": "Project A1", "description": "Project in workspace A"}'

# Create project in Workspace B
curl -X POST http://localhost:3000/api/projects \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: $WORKSPACE_B_ID" \
  -d '{"name": "Project B1", "description": "Project in workspace B"}'
```

### Step 2: Verify Data Isolation

```bash
# Get projects from Workspace A
curl "http://localhost:3000/api/projects?workspaceId=$WORKSPACE_A_ID" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq '.projects[] | {id, name, workspaceId}'

# Get projects from Workspace B
curl "http://localhost:3000/api/projects?workspaceId=$WORKSPACE_B_ID" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq '.projects[] | {id, name, workspaceId}'
```

### Expected Behavior

- [ ] Workspace A projects only include "Project A1"
- [ ] Workspace B projects only include "Project B1"
- [ ] No cross-workspace data leakage
- [ ] Each project has correct `workspaceId`

---

## Part 4: Test Workspace Switching in Browser

### Step 1: Verify Workspace Switcher

1. **Open browser** → Navigate to `http://localhost:3000`
2. **Login** if needed
3. **Check header** → Workspace switcher should be visible
4. **Single workspace**: Shows workspace name only (no dropdown)
5. **Multiple workspaces**: Shows dropdown with all workspaces

### Step 2: Switch Workspaces

1. **Click workspace switcher** (if multiple workspaces)
2. **Select different workspace** from dropdown
3. **Verify**:
   - Projects list updates
   - Wiki pages update
   - Dashboard data updates
   - Workspace name in header updates

### Step 3: Verify Persistence

1. **Select workspace A**
2. **Refresh page** (F5)
3. **Verify**: Workspace A still selected
4. **Check localStorage**: `localStorage.getItem('currentWorkspaceId')` should equal workspace A ID

---

## Part 5: Edge Case - User Removed from Workspace

### Step 1: Setup

1. User belongs to workspace A and workspace B
2. `localStorage.currentWorkspaceId` = workspace A ID
3. Remove user from workspace A (via admin or DB)

### Step 2: Test Fallback

1. **Refresh page**
2. **Check console**: Should see no errors
3. **Verify**: Current workspace is workspace B (not A)
4. **Check localStorage**: Should be updated to workspace B ID

### Verification Script

```bash
# Simulate: User removed from workspace A
# In database:
# DELETE FROM workspace_members WHERE workspace_id = 'workspace-a-id' AND user_id = 'user-id'

# Then refresh page and verify:
# - WorkspaceProvider falls back to workspace B
# - No errors thrown
# - localStorage updated
```

---

## Part 6: Loopbrain Workspace Context

### Verify Loopbrain Uses Server-Side Workspace Resolution

**Important**: Loopbrain uses `getUnifiedAuth()` which resolves `workspaceId` server-side, not from `localStorage`.

### Test Loopbrain Query

```bash
SESSION_COOKIE="your-next-auth-session-token-here"
WORKSPACE_A_ID="workspace-a-id"

# Query Loopbrain with workspace context
curl -X POST http://localhost:3000/api/loopbrain/chat \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: $WORKSPACE_A_ID" \
  -d '{
    "mode": "spaces",
    "query": "What projects do we have?",
    "workspaceId": "'$WORKSPACE_A_ID'"
  }' | jq '.workspaceId'
```

### Expected Behavior

- [ ] Loopbrain response includes `workspaceId` from server-side auth
- [ ] Context includes only data from specified workspace
- [ ] No cross-workspace data in response

---

## Part 7: Cross-Workspace Data Isolation Scenario

### Overview

This scenario verifies that workspace switching in the UI correctly isolates data between workspaces, ensuring users only see data from their selected workspace.

### How Workspace Selection Flows to Server-Side Auth

**Important**: The frontend `localStorage.currentWorkspaceId` does **NOT** directly affect server-side `auth.workspaceId`. Instead:

1. **Frontend**: User selects workspace → `WorkspaceProvider.switchWorkspace()` → updates `localStorage.currentWorkspaceId`
2. **API Calls**: Frontend makes API requests with workspace context:
   - **URL query param**: `/api/projects?workspaceId=workspace-b-id`
   - **Header**: `x-workspace-id: workspace-b-id`
3. **Server-Side**: `getUnifiedAuth(request)` resolves `workspaceId`:
   - Priority 1: URL query param `workspaceId` (if provided)
   - Priority 2: URL query param `projectId` → derive workspaceId
   - Priority 3: Header `x-workspace-id` (if provided)
   - Priority 4: User's first workspace membership (default)
4. **Authorization**: `assertAccess()` validates user has access to resolved workspace
5. **Query**: Prisma queries use `where: { workspaceId: auth.workspaceId }`

**Full Path Example**:
```
User clicks workspace B in switcher
  ↓
WorkspaceProvider.switchWorkspace('workspace-b-id')
  ↓
localStorage.setItem('currentWorkspaceId', 'workspace-b-id')
  ↓
Component makes API call: fetch('/api/projects?workspaceId=workspace-b-id')
  ↓
getUnifiedAuth(request) reads ?workspaceId=workspace-b-id
  ↓
assertAccess() validates user has access to workspace-b-id
  ↓
prisma.project.findMany({ where: { workspaceId: 'workspace-b-id' } })
```

### Step 1: Setup Test User and Workspaces

1. **Create user U** (or use existing test user)
2. **Add U to workspace A**:
   ```bash
   # Via database or admin UI
   INSERT INTO workspace_members (workspace_id, user_id, role) 
   VALUES ('workspace-a-id', 'user-u-id', 'OWNER');
   ```
3. **Add U to workspace B**:
   ```bash
   INSERT INTO workspace_members (workspace_id, user_id, role) 
   VALUES ('workspace-b-id', 'user-u-id', 'OWNER');
   ```

### Step 2: Create Projects in Each Workspace

**Via API**:
```bash
SESSION_COOKIE="user-u-session-token"
WORKSPACE_A_ID="workspace-a-id"
WORKSPACE_B_ID="workspace-b-id"

# Create project only in workspace A
curl -X POST "http://localhost:3000/api/projects?workspaceId=$WORKSPACE_A_ID" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name": "Project A1", "description": "Only in workspace A"}'

# Create project only in workspace B
curl -X POST "http://localhost:3000/api/projects?workspaceId=$WORKSPACE_B_ID" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"name": "Project B1", "description": "Only in workspace B"}'
```

**Via UI**:
1. Login as user U
2. Switch to workspace A → Create project "Project A1"
3. Switch to workspace B → Create project "Project B1"

### Step 3: Verify Workspace Isolation via UI

1. **Login as user U** → Browser at `http://localhost:3000`
2. **Switch to workspace A**:
   - Click workspace switcher → Select "Workspace A"
   - Navigate to `/projects` page
   - **Verify**: Only "Project A1" appears in list
   - **Verify**: No "Project B1" visible
3. **Switch to workspace B**:
   - Click workspace switcher → Select "Workspace B"
   - Navigate to `/projects` page (or refresh if already there)
   - **Verify**: Only "Project B1" appears in list
   - **Verify**: No "Project A1" visible
4. **Switch back to workspace A**:
   - Click workspace switcher → Select "Workspace A"
   - **Verify**: "Project A1" appears again
   - **Verify**: "Project B1" disappears

### Step 4: Verify Workspace Isolation via API

```bash
SESSION_COOKIE="user-u-session-token"
WORKSPACE_A_ID="workspace-a-id"
WORKSPACE_B_ID="workspace-b-id"

# Get projects from workspace A
echo "=== Workspace A Projects ==="
curl -s "http://localhost:3000/api/projects?workspaceId=$WORKSPACE_A_ID" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq '.projects[] | {id, name, workspaceId}'

# Get projects from workspace B
echo "=== Workspace B Projects ==="
curl -s "http://localhost:3000/api/projects?workspaceId=$WORKSPACE_B_ID" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq '.projects[] | {id, name, workspaceId}'
```

### Expected Behavior

- [ ] **Workspace A**: Only shows "Project A1" (not "Project B1")
- [ ] **Workspace B**: Only shows "Project B1" (not "Project A1")
- [ ] **No cross-workspace leakage**: Projects from one workspace never appear in another
- [ ] **Switching works**: UI updates immediately when workspace changes
- [ ] **Persistence**: Selected workspace persists after page refresh

### Verification Checklist

- [ ] User U belongs to both workspace A and workspace B
- [ ] Project A1 exists only in workspace A
- [ ] Project B1 exists only in workspace B
- [ ] Switching to workspace A shows only Project A1
- [ ] Switching to workspace B shows only Project B1
- [ ] API calls with `?workspaceId=A` return only A's projects
- [ ] API calls with `?workspaceId=B` return only B's projects
- [ ] No errors in browser console
- [ ] No errors in server logs

---

## Part 8: Complete Test Script

### Automated Test Sequence

```bash
#!/bin/bash
# Multi-workspace test script

SESSION_COOKIE="your-next-auth-session-token-here"

echo "=== Step 1: Get all workspaces ==="
curl -s http://localhost:3000/api/workspaces \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq '.workspaces | length'

echo ""
echo "=== Step 2: Get workspace IDs ==="
WORKSPACE_A_ID=$(curl -s http://localhost:3000/api/workspaces \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq -r '.workspaces[0].id')

WORKSPACE_B_ID=$(curl -s http://localhost:3000/api/workspaces \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq -r '.workspaces[1].id')

echo "Workspace A: $WORKSPACE_A_ID"
echo "Workspace B: $WORKSPACE_B_ID"

echo ""
echo "=== Step 3: Get projects from Workspace A ==="
curl -s "http://localhost:3000/api/projects?workspaceId=$WORKSPACE_A_ID" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq '.projects | length'

echo ""
echo "=== Step 4: Get projects from Workspace B ==="
curl -s "http://localhost:3000/api/projects?workspaceId=$WORKSPACE_B_ID" \
  -H "Cookie: next-auth.session-token=$SESSION_COOKIE" \
  | jq '.projects | length'

echo ""
echo "=== Test Complete ==="
```

---

## Troubleshooting

### Issue: `/api/workspaces` returns empty array

**Check**:
- User is authenticated (valid session cookie)
- User has `WorkspaceMember` records in database
- Query: `SELECT * FROM workspace_members WHERE user_id = 'user-id'`

### Issue: Workspace switching doesn't update data

**Check**:
- Are API calls passing `workspaceId` query param or `x-workspace-id` header?
- Is `getUnifiedAuth()` resolving workspaceId correctly?
- Check server logs for workspace resolution

### Issue: Cross-workspace data leakage

**Check**:
- Are API routes using `where: { workspaceId: auth.workspaceId }`?
- Is `assertAccess()` called before queries?
- Is `setWorkspaceContext()` called (if scoping enabled)?

---

## Part 9: Slug-Based URL Navigation

### Step 1: Verify Slug-Based URLs Work

1. **Access Dashboard via Slug**
   - Navigate to `/w/[workspaceSlug]` (replace with actual slug)
   - Verify dashboard loads correctly
   - Check that workspace context matches slug

2. **Access Projects via Slug**
   - Navigate to `/w/[workspaceSlug]/projects`
   - Verify projects list loads
   - Verify projects belong to the workspace in the slug

3. **Access Settings via Slug**
   - Navigate to `/w/[workspaceSlug]/settings`
   - Verify settings page loads
   - Verify workspace settings match the slug workspace

4. **Access Org Chart via Slug**
   - Navigate to `/w/[workspaceSlug]/org`
   - Verify org chart loads
   - Verify org data matches the slug workspace

5. **Access LoopBrain via Slug**
   - Navigate to `/w/[workspaceSlug]/ask`
   - Verify LoopBrain loads
   - Verify context matches the slug workspace

### Step 2: Test Workspace Switching with Slug URLs

1. **Switch via WorkspaceSwitcher**
   - Click WorkspaceSwitcher in header
   - Select a different workspace
   - Verify URL changes to `/w/[new-slug]`
   - Verify page content updates to match new workspace

2. **Direct Slug Navigation**
   - Manually navigate to `/w/[workspace-slug-you-have-access-to]`
   - Verify page loads correctly
   - Verify data matches the workspace

3. **Invalid Slug Access**
   - Navigate to `/w/non-existent-slug`
   - Should get 404 or redirect
   - Should not show data from other workspaces

4. **Unauthorized Slug Access**
   - If you have access to Workspace A but not B:
   - Navigate to `/w/workspace-b-slug` (workspace you don't have access to)
   - Should get 403/404 or redirect to accessible workspace
   - Should not show any data

### Step 3: Test Legacy URL Redirects

1. **Projects Redirect**
   - Navigate to `/projects`
   - Should redirect to `/w/[current-workspace-slug]/projects`
   - Verify projects load correctly

2. **Settings Redirect**
   - Navigate to `/settings`
   - Should redirect to `/w/[current-workspace-slug]/settings`
   - Verify settings load correctly

3. **Org Redirect**
   - Navigate to `/org`
   - Should redirect to `/w/[current-workspace-slug]/org`
   - Verify org chart loads correctly

4. **Ask Redirect**
   - Navigate to `/ask`
   - Should redirect to `/w/[current-workspace-slug]/ask`
   - Verify LoopBrain loads correctly

### Step 4: Verify Navigation Links Use Slugs

1. **Header Navigation**
   - Click each header navigation link
   - Verify URLs use `/w/[slug]/...` format
   - Verify pages load correctly

2. **Internal Links**
   - Navigate through the app using internal links
   - Verify all links use slug format
   - Check breadcrumbs work correctly

3. **Project Detail Links**
   - Navigate to a project detail page
   - Verify URL is `/w/[slug]/projects/[id]`
   - Verify project belongs to the workspace in the slug

### Step 5: Test Middleware Slug Validation

1. **Valid Slug Format**
   - Navigate to `/w/valid-slug-123`
   - Should work if you have access

2. **Invalid Slug Format**
   - Navigate to `/w/Invalid_Slug!@#`
   - Should get 404 (invalid format)

3. **Authentication Check**
   - Log out
   - Try to navigate to `/w/[any-slug]/projects`
   - Should redirect to login with callback URL

### Expected Results

- [ ] All slug-based URLs work correctly
- [ ] Workspace switching updates URL to new slug
- [ ] Invalid/unauthorized slugs are blocked
- [ ] Legacy URLs redirect to slug URLs
- [ ] All navigation links use slug format
- [ ] Middleware validates slug format and authentication
- [ ] Data isolation maintained across workspace slugs

---

## Related Documentation

- `docs/MULTI_WORKSPACE_UX.md` - UX behavior documentation
- `docs/MULTI_TENANT_HARDENING.md` - Security and scoping
- `docs/WORKSPACE_SLUGS_AND_MIDDLEWARE.md` - Slug-based URL implementation
- `ARCHITECTURE_SUMMARY.md` - Overall architecture
