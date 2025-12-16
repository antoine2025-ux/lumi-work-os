# Multi-Workspace UX Documentation

## Overview

Loopwell 2.0 supports multiple workspaces per user. Users can belong to multiple workspaces and switch between them seamlessly. The workspace context is managed client-side and persists across sessions.

## Behavior

### Single-Workspace Users

When a user belongs to only one workspace:

- **Workspace Switcher**: Shows the workspace name with role badge (non-interactive, no dropdown)
- **UI**: Clean, minimal display - just shows current workspace
- **Behavior**: All pages load data for the single workspace automatically

### Multi-Workspace Users

When a user belongs to 2+ workspaces:

- **Workspace Switcher**: Shows dropdown menu with all workspaces
- **Current Workspace**: Highlighted in dropdown
- **Switching**: Click any workspace in dropdown to switch
- **Persistence**: Selected workspace stored in `localStorage.currentWorkspaceId`
- **Data Updates**: Switching workspace updates:
  - Projects list (shows projects from new workspace)
  - Wiki pages (shows pages from new workspace)
  - Dashboard data (shows metrics from new workspace)
  - Org view (shows org structure from new workspace)
  - Loopbrain context (uses workspaceId from server-side auth, not localStorage)

### First Login / Default Workspace

When a user first logs in:

- **Default Workspace**: Created automatically via `createDefaultWorkspaceForUser()`
- **Workspace Switcher**: Shows the default workspace
- **Onboarding**: User can create additional workspaces via "Create Workspace" button

### Edge Case: User Removed from Workspace

If a user is removed from a workspace that was stored in `localStorage.currentWorkspaceId`:

- **On Next Login**: Provider detects invalid workspaceId
- **Fallback**: Automatically selects first available workspace
- **No Errors**: Graceful fallback, no broken state

## Data Flow

```
/api/workspaces (GET)
  ↓
Returns: { workspaces: [{ id, name, slug, description, createdAt, updatedAt, userRole }] }
  ↓
WorkspaceProvider.loadWorkspaces()
  ↓
Sets: workspaces state, currentWorkspace, userRole
  ↓
useWorkspace() hook
  ↓
WorkspaceSwitcher component
  ↓
User selects workspace → switchWorkspace(workspaceId)
  ↓
Updates: currentWorkspace, userRole, localStorage.currentWorkspaceId
  ↓
Components react to workspace change via useWorkspace()
```

### Server-Side Workspace Resolution

**Important**: Loopbrain and API routes use `getUnifiedAuth()` which resolves `workspaceId` server-side:

- **Priority**: URL params → header → user's first workspace
- **Not affected by**: `localStorage.currentWorkspaceId` (client-side only)
- **When switching**: Frontend should pass `workspaceId` in URL params or header for API calls

## Manual Test Scenarios

### Test 1: User with 1 Workspace

**Setup**:
- User belongs to exactly 1 workspace

**Steps**:
1. Visit `/home` (dashboard)
2. Visit `/wiki/home` (spaces)
3. Visit `/projects` (if exists)

**Expected**:
- Workspace switcher shows workspace name (no dropdown)
- All pages load correctly
- Role badge displayed correctly
- No errors in console

### Test 2: User with 2+ Workspaces

**Setup**:
- User belongs to 2+ workspaces
- Each workspace has different projects/wiki pages

**Steps**:
1. Visit `/home` - note current workspace and projects
2. Open workspace switcher dropdown
3. Verify all workspaces listed
4. Switch to different workspace
5. Verify:
   - Projects list updates
   - Wiki pages update
   - Dashboard data updates
   - Org view updates (if applicable)
6. Refresh page
7. Verify selected workspace persists

**Expected**:
- Dropdown shows all workspaces
- Current workspace highlighted
- Switching updates all data correctly
- Selection persists after refresh
- No errors in console

### Test 3: Edge Case - Removed from Workspace

**Setup**:
- User belongs to workspace A and workspace B
- `localStorage.currentWorkspaceId` = workspace A
- Remove user from workspace A (via admin or DB)

**Steps**:
1. Refresh page
2. Check console for warnings
3. Verify current workspace is workspace B (not A)

**Expected**:
- Provider detects invalid workspaceId
- Falls back to first available workspace (B)
- No errors thrown
- User can continue working

### Test 4: First Login / Default Workspace

**Setup**:
- New user (no workspaces)

**Steps**:
1. Login for first time
2. Verify default workspace created
3. Verify workspace switcher shows workspace
4. Create additional workspace
5. Verify switcher shows dropdown with 2 workspaces

**Expected**:
- Default workspace created automatically
- Switcher shows workspace name
- Can create additional workspaces
- Can switch between workspaces

### Test 5: Workspace Switching Persistence

**Setup**:
- User with 2+ workspaces

**Steps**:
1. Select workspace A
2. Close browser
3. Reopen browser and login
4. Verify workspace A is still selected

**Expected**:
- Selection persists via `localStorage.currentWorkspaceId`
- Workspace A loads automatically on next session

## Component Integration

### Using Workspace Context

```typescript
import { useWorkspace } from '@/lib/workspace-context'

function MyComponent() {
  const { 
    currentWorkspace, 
    workspaces, 
    userRole, 
    switchWorkspace,
    isLoading 
  } = useWorkspace()
  
  // Handle loading state
  if (isLoading) return <Loading />
  
  // Handle no workspace
  if (!currentWorkspace) return <CreateWorkspacePrompt />
  
  // Use workspace data
  return <div>Current: {currentWorkspace.name}</div>
}
```

### Workspace Switcher Component

The `WorkspaceSwitcher` component is already integrated in the Header:

- **Location**: `src/components/layout/workspace-switcher.tsx`
- **Usage**: Automatically rendered in Header
- **Behavior**: Adapts based on workspace count (single vs multiple)

## API Endpoints

### GET `/api/workspaces`

**Returns**: All workspaces where user has `WorkspaceMember` record

**Response**:
```json
{
  "workspaces": [
    {
      "id": "workspace-id",
      "name": "Workspace Name",
      "slug": "workspace-slug",
      "description": "Description",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "userRole": "OWNER"
    }
  ]
}
```

### GET `/api/workspaces/[workspaceId]/user-role`

**Note**: Still available but not needed by WorkspaceProvider (role included in `/api/workspaces` response)

**Returns**: User's role in specific workspace

## Technical Details

### Workspace Selection Logic

1. **Client-side check**: `localStorage.getItem('currentWorkspaceId')`
2. **Validation**: Verify saved workspaceId exists in fetched workspaces array
3. **Fallback**: Use `workspaces[0]` if invalid or missing
4. **Edge case**: Set to `null` if no workspaces

### Role Loading

- **Source**: `userRole` from `/api/workspaces` response (no separate fetch)
- **Caching**: Role stored in `workspaces` array
- **Switching**: Get role from cached workspace data

### localStorage Usage

- **Key**: `currentWorkspaceId`
- **Value**: Workspace ID string
- **Persistence**: Survives browser sessions
- **Scope**: Client-side only (not used by server-side auth)

## Troubleshooting

### Workspace Switcher Not Showing

- **Check**: Is `WorkspaceProvider` wrapping the app?
- **Check**: Is user authenticated?
- **Check**: Does user have at least one workspace?

### Switching Doesn't Update Data

- **Check**: Are components using `useWorkspace()` hook?
- **Check**: Do API routes use `getUnifiedAuth()` for workspaceId?
- **Check**: Is workspaceId passed in URL params or header?

### Role Not Displayed

- **Check**: Does `/api/workspaces` return `userRole`?
- **Check**: Is `userRole` set in WorkspaceProvider state?
- **Check**: Is WorkspaceSwitcher using `userRole` from context?

## Related Documentation

- `ARCHITECTURE_SUMMARY.md` - Overall architecture
- `docs/MULTI_TENANT_HARDENING.md` - Multi-tenant security
- `docs/PRISMA_SCOPING_FEATURE_FLAG.md` - Prisma scoping
