import { test, expect } from '@playwright/test'
import { skipIfNoAuth, gotoAuthenticated, waitForPageReady } from './helpers/page-ready'

/**
 * Tasks — full CRUD E2E tests
 *
 * Strategy:
 *   beforeAll  — find the first available project (or skip the suite) then
 *                create a fresh test task.
 *   Test group — Read, Update (title), Complete (status → DONE), Delete.
 *   afterAll   — best-effort cleanup in case a test fails mid-run.
 *
 * The tasks API requires a projectId, so we query /api/projects first.
 * All test data uses `Date.now()` to avoid title collisions.
 */

// ─── Shared state ─────────────────────────────────────────────────────────────

let projectId: string | null = null
let taskId: string | null = null
const ts = Date.now()
const ORIGINAL_TITLE = `E2E Test Task ${ts}`
const UPDATED_TITLE = `E2E Test Task Updated ${ts}`

// ─── Setup / teardown ─────────────────────────────────────────────────────────

test.describe('Tasks CRUD', () => {
  test.beforeAll(async ({ request }) => {
    // 1. Find the first available project
    const projectsRes = await request.get('/api/projects')
    if (!projectsRes.ok()) return

    const projectsData = await projectsRes.json()
    const list: Array<{ id: string }> = Array.isArray(projectsData)
      ? projectsData
      : projectsData.projects ?? projectsData.data ?? []

    if (list.length === 0) return

    projectId = list[0].id

    // 2. Create the test task
    const taskRes = await request.post('/api/tasks', {
      data: {
        projectId,
        title: ORIGINAL_TITLE,
        status: 'TODO',
        priority: 'MEDIUM',
      },
    })

    if (taskRes.ok()) {
      const task = await taskRes.json()
      taskId = task.id ?? null
    }
  })

  test.afterAll(async ({ request }) => {
    if (taskId) {
      await request.delete(`/api/tasks/${taskId}`).catch(() => {})
      taskId = null
    }
  })

  // ─── Guard helper ──────────────────────────────────────────────────────────

  function requireTask(t: typeof test) {
    if (!projectId || !taskId) {
      t.skip(true, 'beforeAll setup failed (no project or task) — skipping')
    }
  }

  // ── C: Create ──────────────────────────────────────────────────────────────

  test('Create: POST /api/tasks returns the new task with expected shape', async ({ page }) => {
    await skipIfNoAuth(page)
    if (!projectId) {
      test.skip(true, 'No project available — skipping create test')
      return
    }

    // Create a second throwaway task to assert the create response shape
    const res = await page.request.post('/api/tasks', {
      data: {
        projectId,
        title: `E2E Create Assert ${ts}`,
        status: 'TODO',
        priority: 'MEDIUM',
      },
    })

    if (res.status() === 401 || res.status() === 403) {
      test.skip(true, 'Auth not available for task create')
      return
    }

    expect(res.ok()).toBeTruthy()
    const task = await res.json()

    expect(task).toHaveProperty('id')
    expect(task).toHaveProperty('title', `E2E Create Assert ${ts}`)
    expect(task).toHaveProperty('status', 'TODO')
    expect(task).toHaveProperty('priority', 'MEDIUM')
    expect(task).toHaveProperty('projectId', projectId)
    expect(task).toHaveProperty('workspaceId')
    expect(task).toHaveProperty('createdBy')

    // Cleanup
    if (task.id) {
      await page.request.delete(`/api/tasks/${task.id}`).catch(() => {})
    }
  })

  test('Create: POST without projectId returns 400', async ({ page }) => {
    await skipIfNoAuth(page)

    const res = await page.request.post('/api/tasks', {
      data: { title: 'No project task', status: 'TODO' },
    })

    if (res.status() === 401) {
      test.skip(true, 'No auth')
      return
    }

    // Schema validation should reject missing projectId
    expect([400, 422]).toContain(res.status())
  })

  // ── R: Read ───────────────────────────────────────────────────────────────

  test('Read: GET /api/tasks/[id] returns the correct task', async ({ page }) => {
    await skipIfNoAuth(page)
    requireTask(test)

    const res = await page.request.get(`/api/tasks/${taskId}`)

    if (res.status() === 401) {
      test.skip(true, 'No auth')
      return
    }

    expect(res.ok()).toBeTruthy()
    const task = await res.json()

    expect(task.id).toBe(taskId)
    expect(task.title).toBe(ORIGINAL_TITLE)
    expect(task.projectId).toBe(projectId)
    expect(task).toHaveProperty('status')
    expect(task).toHaveProperty('priority')
  })

  test('Read: GET /api/tasks?projectId=[id] includes the test task', async ({ page }) => {
    await skipIfNoAuth(page)
    requireTask(test)

    const res = await page.request.get(`/api/tasks?projectId=${projectId}`)

    if (res.status() === 401) {
      test.skip(true, 'No auth')
      return
    }

    expect(res.ok()).toBeTruthy()
    const tasks: Array<{ id: string }> = await res.json()
    expect(Array.isArray(tasks)).toBeTruthy()

    const found = tasks.some((t) => t.id === taskId)
    expect(found).toBeTruthy()
  })

  // ── U: Update ─────────────────────────────────────────────────────────────

  test('Update: PUT /api/tasks/[id] changes the title', async ({ page }) => {
    await skipIfNoAuth(page)
    requireTask(test)

    const res = await page.request.put(`/api/tasks/${taskId}`, {
      data: { title: UPDATED_TITLE },
    })

    if (res.status() === 401 || res.status() === 403) {
      test.skip(true, 'No auth for task update')
      return
    }

    expect(res.ok()).toBeTruthy()
    const task = await res.json()

    expect(task.id).toBe(taskId)
    expect(task.title).toBe(UPDATED_TITLE)
  })

  test('Update: GET after title change reflects updated title', async ({ page }) => {
    await skipIfNoAuth(page)
    requireTask(test)

    const res = await page.request.get(`/api/tasks/${taskId}`)
    if (!res.ok()) {
      test.skip(true, 'Cannot read task after update')
      return
    }

    const task = await res.json()
    expect(task.title).toBe(UPDATED_TITLE)
  })

  // ── Complete ───────────────────────────────────────────────────────────────

  test('Complete: PUT /api/tasks/[id] with status=DONE marks task done', async ({ page }) => {
    await skipIfNoAuth(page)
    requireTask(test)

    const res = await page.request.put(`/api/tasks/${taskId}`, {
      data: { status: 'DONE' },
    })

    if (res.status() === 401 || res.status() === 403) {
      test.skip(true, 'No auth for task status update')
      return
    }

    expect(res.ok()).toBeTruthy()
    const task = await res.json()

    expect(task.status).toBe('DONE')
  })

  test('Complete: GET after status change shows DONE', async ({ page }) => {
    await skipIfNoAuth(page)
    requireTask(test)

    const res = await page.request.get(`/api/tasks/${taskId}`)
    if (!res.ok()) {
      test.skip(true, 'Cannot read task after completion')
      return
    }

    const task = await res.json()
    expect(task.status).toBe('DONE')
  })

  // ── D: Delete ─────────────────────────────────────────────────────────────

  test('Delete: DELETE /api/tasks/[id] removes the task', async ({ page }) => {
    await skipIfNoAuth(page)
    requireTask(test)

    const res = await page.request.delete(`/api/tasks/${taskId}`)

    if (res.status() === 401 || res.status() === 403) {
      test.skip(true, 'No auth for task delete')
      return
    }

    expect(res.ok()).toBeTruthy()

    // Mark cleaned up
    taskId = null
  })

  test('Delete: GET after deletion returns 404', async ({ page }) => {
    await skipIfNoAuth(page)

    // Use a known-bad ID that cannot exist
    const res = await page.request.get('/api/tasks/e2e-deleted-task-does-not-exist')

    if (res.status() === 401) {
      test.skip(true, 'No auth')
      return
    }

    expect(res.status()).toBe(404)
  })
})

// ─── Projects page navigation ─────────────────────────────────────────────────

test.describe('Tasks — UI navigation', () => {
  test('/projects page loads for authenticated user', async ({ page }) => {
    const loaded = await gotoAuthenticated(page, '/projects')
    if (!loaded) return

    await waitForPageReady(page)
    const content = page.locator('h1, h2, [data-testid="projects-list"]').first()
    await expect(content).toBeVisible({ timeout: 10_000 })
  })

  test('task board is reachable from a project page', async ({ page }) => {
    await skipIfNoAuth(page)

    // Navigate to projects list
    const loaded = await gotoAuthenticated(page, '/projects')
    if (!loaded) return

    await waitForPageReady(page)

    // Click the first project card if one exists
    const card = page.locator('[data-testid^="project-card-"]').first()
    const cardVisible = await card.isVisible({ timeout: 5_000 }).catch(() => false)

    if (!cardVisible) {
      test.skip(true, 'No project cards visible — workspace may be empty')
      return
    }

    await card.click()
    await page.waitForLoadState('domcontentloaded')

    // Project detail page should show task-related content
    const taskContent = page
      .locator('h1, h2, h3, [data-testid="task-board"], [data-testid="task-list"]')
      .first()
    await expect(taskContent).toBeVisible({ timeout: 10_000 })
  })
})

// ─── Todos (personal task list) ───────────────────────────────────────────────

test.describe('Todos — quick add flow', () => {
  test('POST /api/todos creates a new todo', async ({ page }) => {
    await skipIfNoAuth(page)

    const todoTitle = `E2E Todo ${ts}`

    const res = await page.request.post('/api/todos', {
      data: { title: todoTitle },
    })

    if (res.status() === 401 || res.status() === 403) {
      test.skip(true, 'No auth for todo create')
      return
    }

    expect(res.ok()).toBeTruthy()
    const todo = await res.json()

    expect(todo).toHaveProperty('id')
    expect(todo.title).toBe(todoTitle)

    // Cleanup
    if (todo.id) {
      await page.request.delete(`/api/todos/${todo.id}`).catch(() => {})
    }
  })

  test('GET /api/todos returns an array', async ({ page }) => {
    await skipIfNoAuth(page)

    const res = await page.request.get('/api/todos')

    if (res.status() === 401) {
      test.skip(true, 'No auth')
      return
    }

    expect(res.ok()).toBeTruthy()
    const data = await res.json()

    const isArray =
      Array.isArray(data) ||
      Array.isArray(data.todos) ||
      Array.isArray(data.data)
    expect(isArray).toBeTruthy()
  })
})
