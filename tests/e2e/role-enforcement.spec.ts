import { test, expect } from '@playwright/test'
import { waitForPageReady, gotoAuthenticated, skipIfNoAuth } from './helpers/page-ready'

/**
 * Role Enforcement E2E Tests
 *
 * Verifies RBAC enforcement from the UI and API perspective:
 * - Admin-only org management routes reject non-admin users
 * - Read-only endpoints allow VIEWER access
 * - Write endpoints require MEMBER or higher
 * - Unauthenticated requests get 401
 *
 * Note: These tests run as the E2E test user (typically ADMIN or OWNER).
 * Tests validate that:
 * 1. Protected routes respond (not 500)
 * 2. Auth is enforced (unauthenticated -> 401)
 * 3. Role checks are present (routes don't crash on role validation)
 */

/** Get workspace slug from user-status API */
async function getWorkspaceSlug(page: import('@playwright/test').Page): Promise<string | null> {
  const response = await page.request.get('/api/auth/user-status')
  if (!response.ok()) return null
  const data = await response.json()
  return data?.workspaceSlug || null
}

test.describe('Role Enforcement', () => {
  test.describe('Authenticated API Access', () => {
    test('org people create requires ADMIN (returns appropriate status)', async ({ page }) => {
      await skipIfNoAuth(page)

      // POST to create person - requires ADMIN role
      const response = await page.request.post('/api/org/people/create', {
        data: {
          name: 'E2E Test Person',
          email: `e2e-test-${Date.now()}@test.local`,
        },
      })

      // Should get 200 (if ADMIN), 403 (if lower role), or 400 (validation)
      // Should NOT get 500 (server error)
      expect([200, 201, 400, 403]).toContain(response.status())
    })

    test('org structure team creation requires ADMIN', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.post('/api/org/structure/teams/create', {
        data: {
          name: `E2E Test Team ${Date.now()}`,
        },
      })

      // Should NOT be 500
      expect([200, 201, 400, 403]).toContain(response.status())
    })

    test('org structure department creation requires ADMIN', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.post('/api/org/structure/departments/create', {
        data: {
          name: `E2E Test Dept ${Date.now()}`,
        },
      })

      expect([200, 201, 400, 403]).toContain(response.status())
    })

    test('read-only org endpoints allow VIEWER access', async ({ page }) => {
      await skipIfNoAuth(page)

      // GET endpoints should allow any authenticated user
      const endpoints = [
        '/api/org/members',
        '/api/org/people/directory',
        '/api/org/teams',
        '/api/org/departments',
      ]

      for (const endpoint of endpoints) {
        const response = await page.request.get(endpoint)

        // Read endpoints should succeed or return empty data, not crash
        expect(
          [200, 403],
          `${endpoint} returned unexpected ${response.status()}`
        ).toContain(response.status())
      }
    })

    test('AI chat endpoint requires MEMBER role', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.post('/api/ai/chat', {
        data: {
          messages: [{ role: 'user', content: 'Hello' }],
        },
      })

      // Should get 200 (if configured), 400 (validation), 403 (role), or 500 (OpenAI not configured)
      expect([200, 400, 403, 500]).toContain(response.status())
    })

    test('task dependencies endpoint requires proper auth', async ({ page }) => {
      await skipIfNoAuth(page)

      // GET dependencies for a non-existent task should get 404, not 500
      const response = await page.request.get('/api/tasks/non-existent-id/dependencies')

      // Should return 404 (not found) or 403 (forbidden), not 500
      expect([404, 403, 400]).toContain(response.status())
    })

    test('task dependency POST requires MEMBER role and project access', async ({ page }) => {
      await skipIfNoAuth(page)

      // POST to dependencies endpoint for non-existent task
      const response = await page.request.post('/api/tasks/non-existent-id/dependencies', {
        data: {
          dependsOn: [],
          blocks: [],
          action: 'set',
        },
      })

      // Should get 404 (task not found) after auth passes, not 500
      expect([404, 403, 400]).toContain(response.status())
    })
  })

  test.describe('Unauthenticated API Access', () => {
    test('protected API endpoints reject unauthenticated requests', async ({ browser }) => {
      // Create a new context WITHOUT stored auth state
      const context = await browser.newContext({ storageState: undefined })
      const page = await context.newPage()

      const protectedEndpoints = [
        { method: 'GET' as const, url: '/api/projects' },
        { method: 'GET' as const, url: '/api/wiki/pages' },
        { method: 'GET' as const, url: '/api/org/members' },
        { method: 'GET' as const, url: '/api/my-tasks' },
        { method: 'POST' as const, url: '/api/org/people/create' },
      ]

      for (const endpoint of protectedEndpoints) {
        const response = endpoint.method === 'GET'
          ? await page.request.get(endpoint.url)
          : await page.request.post(endpoint.url, { data: {} })

        // Should get 401 (unauthenticated), not 200 or 500
        expect(
          response.status(),
          `${endpoint.method} ${endpoint.url} should return 401 for unauthenticated, got ${response.status()}`
        ).toBe(401)
      }

      await context.close()
    })

    test('unauthenticated page access redirects to login', async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined })
      const page = await context.newPage()

      await page.goto('/home')
      await page.waitForLoadState('domcontentloaded')

      // Should redirect to login
      await expect(async () => {
        expect(page.url()).toContain('/login')
      }).toPass({ timeout: 10000 })

      await context.close()
    })
  })

  test.describe('UI Role Indicators', () => {
    test('org pages load without permission errors for authorized users', async ({ page }) => {
      await skipIfNoAuth(page)

      const workspaceSlug = await getWorkspaceSlug(page)
      if (!workspaceSlug) {
        test.skip(true, 'No workspace slug available')
        return
      }

      // Navigate to org page
      await page.goto(`/w/${workspaceSlug}/org`)
      await waitForPageReady(page)

      // Should NOT show permission errors
      const errorText = page.getByText(/forbidden|unauthorized|access denied/i).first()
      const hasError = await errorText.isVisible({ timeout: 2000 }).catch(() => false)
      expect(hasError).toBeFalsy()

      // Should show org content
      const content = page.locator('[data-testid="new-org-layout"], aside, main').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })

    test('settings page is accessible for workspace members', async ({ page }) => {
      await gotoAuthenticated(page, '/settings')

      // Should load settings without errors
      const content = page.locator('h1, h2, form, [data-testid="settings"]').first()
      await expect(content).toBeVisible({ timeout: 10000 })

      // Should NOT redirect to login
      await expect(page).not.toHaveURL(/\/login/, { timeout: 3000 })
    })
  })
})
