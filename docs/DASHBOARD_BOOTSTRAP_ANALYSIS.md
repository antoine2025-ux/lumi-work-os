# Dashboard Bootstrap Analysis

## Initial Load Endpoints

### Home Page (`/home`)

**Component:** `src/app/home/page.tsx`

**Endpoints called on initial render:**

1. **`/api/wiki/pages?workspaceId={id}`** (Line 118)
   - React Query: `queryKey: ['wiki-pages', currentWorkspace?.id]`
   - Purpose: Fetch recent wiki pages for dashboard
   - Enabled: `!!currentWorkspace`
   - Stale time: 2 minutes

2. **`/api/projects?workspaceId={id}`** (Line 138)
   - React Query: `queryKey: ['projects', currentWorkspace?.id]`
   - Purpose: Fetch recent projects for dashboard
   - Enabled: `!!currentWorkspace`
   - Stale time: 2 minutes
   - Client-side: Sorts and slices to top 6

3. **`/api/todos?view=today`** (Line 162)
   - React Query: `queryKey: ['todos', 'today', currentWorkspace?.id]`
   - Purpose: Fetch today's todos for progress gauge
   - Enabled: `!!currentWorkspace`
   - Stale time: 30 seconds

**Execution pattern:**
- All three queries run in parallel (React Query handles this)
- Blocking: Each query blocks component render until data is available
- Sequential dependency: All queries wait for `currentWorkspace` to be available

**Additional endpoints (not on initial load):**
- `/api/auth/user-status` - Called by workspace context provider (not directly in HomePage)

---

### Projects Dashboard (`/w/[workspaceSlug]/projects`)

**Component:** `src/app/(dashboard)/w/[workspaceSlug]/projects/page.tsx`

**Endpoints called on initial render:**

1. **`/api/projects?workspaceId={id}`** (Line 181)
   - useEffect hook (Line 174)
   - Purpose: Fetch all projects for workspace
   - Sequential: Blocks until response received

2. **`/api/projects/{projectId}/epics`** (Line 193)
   - For each project (sequential waterfall)
   - Purpose: Fetch epics for all projects
   - Execution: `Promise.all()` after projects loaded
   - Problem: Creates N requests (one per project)

3. **`/api/projects/{projectId}/tasks`** (Line 206)
   - For each project (sequential waterfall)
   - Purpose: Fetch tasks for all projects
   - Execution: `Promise.all()` after projects loaded
   - Problem: Creates N requests (one per project)

**Execution pattern:**
- Sequential waterfall:
  1. Wait for projects
  2. Then fetch epics for all projects (parallel)
  3. Then fetch tasks for all projects (parallel)
- If 5 projects exist: 1 + 5 + 5 = 11 API calls

**Problem:**
- Epics and tasks are fetched for ALL projects on initial load
- These are only needed when viewing a specific project detail page
- Should be lazy-loaded on demand

---

### Loading Initializer (Prefetch)

**Component:** `src/components/auth/loading-initializer.tsx`

**Endpoints prefetched (background, non-blocking):**

1. **`/api/projects?workspaceId={id}`** (Line 35)
2. **`/api/wiki/pages?workspaceId={id}`** (Line 40)
3. **`/api/calendar/events`** (Line 45)

**Execution:**
- Runs in parallel via `Promise.allSettled()`
- Non-blocking (doesn't wait for completion)
- Timeout: 4 seconds

---

## Summary

### Home Page Initial Load
- **3 API calls** (parallel via React Query)
- All wait for workspace context
- Total time: ~600-1200ms (sum of slowest request)

### Projects Dashboard Initial Load
- **1 + N + N API calls** (where N = number of projects)
- Sequential waterfall pattern
- Total time: ~2000-4000ms (for 5 projects: 11 calls)

### Combined Initial Load (if both pages visited)
- **Up to 14+ API calls**
- Each call: auth (30-60ms) + access (15-30ms) + DB (150-400ms) = 200-500ms
- Total: 2.8-7 seconds

---

## Optimization Opportunity

**Bootstrap endpoint should include:**
1. Projects (minimal fields, limit 10)
2. Wiki pages (minimal fields, limit 4)
3. Page counts (for sidebar)
4. Today's todos (for progress gauge)

**Should NOT include:**
- Epics (only needed on project detail page)
- Tasks (only needed on project detail page)
- Full project data (only needed on project detail page)

**Expected reduction:**
- Home page: 3 calls → 1 call
- Projects dashboard: 11 calls → 1 call
- Total: 14 calls → 2 calls (if both pages visited)

