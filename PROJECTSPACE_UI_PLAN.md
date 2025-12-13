# ProjectSpace UI Implementation Plan

## Step 1: Current Implementation Map

### Project Creation
- **Component**: `src/components/projects/create-project-dialog.tsx`
- **Route**: `/projects/new` (renders CreateProjectDialog)
- **API Endpoint**: `POST /api/projects`
- **Current Fields**: name, description, status, priority, startDate, endDate
- **Missing**: `projectSpaceId` field

### Task Creation/Edit
- **Components**:
  - `src/components/tasks/create-task-dialog.tsx` (create)
  - `src/components/tasks/task-edit-dialog.tsx` (edit - deprecated but still used)
  - `src/components/tasks/task-sidebar.tsx` (edit - newer)
- **API Endpoints**:
  - `POST /api/tasks` (create)
  - `PATCH /api/tasks/[id]` (update)
- **Assignee Source**: Currently uses `GET /api/users` which returns ALL workspace members
- **Problem**: Does NOT filter by project access (Policy B violation)

### Project Display
- **Component**: `src/app/(dashboard)/projects/[id]/page.tsx`
- **API Endpoint**: `GET /api/projects/[projectId]`
- **Current Data**: Project details, members, tasks, etc.
- **Missing**: ProjectSpace visibility badge

### Project List
- **Component**: `src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx`
- **API Endpoint**: `GET /api/projects`
- **Current Data**: List of projects with basic info
- **Missing**: ProjectSpace visibility badge

### Existing Endpoints

**Users/Workspace Members**:
- `GET /api/users` - Returns all users in current workspace (used for assignees)
- `GET /api/workspaces/[workspaceId]/members` - Returns workspace members with roles
- `GET /api/org/users` - Returns users for org position assignment

**Projects**:
- `GET /api/projects` - List projects (filters by workspace, now includes ProjectSpace filtering)
- `GET /api/projects/[projectId]` - Get single project
- `POST /api/projects` - Create project (needs to accept `projectSpaceId`)

**Missing Endpoints**:
- `GET /api/project-spaces` - List ProjectSpaces for workspace
- `GET /api/projects/[projectId]/assignees` - Get assignable users for a project (Policy B compliant)

### Types/Interfaces

**Project Type** (from `src/app/(dashboard)/projects/[id]/page.tsx`):
```typescript
interface Project {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  // ... other fields
  // MISSING: projectSpace?: { id, name, visibility }
}
```

**User Type** (used in task dialogs):
```typescript
interface User {
  id: string
  name: string
  email: string
}
```

### Prisma Models Confirmed

✅ **ProjectSpace**: `id`, `workspaceId`, `name`, `description`, `visibility` (PUBLIC/TARGETED)
✅ **ProjectSpaceMember**: `id`, `projectSpaceId`, `userId`, `joinedAt`
✅ **Project.projectSpaceId**: Optional foreign key to ProjectSpace

### Naming Conflicts Check

✅ **No conflicts**: "ProjectSpace" is new, distinct from "Workspace"
- Workspace = Loopwell tenant (Workspace + WorkspaceMember)
- ProjectSpace = container for projects inside a workspace (PUBLIC/TARGETED)

## Step 2: Implementation Decisions

### 2.1 Project Creation: ProjectSpace Selector

**Location**: `src/components/projects/create-project-dialog.tsx`
- Add ProjectSpace selector after Description field
- Fetch ProjectSpaces on dialog open
- Default to "General" if exists, else first space, else null
- Hide selector if no ProjectSpaces exist (legacy behavior)

**API**: `GET /api/project-spaces` (new endpoint)
- Returns: `{ spaces: [{ id, name, visibility }] }`
- Auto-creates "General" if none exist (lazy creation)

**Backend**: Update `POST /api/projects` to accept `projectSpaceId?: string | null`

### 2.2 Visibility Badge

**Component**: New `ProjectSpaceBadge` component
- Shows "PUBLIC" (green) or "TARGETED" (orange/yellow)
- Render in:
  - Project header (single project view)
  - Project list cards (if space allows)

**Data Source**: Update `GET /api/projects` and `GET /api/projects/[id]` to include:
```typescript
projectSpace: {
  id: string
  name: string
  visibility: 'PUBLIC' | 'TARGETED'
} | null
```

### 2.3 Assignee Dropdown: Policy B Compliant

**Approach**: Option A - Create new endpoint (preferred)
- `GET /api/projects/[projectId]/assignees`
- Returns only users who have project access
- Logic:
  - If ProjectSpace is PUBLIC: all WorkspaceMembers
  - If TARGETED: ProjectSpaceMembers + ProjectMembers + creator/owner
- Used by: `CreateTaskDialog`, `TaskEditDialog`, `TaskSidebar`

**Update Components**:
- Replace `loadUsers()` calls with `loadAssignees(projectId)`
- Show clear message if no assignees available

### 2.4 Error Handling

**403 Error Display**:
- In task create/edit: Show toast/alert with API error message
- Message: "Cannot assign task: The selected assignee does not have access to this project. Please add them to the project space first."

## Step 3: Default "General" ProjectSpace

**Approach**: Lazy creation in `GET /api/project-spaces`
- If no ProjectSpaces exist for workspace, create "General" (PUBLIC)
- Use unique constraint on `[workspaceId, name]` to prevent duplicates
- Transactional upsert pattern

## Step 4: Files to Create/Modify

### New Files
1. `src/components/projects/project-space-badge.tsx` - Badge component
2. `src/app/api/project-spaces/route.ts` - List/create ProjectSpaces
3. `src/app/api/projects/[projectId]/assignees/route.ts` - Get assignable users

### Modified Files
1. `src/components/projects/create-project-dialog.tsx` - Add ProjectSpace selector
2. `src/components/tasks/create-task-dialog.tsx` - Use assignees endpoint
3. `src/components/tasks/task-edit-dialog.tsx` - Use assignees endpoint
4. `src/components/tasks/task-sidebar.tsx` - Use assignees endpoint
5. `src/app/(dashboard)/projects/[id]/page.tsx` - Show visibility badge
6. `src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx` - Show visibility badge (optional)
7. `src/app/api/projects/route.ts` - Accept projectSpaceId in POST, include projectSpace in GET
8. `src/app/api/projects/[projectId]/route.ts` - Include projectSpace in GET

## Step 5: Testing Checklist

- [ ] ProjectSpace selector appears in project creation
- [ ] "General" ProjectSpace auto-created on first access
- [ ] Visibility badge shows on project detail page
- [ ] Assignee dropdown only shows accessible users
- [ ] 403 error shows clear message when assigning invalid user
- [ ] PUBLIC space: all workspace members can be assigned
- [ ] TARGETED space: only space members can be assigned
- [ ] Legacy projects (no ProjectSpace) work correctly
