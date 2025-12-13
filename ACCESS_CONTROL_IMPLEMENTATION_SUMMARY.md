# Access Control Implementation Summary

## Problem Identified

**Bug**: A user invited as ADMIN to a Loopwell Workspace cannot open a Project even though they are set as a Task owner on a task inside that project.

**Root Cause**: 
- `assertProjectAccess()` only checks `ProjectMember` OR creator/owner
- It does NOT check:
  1. Task assignment (`Task.assigneeId`)
  2. ProjectSpace visibility (didn't exist)

## Solution Implemented

### 1. Database Schema Changes

**Added `ProjectSpace` model**:
- `id`, `workspaceId`, `name`, `description`
- `visibility`: `PUBLIC` (all workspace members) or `TARGETED` (only explicit members)
- Related to `Workspace` and has many `ProjectSpaceMember`

**Added `ProjectSpaceMember` model**:
- `id`, `projectSpaceId`, `userId`, `joinedAt`
- Unique constraint on `[projectSpaceId, userId]`

**Updated `Project` model**:
- Added optional `projectSpaceId` field
- Projects can belong to a ProjectSpace (or be unassigned, treated as PUBLIC)

### 2. Access Control Logic Updates

**Updated `assertProjectAccess()`** (`src/lib/pm/guards.ts`):
- Now checks ProjectSpace visibility:
  - **PUBLIC**: All workspace members can access
  - **TARGETED**: Only `ProjectSpaceMember` can access (or creator/owner)
- Maintains backward compatibility with existing `ProjectMember` checks

**Added `hasProjectAccess()` helper**:
- Returns boolean indicating if user has project access
- Used for task assignment validation (Policy B)

### 3. API Endpoint Updates

**`GET /api/projects`** (`src/app/api/projects/route.ts`):
- Filters projects by ProjectSpace visibility
- PUBLIC spaces: show all projects to workspace members
- TARGETED spaces: only show if user is `ProjectSpaceMember`
- Projects without ProjectSpace (legacy): treated as PUBLIC

**`POST /api/tasks`** (`src/app/api/tasks/route.ts`):
- **Policy B enforcement**: Validates assignee has project access before assignment
- Returns 403 with clear error if assignee lacks access

**`PATCH /api/tasks/[id]`** (`src/app/api/tasks/[id]/route.ts`):
- **Policy B enforcement**: Validates assignee has project access before updating assignment
- Returns 403 with clear error if assignee lacks access

### 4. Policy B: Task Assignment Does NOT Grant Access

**Decision**: Task assignment does NOT imply project access. UI must prevent assigning tasks to users who can't access the project.

**Implementation**:
- Before assigning/updating task assignee, check `hasProjectAccess(assigneeId, projectId, workspaceId)`
- If false, return 403: "Cannot assign task: The selected assignee does not have access to this project. Please add them to the project first."

## Migration Strategy

1. **Migration file created**: `prisma/migrations/20250113000000_add_project_spaces/migration.sql`
2. **Backward compatibility**: 
   - Existing projects have `projectSpaceId = null` (treated as PUBLIC)
   - All existing access patterns continue to work
3. **Future**: Can create default "General" ProjectSpace for each workspace and migrate projects

## Testing Checklist

- [ ] PUBLIC space: All workspace members can list projects
- [ ] TARGETED space: Only members can list/get projects/tasks
- [ ] Assign task to non-member: Should be blocked (403)
- [ ] Workspace ADMIN without ProjectMember: Can access PUBLIC space projects
- [ ] Workspace ADMIN without ProjectMember: Cannot access TARGETED space projects (unless member)
- [ ] Task assignee without project access: Cannot access project (Policy B)
- [ ] Project creator/owner: Always has access regardless of ProjectSpace visibility

## Files Changed

1. `prisma/schema.prisma` - Added ProjectSpace, ProjectSpaceMember models
2. `src/lib/pm/guards.ts` - Updated assertProjectAccess, added hasProjectAccess
3. `src/app/api/projects/route.ts` - Added ProjectSpace visibility filtering
4. `src/app/api/tasks/route.ts` - Added Policy B validation
5. `src/app/api/tasks/[id]/route.ts` - Added Policy B validation
6. `prisma/migrations/20250113000000_add_project_spaces/migration.sql` - Migration file

## Next Steps (Optional)

1. Create ProjectSpace management API endpoints:
   - `GET /api/project-spaces` - List spaces
   - `POST /api/project-spaces` - Create space
   - `PATCH /api/project-spaces/[id]` - Update space
   - `GET /api/project-spaces/[id]/members` - List members
   - `POST /api/project-spaces/[id]/members` - Add member

2. Update UI to:
   - Show ProjectSpace selector when creating projects
   - Display ProjectSpace visibility badge
   - Filter project list by ProjectSpace
   - Show only accessible users in task assignee dropdown

3. Backfill existing projects:
   - Create default "General" ProjectSpace for each workspace
   - Migrate existing projects to default space
