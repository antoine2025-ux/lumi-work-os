# Manual Test Notes - ProjectSpace UI

## Test Environment Setup

1. Ensure database migration has been run: `npx prisma migrate dev`
2. Ensure Prisma client is regenerated: `npx prisma generate`
3. Start the development server

## Test Cases

### 1. ProjectSpace Auto-Creation

**Steps**:
1. Navigate to `/projects/new`
2. Open browser dev tools network tab
3. Check that `GET /api/project-spaces` is called
4. Verify "General" ProjectSpace is created automatically

**Expected**: 
- "General" ProjectSpace appears in dropdown
- No errors in console

### 2. Project Creation with ProjectSpace

**Steps**:
1. Navigate to `/projects/new`
2. Fill in project name
3. Select a ProjectSpace from dropdown (or leave empty)
4. Create project

**Expected**:
- Project is created successfully
- If ProjectSpace selected, project is assigned to that space
- If no ProjectSpace selected, project has `projectSpaceId = null`

### 3. Visibility Badge Display

**Steps**:
1. Create a project in a PUBLIC ProjectSpace
2. Navigate to project detail page
3. Check project header

**Expected**:
- Visibility badge shows "PUBLIC" (green)
- Badge is visible next to project name

**Steps** (TARGETED):
1. Create a project in a TARGETED ProjectSpace
2. Navigate to project detail page

**Expected**:
- Visibility badge shows "TARGETED" (yellow/orange)

### 4. Assignee Dropdown - Policy B Compliance

**Steps** (PUBLIC ProjectSpace):
1. Create a project in a PUBLIC ProjectSpace
2. Create a new task
3. Open assignee dropdown

**Expected**:
- All workspace members appear in dropdown
- No 403 errors

**Steps** (TARGETED ProjectSpace):
1. Create a project in a TARGETED ProjectSpace
2. Add yourself as ProjectSpaceMember (via API or DB)
3. Create a new task
4. Open assignee dropdown

**Expected**:
- Only ProjectSpaceMembers appear in dropdown
- Other workspace members are NOT shown

### 5. Task Assignment - Policy B Enforcement

**Steps**:
1. Create a project in a TARGETED ProjectSpace
2. Ensure current user is NOT a ProjectSpaceMember
3. Try to assign task to a user who is also NOT a member
4. Submit task creation

**Expected**:
- API returns 403 error
- Error message: "Cannot assign task: The selected assignee does not have access to this project. Please add them to the project space first."
- Error is displayed in UI (toast/alert)

### 6. Legacy Projects (No ProjectSpace)

**Steps**:
1. Create a project without selecting a ProjectSpace (or with projectSpaceId = null)
2. Navigate to project detail page
3. Create a new task
4. Open assignee dropdown

**Expected**:
- No visibility badge shown (project has no ProjectSpace)
- All workspace members appear in assignee dropdown (treated as PUBLIC)
- Task assignment works normally

### 7. Task Edit - Assignee Update

**Steps**:
1. Open an existing task for editing
2. Try to change assignee to a user without project access
3. Save changes

**Expected**:
- API returns 403 if assignee lacks access
- Clear error message displayed
- Task is not updated

### 8. Workspace ADMIN Access

**Steps**:
1. Invite a user as ADMIN to workspace
2. Ensure they are NOT a ProjectMember or ProjectSpaceMember
3. Have them navigate to a project in a PUBLIC ProjectSpace
4. Have them try to create a task

**Expected**:
- ADMIN can access PUBLIC project
- ADMIN can see all workspace members in assignee dropdown
- Task creation works

**Steps** (TARGETED):
1. Same setup but project is in TARGETED ProjectSpace
2. ADMIN is NOT a ProjectSpaceMember

**Expected**:
- ADMIN cannot access TARGETED project (403)
- OR if they can access, only ProjectSpaceMembers appear in assignee dropdown

## Edge Cases

### Edge Case 1: No ProjectSpaces Exist
- First user in workspace
- No "General" space created yet

**Expected**: ProjectSpace selector is hidden, project created with `projectSpaceId = null`

### Edge Case 2: Task with Invalid Assignee
- Task was created when assignee had access
- Assignee later removed from ProjectSpace
- Task still shows old assignee

**Expected**: 
- Task displays current assignee (even if invalid)
- UI should show warning or prevent saving if assignee is invalid
- API will block update if assignee lacks access

### Edge Case 3: Concurrent ProjectSpace Creation
- Multiple users create projects simultaneously
- "General" ProjectSpace creation race condition

**Expected**: Unique constraint prevents duplicates, all users get same "General" space

## API Endpoint Tests

### GET /api/project-spaces
```bash
curl -X GET http://localhost:3000/api/project-spaces \
  -H "Cookie: [session cookie]"
```

**Expected**: Returns `{ spaces: [{ id, name, visibility, ... }] }`

### GET /api/projects/[projectId]/assignees
```bash
curl -X GET http://localhost:3000/api/projects/[projectId]/assignees \
  -H "Cookie: [session cookie]"
```

**Expected**: Returns `{ users: [{ id, name, email, image }] }` with only accessible users

### POST /api/projects (with projectSpaceId)
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: [session cookie]" \
  -d '{
    "workspaceId": "...",
    "name": "Test Project",
    "projectSpaceId": "..."
  }'
```

**Expected**: Project created with specified ProjectSpace

## Notes

- All tests should be run in a development environment
- Use browser dev tools to inspect network requests
- Check console for errors
- Verify database state after operations
- Test both authenticated and unauthenticated scenarios
