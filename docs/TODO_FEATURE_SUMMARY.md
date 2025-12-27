# Todo Feature - End-to-End Summary

## Overview

The Todo system is a lightweight task management feature that replaces the old "Tasks" on the Dashboard. It supports assignment to other users, optional anchoring to Projects/Tasks/Pages, and provides multiple views for organizing work.

---

## Database Schema

### Models & Enums

**Todo Model:**
- `id` - Unique identifier (CUID)
- `workspaceId` - Workspace the todo belongs to
- `title` - Required title (max 500 chars)
- `note` - Optional note/description (max 5000 chars)
- `status` - `OPEN` or `DONE` (default: `OPEN`)
- `dueAt` - Optional due date/time
- `priority` - Optional: `LOW`, `MEDIUM`, `HIGH`
- `createdById` - User who created the todo
- `assignedToId` - User assigned to complete the todo (required, defaults to creator)
- `anchorType` - `NONE`, `PROJECT`, `TASK`, or `PAGE` (default: `NONE`)
- `anchorId` - ID of the anchored entity (if anchorType is not NONE)
- `createdAt` / `updatedAt` - Timestamps

**Relations:**
- `workspace` → Workspace (Cascade delete)
- `createdBy` → User (Cascade delete)
- `assignedTo` → User (Cascade delete)

**Indexes:**
- `[workspaceId, assignedToId, status, dueAt]` - For filtering by assignee and due date
- `[workspaceId, anchorType, anchorId]` - For filtering by anchor
- `[workspaceId, createdById]` - For filtering by creator

---

## API Endpoints

### GET `/api/todos`

**Purpose:** List todos with various filters

**Query Parameters:**
- `view` - `'today'` | `'inbox'` | `'upcoming'`
  - `today`: Due today or overdue, status=OPEN
  - `inbox`: No due date, status=OPEN
  - `upcoming`: Due after today, status=OPEN
- `status` - `'OPEN'` | `'DONE'`
- `anchorType` - `'NONE'` | `'PROJECT'` | `'TASK'` | `'PAGE'`
- `anchorId` - ID of the anchored entity
- `assignedToId` - Filter by assignee
- `createdById` - Filter by creator
- `showAll` - If `true`, shows todos for all workspace members (default: only current user)

**Default Behavior:**
- If no `assignedToId` and `showAll` is not `true`, only shows todos assigned to the current user
- Orders by: status (OPEN first), dueAt (ascending), priority (descending), createdAt (descending)
- Limits to 100 results

**Authentication:** Requires workspace access (VIEWER, MEMBER, ADMIN, or OWNER)

---

### POST `/api/todos`

**Purpose:** Create a new todo

**Request Body:**
```typescript
{
  title: string (required, 1-500 chars)
  note?: string (optional, max 5000 chars)
  status?: 'OPEN' | 'DONE' (default: 'OPEN')
  dueAt?: ISO datetime string (optional)
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' (optional)
  assignedToId?: string (optional, defaults to creator)
  anchorType?: 'NONE' | 'PROJECT' | 'TASK' | 'PAGE' (default: 'NONE')
  anchorId?: string (optional, required if anchorType is not NONE)
}
```

**Validation:**
- Validates assignee is a workspace member
- Validates anchor exists (if anchorType is not NONE)
- Defaults `assignedToId` to creator if not provided

**Authentication:** Requires workspace access (MEMBER, ADMIN, or OWNER)

---

### GET `/api/todos/[id]`

**Purpose:** Get a single todo by ID

**Authentication:** Requires workspace access (VIEWER, MEMBER, ADMIN, or OWNER)

---

### PATCH `/api/todos/[id]`

**Purpose:** Update a todo

**Request Body:** Same fields as POST, all optional

**Permissions:**
- ✅ Creator can modify
- ✅ Assignee can modify
- ✅ Workspace OWNER/ADMIN can modify
- ❌ Others cannot modify

**Validation:**
- Validates assignee is a workspace member (if changing)
- Validates anchor exists (if changing)

**Authentication:** Requires workspace access (MEMBER, ADMIN, or OWNER)

---

### DELETE `/api/todos/[id]`

**Purpose:** Delete a todo

**Permissions:** Same as PATCH

**Authentication:** Requires workspace access (MEMBER, ADMIN, or OWNER)

---

## UI Components

### 1. Main Todos Page (`/todos`)

**Location:** `src/app/(dashboard)/todos/page.tsx`

**Features:**
- Three view tabs: **Today**, **Inbox**, **Upcoming**
- Quick-add input for fast todo creation
- Open todos list (filtered by view)
- Collapsible completed todos section
- "New To-do" button opens full creation dialog
- Click any todo to edit it

**Views:**
- **Today**: Todos due today or overdue (OPEN status)
- **Inbox**: Todos with no due date (OPEN status)
- **Upcoming**: Todos due after today (OPEN status)

**Layout:** Wrapped in `WikiLayout` to show project sidebar

---

### 2. Dashboard Card (`TodaysTodosCard`)

**Location:** `src/components/dashboard/todays-todos-card.tsx`

**Features:**
- Displays on the main Dashboard
- Title "To-do list" is clickable → navigates to `/todos`
- Filter dropdown: **Today**, **This week**, **All**
- Shows up to 5 open todos
- "+" button opens creation dialog
- "View all X to-dos" link if more than 5 todos
- Badge showing count of open todos

**Filter Options:**
- **Today**: Due today or overdue
- **This week**: Due within current week (Monday-Sunday)
- **All**: All open todos

---

### 3. Todo Item (`TodoItem`)

**Location:** `src/components/todos/todo-item.tsx`

**Displays:**
- ✅ Checkbox (toggles OPEN/DONE status)
- Title (strikethrough when DONE)
- Priority badge (LOW/MEDIUM/HIGH with color coding)
- Due date indicator:
  - Overdue: Red with alert icon
  - Today: Amber
  - Future: Muted with calendar icon
- Anchor badge (if linked to project/task/page)
- Assignee avatar (optional, can be hidden in compact mode)
- Note preview (in non-compact mode)

**Interactions:**
- Click checkbox → Toggle status
- Click item → Opens edit dialog (if `onClick` handler provided)

---

### 4. Create/Edit Dialog (`CreateTodoDialog`)

**Location:** `src/components/todos/create-todo-dialog.tsx`

**Fields:**
- **Title** (required)
- **Note** (optional textarea)
- **Due Date** (date picker)
- **Priority** (None, Low, Medium, High)
- **Assign to** (dropdown with workspace members, defaults to "Assign to me")
- **Link to Project** (optional, only shown if not pre-anchored)

**Features:**
- Loads workspace members for assignment
- Loads projects for linking
- Pre-fills if editing existing todo
- Can be pre-configured with `anchorType` and `anchorId` props
- Validates all inputs before submission

---

### 5. Quick Add (`TodoQuickAdd`)

**Location:** `src/components/todos/todo-quick-add.tsx`

**Purpose:** Inline input for fast todo creation

**Features:**
- Single-line input
- Optional due date (can default to today)
- Supports anchoring (via props)
- Minimal UI for quick entry

---

### 6. Project Todos Section (`ProjectTodosSection`)

**Location:** `src/components/todos/project-todos-section.tsx`

**Purpose:** Shows todos anchored to a specific project

**Features:**
- Displays on project detail pages
- "Show all" toggle (shows todos assigned to all users vs. just current user)
- Quick-add input
- Open todos list
- Collapsible completed todos
- "+" button to create new todo (pre-anchored to project)

---

### 7. Task Todos Section (`TaskTodosSection`)

**Location:** `src/components/todos/task-todos-section.tsx`

**Purpose:** Shows todos anchored to a specific task

**Features:**
- Displays in task detail page sidebar
- Similar to ProjectTodosSection but for tasks
- Todos are pre-anchored to the task

---

## User Flows

### Creating a Todo

1. **From Dashboard:**
   - Click "+" button on "To-do list" card
   - Fill in dialog → Create
   - Todo appears immediately (optimistic update)

2. **From Todos Page:**
   - Click "New To-do" button OR
   - Use quick-add input at top
   - Dialog opens → Fill in → Create

3. **From Project Page:**
   - Click "+" in Project Todos section
   - Project is pre-selected
   - Fill in → Create
   - Todo is automatically linked to project

4. **From Task Page:**
   - Click "+" in Task Todos section
   - Task is pre-selected
   - Fill in → Create
   - Todo is automatically linked to task

---

### Completing a Todo

1. **Checkbox Toggle:**
   - Click checkbox on any todo item
   - Status changes: OPEN → DONE (or vice versa)
   - UI updates immediately
   - Cache invalidated and refetched

2. **Visual Feedback:**
   - Completed todos show with:
     - Strikethrough text
     - Reduced opacity (60%)
     - Checked checkbox (green)

---

### Assigning Todos

1. **During Creation:**
   - Open create dialog
   - Select "Assign to" dropdown
   - Choose workspace member (or leave as "Assign to me")
   - Create todo

2. **During Edit:**
   - Click on todo to open edit dialog
   - Change "Assign to" selection
   - Save changes

3. **Validation:**
   - Only workspace members can be assigned
   - API validates assignee membership
   - Defaults to creator if not specified

---

### Filtering & Viewing

1. **Main Todos Page Views:**
   - **Today**: See what's due today or overdue
   - **Inbox**: See todos without due dates
   - **Upcoming**: See future todos

2. **Dashboard Filter:**
   - **Today**: Today's todos
   - **This week**: Week view (Monday-Sunday)
   - **All**: All open todos

3. **Project/Task Context:**
   - Todos automatically filtered by anchor
   - "Show all" toggle to see todos assigned to other users

---

## Data Flow & Caching

### React Query Integration

**Query Keys:**
- `['todos', view]` - Main todos page views
- `['todos', 'dashboard', filterView]` - Dashboard card
- `['todos', 'project', projectId]` - Project todos
- `['todos', 'task', taskId]` - Task todos
- `['todos', 'completed']` - Completed todos

**Optimistic Updates:**
- When creating a todo, it's immediately added to all relevant query caches
- Cache is then invalidated and refetched for consistency
- No page refresh needed - todos appear instantly

**Cache Invalidation:**
- Creating a todo → Invalidates all `['todos']` queries
- Updating a todo → Invalidates relevant queries
- Deleting a todo → Invalidates relevant queries

---

## Permissions & Security

### Who Can Do What

**View Todos:**
- ✅ Workspace members (VIEWER, MEMBER, ADMIN, OWNER)
- ❌ Non-members

**Create Todos:**
- ✅ Workspace members (MEMBER, ADMIN, OWNER)
- ❌ VIEWER role cannot create

**Modify Todos:**
- ✅ Creator
- ✅ Assignee
- ✅ Workspace OWNER/ADMIN
- ❌ Other members

**Delete Todos:**
- ✅ Creator
- ✅ Assignee
- ✅ Workspace OWNER/ADMIN
- ❌ Other members

**Assignment:**
- Can only assign to workspace members
- API validates membership before assignment

---

## Navigation & Access Points

1. **Main Navigation:**
   - "To-dos" item in top navigation → `/todos`

2. **Dashboard:**
   - "To-do list" card title → `/todos`
   - Card shows preview of todos

3. **Sidebar (WikiLayout):**
   - "TO-DOS" section between "PROJECTS" and "RECENT PAGES"
   - "To-do list" link → `/todos`

4. **Project Pages:**
   - Project Todos section at bottom of page
   - Shows todos linked to that project

5. **Task Pages:**
   - Task Todos section in sidebar
   - Shows todos linked to that task

---

## Technical Details

### Date Handling
- Due dates stored as `DateTime` in database
- Client uses `date-fns` for formatting
- Smart date labels: "Today", "Tomorrow", "3d overdue", etc.

### Priority System
- Three levels: LOW, MEDIUM, HIGH
- Color-coded badges:
  - HIGH: Red
  - MEDIUM: Amber
  - LOW: Blue

### Anchoring System
- Todos can be linked to Projects, Tasks, or Pages
- Anchored todos appear in context-specific sections
- Can be created with anchor pre-set or linked later
- Anchoring is optional (default: NONE)

### Workspace Scoping
- All todos are scoped to a workspace
- Prisma middleware enforces workspace isolation
- API validates workspace membership for all operations

---

## Summary

The Todo system provides a lightweight, flexible task management solution that:
- ✅ Supports user assignment
- ✅ Links to Projects, Tasks, or Pages (optional)
- ✅ Multiple views (Today, Inbox, Upcoming)
- ✅ Priority levels
- ✅ Due dates with smart formatting
- ✅ Real-time updates via React Query
- ✅ Contextual creation from projects/tasks
- ✅ Permission-based access control
- ✅ Optimistic UI updates for instant feedback

The system is designed to be simple yet powerful, replacing the old "Tasks" system while providing better organization and team collaboration features.

