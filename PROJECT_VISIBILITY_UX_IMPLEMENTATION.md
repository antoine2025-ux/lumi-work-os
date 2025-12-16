# Project Visibility UX Implementation

## Summary

Simplified the ProjectSpace UX so projects are **Public by default** (visible to all workspace members) and only require member selection when explicitly set to **Private**. This removes the need for users to think about ProjectSpaces during normal project creation.

## What Changed

### Backend Changes

1. **Updated Schemas** (`src/lib/pm/schemas.ts`):
   - Added `visibility?: 'PUBLIC' | 'TARGETED'` to `ProjectCreateSchema` and `ProjectUpdateSchema`
   - Added `memberUserIds?: string[]` for TARGETED projects
   - Kept `projectSpaceId` for legacy support

2. **New Helper Functions** (`src/lib/pm/project-space-helpers.ts`):
   - `getOrCreateGeneralProjectSpace()` - Gets or creates the default "General" PUBLIC space
   - `createPrivateProjectSpace()` - Creates a new TARGETED space for private projects

3. **Updated POST /api/projects** (`src/app/api/projects/route.ts`):
   - Accepts `visibility` and `memberUserIds` instead of requiring `projectSpaceId`
   - **PUBLIC (default)**: Automatically assigns to "General" ProjectSpace
   - **TARGETED**: Creates new private ProjectSpace, adds creator + selected members

4. **Updated PUT /api/projects/[projectId]** (`src/app/api/projects/[projectId]/route.ts`):
   - Supports `visibility` changes
   - **PUBLIC → TARGETED**: Creates new private space, moves project
   - **TARGETED → PUBLIC**: Moves project to General space
   - **TARGETED → TARGETED**: Updates members if `memberUserIds` provided

### Frontend Changes

1. **CreateProjectDialog** (`src/components/projects/create-project-dialog.tsx`):
   - ✅ Removed ProjectSpace selector from default flow
   - ✅ Added Visibility toggle (Public/Private radio buttons)
   - ✅ Shows member picker only when Private is selected
   - ✅ Default path: Public → zero extra steps → project created in General space
   - ✅ Private path: Select members → creates targeted space → adds members

2. **ProjectEditDialog** (`src/components/projects/project-edit-dialog.tsx`):
   - ✅ Added Visibility control section
   - ✅ Shows current visibility from `project.projectSpace.visibility`
   - ✅ Member picker appears when TARGETED
   - ✅ Switching visibility updates ProjectSpace automatically

## User Flows

### Creating a Public Project (Default)
1. User opens "Create Project" dialog
2. Fills in name, description, etc.
3. Visibility defaults to "Public"
4. Clicks "Create Project"
5. ✅ Project created in "General" (PUBLIC) space
6. ✅ All workspace members can access immediately

### Creating a Private Project
1. User opens "Create Project" dialog
2. Fills in name, description, etc.
3. Selects "Private" visibility
4. Member picker appears
5. User selects members (creator auto-included)
6. Clicks "Create Project"
7. ✅ New TARGETED ProjectSpace created: "Private: <Project Name>"
8. ✅ Selected members added to ProjectSpace
9. ✅ Only selected members can access

### Editing Project Visibility
1. User opens project edit dialog
2. Sees current visibility (Public/Private)
3. Can switch between Public/Private
4. If switching to Private: member picker appears
5. If switching to Public: project moves to General space
6. Saves changes
7. ✅ ProjectSpace updated automatically

## API Changes

### POST /api/projects

**New Request Body:**
```json
{
  "name": "My Project",
  "description": "...",
  "visibility": "PUBLIC",  // or "TARGETED"
  "memberUserIds": ["user1", "user2"]  // only for TARGETED
}
```

**Behavior:**
- `visibility` missing or `"PUBLIC"` → assigns to General space
- `visibility: "TARGETED"` → creates private space + adds members

### PUT /api/projects/[projectId]

**New Request Body:**
```json
{
  "name": "Updated Name",
  "visibility": "TARGETED",  // optional: change visibility
  "memberUserIds": ["user1", "user2"]  // optional: update members (only if TARGETED)
}
```

**Behavior:**
- `visibility: "PUBLIC"` → moves to General space
- `visibility: "TARGETED"` → creates/uses targeted space, updates members if provided

## Backward Compatibility

- ✅ Legacy projects (no `projectSpaceId`) treated as PUBLIC
- ✅ Existing `projectSpaceId` parameter still supported
- ✅ All existing access checks remain unchanged
- ✅ Policy B enforcement unchanged (task assignment never grants access)

## Testing Checklist

### Create Public Project
- [ ] Create project with default visibility (Public)
- [ ] Verify project appears in General space
- [ ] Verify all workspace members can access
- [ ] Verify assignee dropdown shows all workspace members

### Create Private Project
- [ ] Create project with Private visibility
- [ ] Select members in member picker
- [ ] Verify new ProjectSpace created: "Private: <Project Name>"
- [ ] Verify only selected members can access
- [ ] Verify assignee dropdown only shows selected members

### Edit Project Visibility
- [ ] Open existing Public project
- [ ] Switch to Private → verify member picker appears
- [ ] Add members and save
- [ ] Verify project moved to new targeted space
- [ ] Switch back to Public
- [ ] Verify project moved to General space

### Legacy Projects
- [ ] Verify projects without ProjectSpace still work
- [ ] Verify they're treated as PUBLIC
- [ ] Verify all workspace members can access

## Files Changed

### New Files
- `src/lib/pm/project-space-helpers.ts` - Helper functions for ProjectSpace management

### Modified Files
- `src/lib/pm/schemas.ts` - Added visibility and memberUserIds
- `src/app/api/projects/route.ts` - Updated POST to handle visibility
- `src/app/api/projects/[projectId]/route.ts` - Updated PUT to handle visibility changes
- `src/components/projects/create-project-dialog.tsx` - Simplified UI with visibility toggle
- `src/components/projects/project-edit-dialog.tsx` - Added visibility control

## Acceptance Criteria ✅

- ✅ Creating a project requires no ProjectSpace selection by default
- ✅ Newly created projects are visible to all workspace members unless user explicitly chooses Private
- ✅ If Private selected, user is prompted to add members (creator auto-included)
- ✅ Workspace member invited as ADMIN can access Public projects immediately
- ✅ Policy B remains enforced: assignees list only includes users with access
- ✅ Legacy projects still behave as Public
