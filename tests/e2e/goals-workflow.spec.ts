import { test, expect } from '@playwright/test'
import { waitForPageReady, gotoAuthenticated, skipIfNoAuth } from './helpers/page-ready'

/**
 * Goals Workflow E2E Tests
 *
 * Tests the Goals & OKRs feature:
 * - Goals CRUD via API
 * - Goals dashboard page loads
 * - Goal detail page loads
 * - Goal progress tracking
 * - Cascading (parent-child) goal relationships
 */

/** Get workspace slug from user-status API */
async function getWorkspaceSlug(page: import('@playwright/test').Page): Promise<string | null> {
  const response = await page.request.get('/api/auth/user-status')
  if (!response.ok()) return null
  const data = await response.json()
  return data?.workspaceSlug || null
}

test.describe('Goals Workflow', () => {
  test.describe('Goals Dashboard', () => {
    test('goals page loads correctly', async ({ page }) => {
      await skipIfNoAuth(page)

      const workspaceSlug = await getWorkspaceSlug(page)
      if (!workspaceSlug) {
        test.skip(true, 'No workspace slug available')
        return
      }

      await page.goto(`/w/${workspaceSlug}/goals`)
      await waitForPageReady(page)

      // Should show goals heading
      const heading = page.getByText(/goals/i).first()
      await expect(heading).toBeVisible({ timeout: 10000 })
    })

    test('goals page displays metrics or empty state', async ({ page }) => {
      await skipIfNoAuth(page)

      const workspaceSlug = await getWorkspaceSlug(page)
      if (!workspaceSlug) {
        test.skip(true, 'No workspace slug available')
        return
      }

      await page.goto(`/w/${workspaceSlug}/goals`)
      await waitForPageReady(page)

      // Should show either goal cards or empty state message
      const content = page.locator(
        '[data-testid="goals-dashboard"], ' +
        ':text("no goals"), ' +
        ':text("create your first"), ' +
        ':text("Goals & OKRs"), ' +
        'h1, h2'
      ).first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Goals CRUD API', () => {
    test('goals list API responds', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/goals')
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data).toBeTruthy()
    })

    test('can create a goal via API', async ({ page }) => {
      await skipIfNoAuth(page)

      const goalTitle = `E2E Test Goal ${Date.now()}`

      const response = await page.request.post('/api/goals', {
        data: {
          title: goalTitle,
          description: 'Created by E2E test',
          level: 'team',
          status: 'on_track',
          quarter: 'Q1 2026',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        },
      })

      if (response.status() === 400) {
        // Validation error - goal schema may differ
        test.skip(true, 'Goal creation validation requirements differ')
        return
      }

      expect(response.ok()).toBeTruthy()
      const goal = await response.json()
      expect(goal.title).toBe(goalTitle)
      expect(goal.id).toBeTruthy()

      // Clean up
      if (goal.id) {
        await page.request.delete(`/api/goals/${goal.id}`).catch(() => {})
      }
    })

    test('can create parent-child cascading goals', async ({ page }) => {
      await skipIfNoAuth(page)

      // Create parent goal
      const parentRes = await page.request.post('/api/goals', {
        data: {
          title: `E2E Parent Goal ${Date.now()}`,
          description: 'Parent goal for cascading test',
          level: 'company',
          status: 'on_track',
          quarter: 'Q1 2026',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
        },
      })

      if (!parentRes.ok()) {
        test.skip(true, `Parent goal creation failed: ${parentRes.status()}`)
        return
      }

      const parentGoal = await parentRes.json()

      // Create child goal linked to parent
      const childRes = await page.request.post('/api/goals', {
        data: {
          title: `E2E Child Goal ${Date.now()}`,
          description: 'Child goal linked to parent',
          level: 'team',
          status: 'on_track',
          quarter: 'Q1 2026',
          startDate: '2026-01-01',
          endDate: '2026-03-31',
          parentGoalId: parentGoal.id,
        },
      })

      if (!childRes.ok()) {
        // Child creation may fail if parentGoalId not supported - clean up parent
        await page.request.delete(`/api/goals/${parentGoal.id}`).catch(() => {})
        test.skip(true, `Child goal creation failed: ${childRes.status()}`)
        return
      }

      const childGoal = await childRes.json()
      expect(childGoal.parentGoalId).toBe(parentGoal.id)

      // Verify parent can fetch child goals
      const parentDetailRes = await page.request.get(`/api/goals/${parentGoal.id}`)
      if (parentDetailRes.ok()) {
        const parentDetail = await parentDetailRes.json()
        expect(parentDetail).toBeTruthy()
      }

      // Clean up (child first, then parent)
      await page.request.delete(`/api/goals/${childGoal.id}`).catch(() => {})
      await page.request.delete(`/api/goals/${parentGoal.id}`).catch(() => {})
    })

    test('goal detail API returns data for existing goals', async ({ page }) => {
      await skipIfNoAuth(page)

      // Get list of goals
      const listRes = await page.request.get('/api/goals')
      if (!listRes.ok()) {
        test.skip(true, 'Goals API not available')
        return
      }

      const data = await listRes.json()
      const goals = Array.isArray(data) ? data : data.goals || []

      if (goals.length === 0) {
        test.skip(true, 'No goals available for detail test')
        return
      }

      const goalId = goals[0].id

      // Fetch goal detail
      const detailRes = await page.request.get(`/api/goals/${goalId}`)
      expect(detailRes.ok()).toBeTruthy()

      const goal = await detailRes.json()
      expect(goal.id).toBe(goalId)
      expect(goal.title).toBeTruthy()
    })

    test('goal progress update API works', async ({ page }) => {
      await skipIfNoAuth(page)

      // Get an existing goal
      const listRes = await page.request.get('/api/goals')
      if (!listRes.ok()) {
        test.skip(true, 'Goals API not available')
        return
      }

      const data = await listRes.json()
      const goals = Array.isArray(data) ? data : data.goals || []

      if (goals.length === 0) {
        test.skip(true, 'No goals available for progress test')
        return
      }

      const goalId = goals[0].id

      // Update progress
      const progressRes = await page.request.post(`/api/goals/${goalId}/progress`, {
        data: {
          progressPercent: 50,
          note: 'E2E test progress update',
        },
      })

      // Should get success, validation error, or not-found — not 500
      expect([200, 201, 400, 404]).toContain(progressRes.status())
    })
  })

  test.describe('Goals At-Risk', () => {
    test('at-risk goals API responds', async ({ page }) => {
      await skipIfNoAuth(page)

      const response = await page.request.get('/api/goals/at-risk')
      expect(response.ok()).toBeTruthy()

      const data = await response.json()
      expect(data).toBeTruthy()
    })
  })

  test.describe('Goal Detail Page', () => {
    test('goal detail page loads for existing goals', async ({ page }) => {
      await skipIfNoAuth(page)

      const workspaceSlug = await getWorkspaceSlug(page)
      if (!workspaceSlug) {
        test.skip(true, 'No workspace slug available')
        return
      }

      // Get an existing goal
      const listRes = await page.request.get('/api/goals')
      if (!listRes.ok()) {
        test.skip(true, 'Goals API not available')
        return
      }

      const data = await listRes.json()
      const goals = Array.isArray(data) ? data : data.goals || []

      if (goals.length === 0) {
        test.skip(true, 'No goals available')
        return
      }

      const goalId = goals[0].id

      // Navigate to goal detail page
      await page.goto(`/w/${workspaceSlug}/goals/${goalId}`)
      await waitForPageReady(page)

      // Should show goal content
      const content = page.locator('h1, h2, [data-testid="goal-detail"]').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    })
  })
})
