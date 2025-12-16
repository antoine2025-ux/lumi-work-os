# Access Control Analysis & Fix Plan

## Step 1: Current Data Model

### Tables and Key Fields

**Workspace (Tenant)**
- `Workspace` table: `id`, `name`, `slug`, `ownerId`
- `WorkspaceMember` table: `workspaceId`, `userId`, `role` (OWNER/ADMIN/MEMBER/VIEWER)
- **Access is enforced by**: `WorkspaceMember` table using composite key `[workspaceId, userId]`

**Project**
- `Project` table: `id`, `workspaceId`, `name`, `createdById`, `ownerId`
- `ProjectMember` table: `projectId`, `userId`, `role` (OWNER/ADMIN/MEMBER/VIEWER)
- **Access is enforced by**: `ProjectMember` table OR fallback to `createdById`/`ownerId`

**Task**
- `Task` table: `id`, `projectId`, `workspaceId`, `assigneeId`, `createdById`
- **Task owner is stored in**: `Task.assigneeId` field
- **Task assignment is NOT checked by authorization middleware**: ❌ This is the bug

**ProjectSpace**
- **DOES NOT EXIST** - This is a new concept we need to add

### Current Access Control Flow

1. **Workspace Access**: Checked via `WorkspaceMember.findUnique({ workspaceId_userId })`
2. **Project Access**: Checked via:
   - `ProjectMember.findUnique({ projectId_userId })` OR
   - Fallback: `project.createdById === userId || project.ownerId === userId`
3. **Task Access**: Inherits from project access (no separate check)
4. **Task Assignment**: Does NOT grant project access

## Step 2: Where Access is Enforced

### Authorization Helpers

**`getUnifiedAuth(request)`** (`src/lib/unified-auth.ts`)
- Resolves `workspaceId` from URL params → header → user's first workspace
- Returns `AuthContext` with `workspaceId` and `user.userId`

**`assertAccess(opts)`** (`src/lib/auth/assertAccess.ts`)
- Validates workspace membership via `WorkspaceMember`
- For project scope: checks `ProjectMember` OR creator/owner
- **Does NOT check task assignment**

**`assertProjectAccess(user, projectId, requiredRole, workspaceId?)`** (`src/lib/pm/guards.ts`)
- Fetches project and checks `ProjectMember` record
- Falls back to creator/owner if no `ProjectMember` record
- **Does NOT check task assignment**

### API Endpoints

**`GET /api/projects`** (`src/app/api/projects/route.ts`)
- Requires: Workspace membership (MEMBER+)
- Filters: `where: { workspaceId: auth.workspaceId }`
- **Does NOT filter by ProjectSpace visibility** (doesn't exist yet)

**`GET /api/projects/[projectId]`** (`src/app/api/projects/[projectId]/route.ts`)
- Requires: `assertProjectAccess()` → checks `ProjectMember` OR creator/owner
- **Does NOT check task assignment**

**`GET /api/tasks`** (`src/app/api/tasks/route.ts`)
- Requires: Project access via `assertAccess({ scope: 'project' })`
- Filters: `where: { projectId, workspaceId }`
- **Does NOT check if user is task assignee**

**`POST /api/tasks`** (`src/app/api/tasks/route.ts`)
- Requires: Project access via `assertAccess({ scope: 'project' })`
- **Does NOT validate that assigneeId has project access** (Policy B violation)

**`PATCH /api/tasks/[id]`** (`src/app/api/tasks/[id]/route.ts`)
- Updates `assigneeId` without checking if assignee has project access
- **Does NOT enforce Policy B**

## Step 3: The Bug - Truth Table

### Current Rules

| User Status | ProjectMember? | Task Assignee? | Can Access Project? |
|------------|----------------|----------------|---------------------|
| Workspace ADMIN | ❌ No | ❌ No | ❌ **NO** (Bug!) |
| Workspace ADMIN | ❌ No | ✅ Yes | ❌ **NO** (Bug!) |
| Workspace MEMBER | ✅ Yes | ❌ No | ✅ Yes |
| Workspace MEMBER | ❌ No | ✅ Yes | ❌ **NO** (Expected with Policy B) |
| Project Creator | ❌ No | ❌ No | ✅ Yes (fallback) |
| Project Owner | ❌ No | ❌ No | ✅ Yes (fallback) |

### The Exact Problem

**Scenario**: User invited as ADMIN to a Loopwell Workspace, but NOT added as ProjectMember to a specific project.

**Current behavior**:
1. User tries to access project → `assertProjectAccess()` is called
2. `assertProjectAccess()` checks `ProjectMember` → ❌ Not found
3. Falls back to creator/owner check → ❌ Not creator/owner
4. **Throws "Forbidden: Insufficient project permissions"**
5. Even if user is assigned to a task in that project, they still can't access it

**Root cause**: `assertProjectAccess()` does NOT check:
- Task assignment (`Task.assigneeId`)
- ProjectSpace visibility (doesn't exist yet)

## Step 4: Desired Policy (The Fix)

### Policy B: Task Assignment Does NOT Grant Access

**Decision**: Task assignment does NOT imply project access. UI must prevent assigning tasks to users who can't access the project.

### New Access Rules

**Loopwell Workspace (Tenant)**
- Any workspace member can exist (role controls admin settings, not project visibility by default)

**Project Space Visibility** (NEW)
- `visibility = PUBLIC`: All workspace members can see projects in that space
- `visibility = TARGETED`: Only members explicitly added (or via team membership) can see it

**Project Visibility**
- Inherits from Project Space by default
- Optional: project-level overrides (future, not required now)

**Task Visibility**
- Inherits from project access
- Task assignment does NOT grant access (Policy B)

**Task Assignment Validation**
- Before assigning a task to a user, verify they have project access
- If they don't, either:
  - Block the assignment (Policy B - chosen)
  - OR auto-grant access (Policy A - rejected)

## Step 5: Implementation Plan

### Database Changes

1. **Add `ProjectSpace` model**:
   ```prisma
   model ProjectSpace {
     id          String   @id @default(cuid())
     workspaceId String
     name        String
     description String?
     visibility  ProjectSpaceVisibility @default(PUBLIC)
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     workspace   Workspace @relation(fields: [workspaceId], references: [id])
     projects    Project[]
     members     ProjectSpaceMember[]
   }
   
   enum ProjectSpaceVisibility {
     PUBLIC    // All workspace members can see
     TARGETED  // Only explicit members can see
   }
   ```

2. **Add `ProjectSpaceMember` model**:
   ```prisma
   model ProjectSpaceMember {
     id            String       @id @default(cuid())
     projectSpaceId String
     userId        String
     joinedAt      DateTime     @default(now())
     projectSpace  ProjectSpace @relation(fields: [projectSpaceId], references: [id])
     user          User         @relation(fields: [userId], references: [id])
     
     @@unique([projectSpaceId, userId])
   }
   ```

3. **Add `projectSpaceId` to `Project` model**:
   ```prisma
   model Project {
     // ... existing fields
     projectSpaceId String?
     projectSpace   ProjectSpace? @relation(fields: [projectSpaceId], references: [id])
   }
   ```

### Code Changes

1. **Update `assertProjectAccess()`** (`src/lib/pm/guards.ts`):
   - Check ProjectSpace visibility
   - If PUBLIC: allow all workspace members
   - If TARGETED: check `ProjectSpaceMember`
   - Keep existing `ProjectMember` and creator/owner fallbacks

2. **Update `GET /api/projects`** (`src/app/api/projects/route.ts`):
   - Filter projects by ProjectSpace visibility
   - PUBLIC spaces: show all projects
   - TARGETED spaces: only show if user is `ProjectSpaceMember`

3. **Add task assignment validation**:
   - In `POST /api/tasks` and `PATCH /api/tasks/[id]`:
   - Before setting `assigneeId`, verify assignee has project access
   - If not, return 403 with clear error message

4. **Create ProjectSpace management endpoints**:
   - `GET /api/project-spaces` - List spaces
   - `POST /api/project-spaces` - Create space
   - `PATCH /api/project-spaces/[id]` - Update space (visibility, members)
   - `GET /api/project-spaces/[id]/members` - List members
   - `POST /api/project-spaces/[id]/members` - Add member

## Step 6: Migration Strategy

1. **Create migration** for ProjectSpace and ProjectSpaceMember
2. **Set default**: All existing projects get `projectSpaceId = null` (treated as PUBLIC)
3. **Backfill**: Create a default "General" ProjectSpace for each workspace
4. **Update access checks**: Add ProjectSpace visibility logic
5. **Add validation**: Enforce Policy B in task assignment endpoints

## Step 7: Testing Checklist

- [ ] PUBLIC space: All workspace members can list projects
- [ ] TARGETED space: Only members can list/get projects/tasks
- [ ] Assign task to non-member: Should be blocked (403)
- [ ] Workspace ADMIN without ProjectMember: Can access PUBLIC space projects
- [ ] Workspace ADMIN without ProjectMember: Cannot access TARGETED space projects (unless member)
- [ ] Task assignee without project access: Cannot access project (Policy B)
