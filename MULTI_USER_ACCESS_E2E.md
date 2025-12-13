# Multi-User Access End-to-End Scenario

## Step 1: Reproduce the Exact Scenario

### Setup Steps

1. **Workspace owner creates workspace**
   - Owner: `owner@example.com`
   - Workspace: "Test Workspace"

2. **Creates a TARGETED ProjectSpace + project inside it**
   - ProjectSpace: "Engineering" (visibility: TARGETED)
   - Project: "Q4 Product Launch" (assigned to Engineering space)
   - Owner adds themselves as ProjectSpaceMember

3. **Invites user as ADMIN to workspace**
   - Invited user: `admin@example.com`
   - Role: ADMIN
   - Invite accepted, user is now WorkspaceMember with ADMIN role

4. **Assigns them to a task inside that project**
   - Owner creates task "Design new feature"
   - Assigns task to `admin@example.com`
   - Task is created successfully (Policy B allows assignment if assignee has access, but in this case they don't)

5. **User tries to open the project / tasks**
   - Admin user navigates to `/projects/[projectId]`
   - OR tries to view assigned tasks
   - OR tries to create/edit tasks

### Expected vs Actual Outcome

**Expected (Current Behavior)**:
- ❌ User gets 403 Forbidden error
- ❌ No clear explanation why
- ❌ No obvious fix path
- ❌ User is confused: "I'm an ADMIN, why can't I access this?"

**Desired Outcome**:
- ✅ User sees friendly message: "You don't have access to this ProjectSpace"
- ✅ Clear explanation: "This project is in a targeted ProjectSpace. Ask an admin/owner to add you."
- ✅ If user is ADMIN/OWNER: CTA button "Manage ProjectSpace members"
- ✅ If not: "Request access" button (copies message to clipboard)

### Which Rule Blocks It

**Blocking Rule**: ProjectSpace TARGETED membership requirement

**Current Access Check Flow**:
1. User requests project → `GET /api/projects/[projectId]`
2. Backend calls `assertProjectAccess()`
3. `assertProjectAccess()` checks:
   - Workspace membership ✅ (user is ADMIN, so this passes)
   - ProjectSpace visibility:
     - If PUBLIC → all workspace members can access ✅
     - If TARGETED → only ProjectSpaceMembers can access ❌
   - User is NOT a ProjectSpaceMember → **403 Forbidden**

**Why Task Assignment Doesn't Help**:
- Policy B: Task assignment does NOT grant project access
- Even though user is assigned to a task, they still can't access the project
- This is intentional to prevent accidental data leakage

### Where in UI We Should Guide the User

**Primary Location**: Project detail page (`src/app/(dashboard)/projects/[id]/page.tsx`)

**When to Show**:
- Project fetch returns 403
- OR project data is null/undefined after fetch
- OR `assertProjectAccess()` throws 403

**UI Components Needed**:
1. **AccessDenied component** - Shows friendly message + CTA
2. **ProjectSpaceMembersModal** - Manage members (ADMIN/OWNER only)
3. **RequestAccessButton** - Copies message to clipboard (non-admin)

**Secondary Locations**:
- Task list page (if filtering by project)
- Task detail page (if project access is required)
- Assignee dropdown (show helper text if empty in TARGETED space)

## Step 2: Edge Cases

### Edge Case 1: Empty TARGETED Space
- ProjectSpace is TARGETED
- Only creator is a member
- Creator assigns task to non-member
- Non-member can't access project

**Fix**: Show "No eligible assignees" message + link to manage members

### Edge Case 2: User Removed from ProjectSpace
- User was a ProjectSpaceMember
- Admin removes them
- User still has assigned tasks
- User can't access project anymore

**Fix**: Same access denied UI, but also show warning on task if assignee lacks access

### Edge Case 3: Legacy Project (No ProjectSpace)
- Project has `projectSpaceId = null`
- Treated as PUBLIC
- All workspace members can access
- No access issues expected

## Step 3: User Roles and Permissions

### Workspace ADMIN
- Can access PUBLIC projects ✅
- Cannot access TARGETED projects unless ProjectSpaceMember ❌
- Can manage ProjectSpace members ✅ (if workspace ADMIN/OWNER)
- Can add/remove members from TARGETED spaces ✅

### Workspace MEMBER
- Can access PUBLIC projects ✅
- Cannot access TARGETED projects unless ProjectSpaceMember ❌
- Cannot manage ProjectSpace members ❌
- Can request access (copy message to clipboard)

### ProjectSpaceMember (any workspace role)
- Can access projects in that space ✅
- Appears in assignee dropdown ✅
- Can be assigned tasks ✅

## Step 4: API Endpoints Needed

### New Endpoints

1. **GET /api/project-spaces/[id]/members**
   - Returns list of ProjectSpaceMembers
   - Requires: Workspace ADMIN/OWNER
   - Validates: ProjectSpace belongs to workspace

2. **POST /api/project-spaces/[id]/members**
   - Adds user to ProjectSpace
   - Body: `{ userId: string }`
   - Requires: Workspace ADMIN/OWNER
   - Validates: User is workspace member, ProjectSpace belongs to workspace

3. **DELETE /api/project-spaces/[id]/members/[userId]**
   - Removes user from ProjectSpace
   - Requires: Workspace ADMIN/OWNER
   - Validates: ProjectSpace belongs to workspace
   - Prevents: Removing creator/owner (optional)

### Existing Endpoints (Verify)

- `GET /api/project-spaces` - Already exists, returns spaces
- `GET /api/projects/[projectId]/assignees` - Already exists, Policy B compliant

## Step 5: UI Flow Diagram

```
User navigates to /projects/[id]
         |
         v
Fetch project (GET /api/projects/[id])
         |
         v
    [403 Error?]
         |
    Yes  |  No
         |     |
         v     v
  Show AccessDenied  Show Project
         |           |
         |           |
    [Is ADMIN/OWNER?]
         |
    Yes  |  No
         |     |
         v     v
  "Manage Members"  "Request Access"
    Button          Button
         |
         v
  Open MembersModal
         |
         v
  Add/Remove Members
```

## Step 6: Testing Checklist

- [ ] ADMIN user can't access TARGETED project (shows access denied)
- [ ] ADMIN user sees "Manage Members" button
- [ ] MEMBER user sees "Request Access" button
- [ ] Members modal opens for ADMIN/OWNER
- [ ] Members modal shows current members
- [ ] Can add workspace member to ProjectSpace
- [ ] Can remove member from ProjectSpace
- [ ] After adding member, user can access project
- [ ] Task assignee dropdown shows helper text if empty in TARGETED space
- [ ] Legacy projects (no ProjectSpace) work normally
- [ ] PUBLIC projects accessible to all workspace members
