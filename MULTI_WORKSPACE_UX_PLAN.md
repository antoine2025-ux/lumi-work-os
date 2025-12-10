# Multi-Workspace UX Implementation Plan

## Current State Summary

### WorkspaceProvider (`src/lib/workspace-context.tsx`)
- **Fetches**: Calls `/api/workspaces` (line 92)
- **Current workspace**: Uses `workspaces[0]` or `localStorage.getItem('currentWorkspaceId')` (lines 99-102)
- **localStorage**: Reads/writes `currentWorkspaceId` (lines 99, 106, 151)
- **Role loading**: Fetches separately via `/api/workspaces/${workspaceId}/user-role` (line 110)
- **switchWorkspace**: Exists but fetches role again (lines 147-179)

### Workspace Switcher (`src/components/layout/workspace-switcher.tsx`)
- **Exists**: Component already created
- **Behavior**: Always shows dropdown (doesn't handle single workspace case)
- **Integration**: Not imported in Header component
- **Uses**: `useWorkspace()` hook correctly

### API Response (`/api/workspaces`)
- **Returns**: All workspaces with `userRole` included (already implemented)
- **Shape**: `{ workspaces: [{ id, name, slug, description, createdAt, updatedAt, userRole }] }`

---

## Files to Modify

### 1. `src/lib/workspace-context.tsx`
**Changes**:
- Update `Workspace` interface to include `userRole` → rename to `WorkspaceWithRole`
- Update `WorkspaceContextType` to use `WorkspaceWithRole[]` and `WorkspaceWithRole | null`
- Fix current workspace selection logic:
  - Check `localStorage.currentWorkspaceId` (client-side only)
  - Validate it exists in fetched workspaces array
  - Fallback to `workspaces[0]` if invalid or missing
  - Handle no workspaces case (set to null)
- Use `userRole` from API response directly (no separate fetch needed)
- Update `switchWorkspace()` to use cached role from workspaces array
- Fix permission helpers to handle null cases gracefully

### 2. `src/components/layout/workspace-switcher.tsx`
**Changes**:
- Handle single workspace case: Show workspace name only (no dropdown)
- Handle multiple workspaces: Show dropdown with all workspaces
- Handle no workspaces: Show "Create Workspace" button
- Use `userRole` from workspace data (already available)

### 3. `src/components/layout/header.tsx`
**Changes**:
- Import and render `WorkspaceSwitcher` component
- Place it in the header (likely near logo or user menu)

### 4. `docs/MULTI_WORKSPACE_UX.md` (NEW)
**Content**:
- Behavior documentation
- Data flow explanation
- Manual test scenarios

---

## Implementation Details

### WorkspaceProvider Updates

**Type Updates**:
```typescript
export interface WorkspaceWithRole {
  id: string
  name: string
  slug: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
  userRole: WorkspaceRole
}

export interface WorkspaceContextType {
  currentWorkspace: WorkspaceWithRole | null
  userRole: WorkspaceRole | null
  workspaces: WorkspaceWithRole[]
  // ... rest
}
```

**Current Workspace Selection Logic**:
1. Client-side only: `const storedId = typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null`
2. If `storedId` exists and matches workspace in array → use that
3. Otherwise → use `workspaces[0]`
4. If `workspaces.length === 0` → set `currentWorkspace = null`, `userRole = null`

**Role Loading**:
- Use `userRole` from API response directly
- No need for separate `/api/workspaces/[id]/user-role` call
- When switching: get role from `workspaces.find(w => w.id === workspaceId)?.userRole`

**switchWorkspace()**:
- Validate `workspaceId` exists in `workspaces` array
- Set `currentWorkspace` from cached array
- Set `userRole` from cached array
- Update `localStorage.currentWorkspaceId`
- Log warning in dev if workspaceId not found

### Workspace Switcher Updates

**Single Workspace** (`workspaces.length === 1`):
- Show workspace name with role badge
- No dropdown/chevron
- Non-interactive

**Multiple Workspaces** (`workspaces.length > 1`):
- Show dropdown with current workspace highlighted
- List all other workspaces
- On selection: call `switchWorkspace(workspaceId)`

**No Workspaces** (`workspaces.length === 0`):
- Show "Create Workspace" button

### Header Integration

- Import `WorkspaceSwitcher`
- Place between logo and navigation items (or near user menu)
- Minimal styling to match existing header

---

## Testing Scenarios

### 1. User with 1 workspace
- Switcher shows workspace name (no dropdown)
- All pages load correctly
- Role displayed correctly

### 2. User with 2+ workspaces
- Switcher shows dropdown
- Can switch between workspaces
- Switching updates:
  - Projects list
  - Wiki pages
  - Dashboard data
  - Org view
- Selection persists via localStorage

### 3. Edge case: Removed from workspace
- If stored workspaceId no longer in workspaces array
- Provider falls back to first available workspace
- No errors thrown

### 4. First login / default workspace
- User sees their default workspace
- Can create additional workspaces
- Switching works correctly
