# Dashboard Bootstrap Crash Fix

## Problem

After the dashboard bootstrap refactor, production `/projects/[projectId]` was crashing with:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'tasks')
```

## Root Cause

The crash occurred because:
1. **Bootstrap endpoint doesn't include tasks** - The `/api/dashboard/bootstrap` endpoint intentionally excludes tasks to reduce payload size
2. **Project interface expected tasks** - The `Project` interface in multiple components had `tasks` as a required field
3. **Unsafe property access** - Code accessed `project.tasks` without checking if it exists

## Which Object Was Undefined

The `project.tasks` property was `undefined` when:
- Projects were loaded from the bootstrap endpoint (which doesn't include tasks)
- The project detail page tried to access `project.tasks.filter(...)` before tasks were loaded
- Components like GanttChart accessed `project.tasks.length` without guards

## Fixes Applied

### 1. Made Tasks Optional in Interfaces

**Files changed:**
- `src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx` - Made `tasks` optional in `Project` and `Epic` interfaces
- `src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/page.tsx` - Made `tasks` optional in `Project` interface
- `src/components/projects/gantt-chart.tsx` - Made `tasks` optional in `Project` interface
- `src/components/projects/project-header.tsx` - Made `tasks` prop optional

### 2. Added Guards for Task Access

**Projects Dashboard (`projects/page.tsx`):**
- Line 393: `project.tasks ? project.tasks.filter(...) : 0`
- Line 399: `project.tasks ? project.tasks.filter(...) : 0`
- Line 622: `epic.tasks ? epic.tasks.filter(...) : 0` with `epic._count?.tasks || 0`

**Project Detail (`projects/[id]/page.tsx`):**
- Line 517: `if (!project || !project.tasks) return 0` in `getTaskStatusCount`
- Line 524: `if (!project || !project._count) return` in `checkProjectCompletion`
- Line 241: Ensured `tasks` is always an array: `tasks: data.tasks || []`

**GanttChart Component:**
- Line 85: `project.tasks?.length || 0`
- Line 92: `(project.tasks || [])` for safe array access
- Line 116: Already had guard: `if (!project.tasks || project.tasks.length === 0)`

**ProjectHeader Component:**
- Line 32: Made `tasks` prop optional
- Line 65: Added guard: `if (!tasks) return 0`

### 3. Ensured Tasks Are Always Arrays

When project is loaded from API, we now ensure tasks is always an array:
```typescript
const projectWithTasks = {
  ...data,
  tasks: data.tasks || []
}
setProject(projectWithTasks)
```

## Files Changed

| File | Reason |
|------|--------|
| `src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx` | Made tasks optional in Project/Epic interfaces, added guards for task access |
| `src/app/(dashboard)/w/[workspaceSlug]/projects/[id]/page.tsx` | Made tasks optional, added guards, ensured tasks is always array |
| `src/components/projects/gantt-chart.tsx` | Made tasks optional, added guards for task access |
| `src/components/projects/project-header.tsx` | Made tasks prop optional, added guard in getTaskStatusCount |

## Verification

### Production Build Test
```bash
npm run build && npm run start:e2e
```

### E2E Test
```bash
npm run test:e2e
```

The project detail page should now:
- Load without crashing when tasks are undefined
- Display progress bars with 0 tasks when tasks are not loaded
- Load tasks from `/api/projects/[projectId]` which includes tasks
- Handle empty task arrays gracefully

## Constraints Maintained

- ✅ No heavy initial fetches reintroduced
- ✅ Bootstrap endpoint remains fast (no tasks included)
- ✅ Tasks are lazy-loaded on project detail page (via `/api/projects/[projectId]`)
- ✅ All changes are typed (no `any`)
- ✅ Minimal changes (only added optional markers and guards)

## Next Steps

1. **Monitor production** - Watch for any remaining crashes
2. **Consider lazy-loading tasks** - If project detail page is slow, consider loading tasks only when board tab is active
3. **Add E2E test** - Add Playwright test to verify project detail page loads without errors

