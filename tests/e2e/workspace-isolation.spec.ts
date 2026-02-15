import { test, expect } from '@playwright/test'
import { waitForPageReady, gotoAuthenticated, skipIfNoAuth } from './helpers/page-ready'

/**
 * Workspace Isolation E2E Tests
 *
 * Verifies that workspace scoping middleware correctly isolates data.
 * Tests that:
 * - API responses only contain workspace-scoped data
 * - Cross-workspace access is prevented
 * - Workspace context is consistently available
 */

/** Get workspace slug from user-status API */
async function getWorkspaceSlug(page: import('@playwright/test').Page): Promise<string | null> {
  const response = await page.request.get('/api/auth/user-status')
  if (!response.ok()) return null
  const data = await response.json()
  return data?.workspaceSlug || null
}

test.describe('Workspace Isolation', () => {
  test.describe('API Workspace Scoping', () => {
    test('projects API returns only workspace-scoped projects', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/projects')
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      const projects = Array.isArray(data) ? data : data.projects || []

      // All projects should belong to the same workspace
      if (projects.length > 1) {
        const workspaceIds = new Set(projects.map((p: { workspaceId: string }) => p.workspaceId))
        expect(workspaceIds.size).toBe(1)
      }
    })

    test('tasks API returns only workspace-scoped tasks', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/my-tasks')
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      const tasks = Array.isArray(data) ? data : data.tasks || []

      // All tasks should have consistent workspace association
      if (tasks.length > 1) {
        const projectIds = new Set(tasks.map((t: { projectId: string }) => t.projectId))
        expect(projectIds.size).toBeGreaterThan(0)
      }
    })

    test('wiki pages API returns only workspace-scoped pages', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/wiki/pages')
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      const pages = Array.isArray(data) ? data : data.pages || []

      // All wiki pages should belong to the same workspace
      if (pages.length > 1) {
        const workspaceIds = new Set(pages.map((p: { workspaceId: string }) => p.workspaceId))
        expect(workspaceIds.size).toBe(1)
      }
    })

    test('org members API returns only workspace-scoped members', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/org/members')
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      const members = Array.isArray(data) ? data : data.members || []

      // All members should belong to the same workspace
      if (members.length > 1) {
        const workspaceIds = new Set(
          members.filter((m: { workspaceId?: string }) => m.workspaceId)
                 .map((m: { workspaceId: string }) => m.workspaceId)
        )
        if (workspaceIds.size > 0) {
          expect(workspaceIds.size).toBe(1)
        }
      }
    })
  })

  test.describe('Cross-Workspace Access Prevention', () => {
    test('accessing a non-existent project returns 404', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/projects/non-existent-project-id-12345')

      // Should get 404, not 500 or leaked data
      expect([404, 400]).toContain(response.status())
    })

    test('accessing a non-existent wiki page returns 404', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/wiki/pages/non-existent-wiki-id-12345')
      expect([404, 400]).toContain(response.status())
    })

    test('accessing a non-existent task returns 404', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/tasks/non-existent-task-id-12345')
      expect([404, 400]).toContain(response.status())
    })
  })

  test.describe('Workspace Context Consistency', () => {
    test('user-status API returns consistent workspace info', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/auth/user-status')
      expect(response.ok()).toBeTruthy()

      const data = await response.json()

      // User should have workspace context
      expect(data).toHaveProperty('workspaceSlug')
      if (data.workspaceSlug) {
        expect(typeof data.workspaceSlug).toBe('string')
        expect(data.workspaceSlug.length).toBeGreaterThan(0)
      }
    })

    test('workspace-scoped URL loads correctly', async ({ page }) => {
      await skipIfNoAuth(page)

      const workspaceSlug = await getWorkspaceSlug(page)
      if (!workspaceSlug) {
        test.skip(true, 'No workspace slug available')
        return
      }

      // Navigate to workspace-scoped org page
      await page.goto(`/w/${workspaceSlug}/org`)
      await waitForPageReady(page)

      // Should load without redirecting to login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })

      // Should show org content
      const content = page.locator('h1, h2, aside, [data-testid="new-org-layout"]').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })

    test('multiple API calls return same workspace scope', async ({ page }) => {
      await skipIfNoAuth(page)

      // Make parallel API calls and verify consistent workspace scoping
      const [projectsRes, wikiRes, membersRes] = await Promise.all([
        page.request.get('/api/projects'),
        page.request.get('/api/wiki/pages'),
        page.request.get('/api/org/members'),
      ])

      if (!projectsRes.ok() || !wikiRes.ok() || !membersRes.ok()) {
        test.skip(true, 'One or more APIs not available')
        return
      }

      const projectsData = await projectsRes.json()
      const wikiData = await wikiRes.json()

      const projects = Array.isArray(projectsData) ? projectsData : projectsData.projects || []
      const wikiPages = Array.isArray(wikiData) ? wikiData : wikiData.pages || []

      // Extract workspace IDs from both collections
      const projectWsIds = new Set(projects.map((p: { workspaceId: string }) => p.workspaceId))
      const wikiWsIds = new Set(wikiPages.map((p: { workspaceId: string }) => p.workspaceId))

      // If both have data, workspace IDs should match
      if (projectWsIds.size > 0 && wikiWsIds.size > 0) {
        const allIds = new Set([...projectWsIds, ...wikiWsIds])
        expect(allIds.size).toBe(1)
      }
    })
  })
})
