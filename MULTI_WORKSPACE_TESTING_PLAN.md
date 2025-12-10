# Multi-Workspace Testing & Safety Plan

## Current Behavior Summary

### WorkspaceProvider Current Workspace Selection
- **Initial state**: `currentWorkspace = null` (server-side safe)
- **Selection logic** (in `useEffect`):
  1. Fetches `/api/workspaces` → gets `workspaces` array with `userRole`
  2. Checks `localStorage.currentWorkspaceId` (client-side only, guarded)
  3. Validates saved workspaceId exists in fetched workspaces array
  4. Falls back to `workspaces[0]` if invalid or missing
  5. Sets `null` if no workspaces
- **Persistence**: Updates `localStorage.currentWorkspaceId` when workspace selected
- **SSR safety**: All `localStorage` access guarded with `typeof window !== 'undefined'`

### WorkspaceSwitcher Interaction
- **Uses**: `useWorkspace()` hook to get `workspaces`, `currentWorkspace`, `switchWorkspace`
- **Behavior**:
  - Single workspace: Shows name only (no dropdown)
  - Multiple workspaces: Shows dropdown, calls `switchWorkspace(id)` on selection
  - No workspaces: Shows "Create Workspace" button

### Prisma vs prismaUnscoped Usage
- **`prisma`**: Main export - scoped or unscoped based on `PRISMA_WORKSPACE_SCOPING_ENABLED`
  - When scoped: Requires `setWorkspaceContext()` before queries
  - Used in: API routes, server components
- **`prismaUnscoped`**: Always unscoped, for scripts/background jobs
  - Used in: `server.js` cron job, migration scripts, one-off scripts

---

## Files to Create/Modify

### A. SSR Safety

#### 1. `src/lib/workspace-context.tsx`
**Changes**:
- Verify all `localStorage` access is in `useEffect` (already done)
- Add comments explaining SSR behavior
- Ensure initial state is `null` (already done)

### B. Unit Tests

#### 2. `src/lib/workspace-context.test.ts` (NEW)
**Tests**:
- Permission helper functions (pure logic)
- Workspace selection logic (mocked localStorage)
- switchWorkspace validation

### C. Integration Test / Manual Script

#### 3. `docs/MULTI_WORKSPACE_TEST_RUNBOOK.md` (NEW)
**Content**:
- Manual test script with curl commands
- How frontend workspace selection affects server-side auth
- Verification steps

### D. Scoping Feature Flag Docs

#### 4. `docs/MULTI_TENANT_HARDENING.md` (UPDATE)
**Add**:
- How to enable scoping flag in staging
- Bad query example to verify errors

---

## Implementation Details

### SSR Safety Verification

**Current state**: Already safe - all `localStorage` access is:
- Inside `useEffect` (runs client-side only)
- Guarded with `typeof window !== 'undefined'`
- Initial state is `null` (no hydration mismatch)

**Add**: Comments explaining SSR behavior

### Unit Tests

**Focus**: Pure logic functions that don't require React rendering

**Test cases**:
1. Permission helpers with different roles
2. Workspace selection logic (mocked localStorage)
3. switchWorkspace validation

### Integration Test Script

**Manual script**:
- Create user with 2 workspaces
- Call `/api/workspaces` → verify both returned
- Call `/api/projects` with different workspace contexts
- Verify data isolation

### Scoping Flag Verification

**Documentation**:
- Enable flag in staging
- Show example of bad query (no workspace context)
- Expected error message
