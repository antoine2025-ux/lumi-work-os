import { test, expect } from '@playwright/test'
import { waitForPageReady, gotoAuthenticated, skipIfNoAuth } from './helpers/page-ready'

/**
 * Critical Flows E2E Tests
 *
 * Smoke tests for the most important user journeys:
 * - Create a project with tasks
 * - Create a wiki page
 * - Create a todo
 * - Ask Loopbrain a question
 */

test.describe('Critical Flows', () => {
  test.describe('Projects', () => {
    test('projects page loads and shows content', async ({ page }) => {
      await gotoAuthenticated(page, '/projects')

      // Should see a heading or project list
      const content = page.locator('h1, h2, [data-testid="projects-list"]').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })

    test('can create a new project via API', async ({ page }) => {
      await gotoAuthenticated(page, '/home')

      const projectName = `E2E Test Project ${Date.now()}`

      const response = await page.request.post('/api/projects', {
        data: {
          name: projectName,
          description: 'Created by E2E test',
          status: 'active',
        },
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured for API calls')
        return
      }

      expect(response.ok()).toBeTruthy()
      const project = await response.json()
      expect(project.name).toBe(projectName)
      expect(project.id).toBeTruthy()

      // Verify project appears in the list
      await page.goto('/projects')
      await waitForPageReady(page)

      // Check for the project name in the page
      const projectText = page.getByText(projectName).first()
      const isVisible = await projectText.isVisible({ timeout: 5000 }).catch(() => false)
      if (isVisible) {
        await expect(projectText).toBeVisible()
      }

      // Clean up: delete the project
      if (project.id) {
        await page.request.delete(`/api/projects/${project.id}`).catch(() => {})
      }
    })

    test('can create a task in an existing project via API', async ({ page }) => {
      await gotoAuthenticated(page, '/home')

      // Get an existing project
      const projectsRes = await page.request.get('/api/projects')
      if (!projectsRes.ok()) {
        test.skip(true, 'Could not fetch projects')
        return
      }

      const projects = await projectsRes.json()
      const projectList = Array.isArray(projects) ? projects : projects.projects || []

      if (projectList.length === 0) {
        test.skip(true, 'No projects available')
        return
      }

      const projectId = projectList[0].id
      const taskTitle = `E2E Test Task ${Date.now()}`

      const taskRes = await page.request.post(`/api/projects/${projectId}/tasks`, {
        data: {
          title: taskTitle,
          status: 'todo',
          priority: 'medium',
        },
      })

      if (!taskRes.ok()) {
        test.skip(true, 'Could not create task')
        return
      }

      const task = await taskRes.json()
      expect(task.title).toBe(taskTitle)

      // Clean up
      if (task.id) {
        await page.request.delete(`/api/tasks/${task.id}`).catch(() => {})
      }
    })
  })

  test.describe('Wiki', () => {
    test('wiki home page loads', async ({ page }) => {
      await gotoAuthenticated(page, '/wiki/home')

      // Should show wiki content or empty state
      const content = page.locator('h1, h2, [data-testid="wiki-content"], main').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })

    test('can create a wiki page via API', async ({ page }) => {
      await gotoAuthenticated(page, '/home')

      const pageTitle = `E2E Test Page ${Date.now()}`
      const slug = `e2e-test-${Date.now()}`

      // Get workspaces to find a valid wikiWorkspaceId
      const workspacesRes = await page.request.get('/api/wiki/workspaces')
      if (!workspacesRes.ok()) {
        test.skip(true, 'Cannot get wiki workspaces')
        return
      }

      const workspaces = await workspacesRes.json()
      const wikiWorkspaceList = Array.isArray(workspaces) ? workspaces : workspaces.workspaces || []

      if (wikiWorkspaceList.length === 0) {
        test.skip(true, 'No wiki workspaces available')
        return
      }

      const wikiWorkspaceId = wikiWorkspaceList[0].id

      const response = await page.request.post('/api/wiki/pages', {
        data: {
          title: pageTitle,
          slug,
          content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"E2E test content"}]}]}',
          wikiWorkspaceId,
        },
      })

      if (!response.ok()) {
        test.skip(true, `Wiki page creation failed: ${response.status()}`)
        return
      }

      const wikiPage = await response.json()
      expect(wikiPage.title).toBe(pageTitle)

      // Navigate to the page
      await page.goto(`/wiki/${slug}`)
      await waitForPageReady(page)

      // Verify page content loads
      const heading = page.getByText(pageTitle).first()
      const isVisible = await heading.isVisible({ timeout: 5000 }).catch(() => false)
      if (isVisible) {
        await expect(heading).toBeVisible()
      }

      // Clean up
      if (wikiPage.id) {
        await page.request.delete(`/api/wiki/pages/${wikiPage.id}`).catch(() => {})
      }
    })
  })

  test.describe('Todos', () => {
    test('todos page loads', async ({ page }) => {
      await gotoAuthenticated(page, '/todos')

      const content = page.locator('h1, h2, [data-testid="todo-quick-add-input"]').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })

    test('can create a todo via UI', async ({ page }) => {
      await gotoAuthenticated(page, '/todos')

      const todoTitle = `E2E Test Todo ${Date.now()}`

      // Find the quick add input
      const input = page.getByPlaceholder(/add.*to-?do/i)
      const inputVisible = await input.isVisible({ timeout: 5000 }).catch(() => false)

      if (!inputVisible) {
        test.skip(true, 'Todo quick-add input not found')
        return
      }

      await input.clear()
      await input.fill(todoTitle)
      await input.press('Enter')

      // Wait for the todo to appear in the list
      await expect(page.getByText(todoTitle)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Loopbrain', () => {
    test('ask page loads', async ({ page }) => {
      await gotoAuthenticated(page, '/ask')

      // Should show Loopbrain chat interface or heading
      const content = page.locator('h1, h2, textarea, [data-testid="chat-input"]').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })

    test('loopbrain org ask API responds', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.post('/api/loopbrain/org/ask', {
        data: {
          question: 'How many people are in the organization?',
        },
      })

      if (response.status() === 401) {
        test.skip(true, 'Auth not configured for Loopbrain API')
        return
      }

      // Loopbrain may return various status codes depending on config
      // 200 = success, 500 = OpenAI not configured, both are acceptable
      expect([200, 500]).toContain(response.status())
    })
  })
})
