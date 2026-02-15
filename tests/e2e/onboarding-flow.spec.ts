import { test, expect } from '@playwright/test'
import { waitForPageReady, gotoAuthenticated, skipIfNoAuth } from './helpers/page-ready'

/**
 * Onboarding Flow E2E Tests
 *
 * Tests the 5-step onboarding wizard:
 * 1. Workspace creation
 * 2. Invite team members
 * 3. Org structure
 * 4. First wiki space
 * 5. Ready / launch
 *
 * Note: For authenticated users who already completed onboarding,
 * the wizard redirects to /home. These tests verify the flow
 * is accessible and functional for first-time users.
 */

test.describe('Onboarding Flow', () => {
  test('onboarding step 1 loads or redirects completed users to home', async ({ page }) => {
    await skipIfNoAuth(page)

    await page.goto('/onboarding/1')
    await page.waitForLoadState('domcontentloaded')

    // Either:
    // 1. Shows onboarding wizard (new user)
    // 2. Redirects to /home (already onboarded user)
    await expect(async () => {
      const url = page.url()
      const isOnboarding = url.includes('/onboarding')
      const isHome = url.includes('/home')
      expect(isOnboarding || isHome).toBeTruthy()
    }).toPass({ timeout: 10000 })

    const url = page.url()
    if (url.includes('/home')) {
      // User already onboarded - verify home loads
      await waitForPageReady(page)
      const content = page.locator('h1, h2, [data-testid="dashboard-container"]').first()
      await expect(content).toBeVisible({ timeout: 10000 })
    } else {
      // User on onboarding - verify step content
      await waitForPageReady(page)
      const stepContent = page.locator('form, h1, h2, [data-testid="onboarding-step"]').first()
      await expect(stepContent).toBeVisible({ timeout: 10000 })
    }
  })

  test('welcome page redirects to onboarding or home', async ({ page }) => {
    await skipIfNoAuth(page)

    await page.goto('/welcome')
    await page.waitForLoadState('domcontentloaded')

    // /welcome is a shim that redirects to /onboarding/1
    await expect(async () => {
      const url = page.url()
      const isOnboarding = url.includes('/onboarding')
      const isHome = url.includes('/home')
      expect(isOnboarding || isHome).toBeTruthy()
    }).toPass({ timeout: 10000 })
  })

  test('onboarding progress API returns valid state', async ({ page }) => {
    await skipIfNoAuth(page)

    const response = await page.request.get('/api/onboarding/progress')

    if (!response.ok()) {
      // Endpoint may not exist if onboarding module isn't deployed
      test.skip(true, 'Onboarding progress endpoint not available')
      return
    }

    const data = await response.json()

    // Should have expected shape
    expect(data).toHaveProperty('currentStep')
    expect(data).toHaveProperty('isComplete')
    expect(typeof data.currentStep).toBe('number')
    expect(typeof data.isComplete).toBe('boolean')
  })

  test('invalid onboarding step redirects gracefully', async ({ page }) => {
    await skipIfNoAuth(page)

    await page.goto('/onboarding/99')
    await page.waitForLoadState('domcontentloaded')

    // Should redirect to a valid step or home (not crash)
    await expect(async () => {
      const url = page.url()
      const isValid = url.includes('/onboarding/1') ||
                      url.includes('/onboarding/2') ||
                      url.includes('/onboarding/3') ||
                      url.includes('/onboarding/4') ||
                      url.includes('/onboarding/5') ||
                      url.includes('/home')
      expect(isValid).toBeTruthy()
    }).toPass({ timeout: 10000 })
  })

  test('onboarding templates API responds', async ({ page }) => {
    await skipIfNoAuth(page)

    const response = await page.request.get('/api/onboarding/templates')

    // Templates endpoint should return 200 with template data
    // or 404 if not yet created
    expect([200, 404]).toContain(response.status())

    if (response.ok()) {
      const data = await response.json()
      expect(data).toBeTruthy()
    }
  })
})
