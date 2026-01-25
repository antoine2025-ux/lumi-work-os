import { test, expect, BrowserContext, Page } from '@playwright/test'

/**
 * Auth + WorkspaceId + Redirect Tests (Phase D)
 * 
 * Tests to prevent regressions in auth, workspaceId, and redirect consistency.
 * Uses E2E test auth endpoint for authenticated tests.
 * Requires server to have E2E_TEST_AUTH=true and E2E_TEST_PASSWORD set.
 */

const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'e2e-test-password-123'

/**
 * Login using the E2E auth endpoint.
 */
async function loginWithE2EAuth(page: Page): Promise<boolean> {
  const response = await page.request.post('/api/e2e-auth', {
    data: { password: E2E_TEST_PASSWORD }
  })
  
  if (!response.ok()) {
    const body = await response.json().catch(() => ({}))
    console.log('E2E auth failed:', response.status(), body)
    return false
  }
  
  // Verify session was created
  const sessionResponse = await page.request.get('/api/auth/session')
  const session = await sessionResponse.json()
  
  return !!session?.user
}

/**
 * Ensure authenticated session exists.
 */
async function ensureAuthenticated(page: Page): Promise<void> {
  // Check existing session
  const sessionResponse = await page.request.get('/api/auth/session')
  const session = await sessionResponse.json()
  
  if (session?.user) {
    return
  }
  
  const success = await loginWithE2EAuth(page)
  if (!success) {
    throw new Error('Failed to authenticate. Ensure server has E2E_TEST_AUTH=true and E2E_TEST_PASSWORD set.')
  }
}

test.describe('Auth + WorkspaceId + Redirect Tests (Phase D)', () => {
  test.describe('D1: Unauthenticated User Redirects', () => {
    test('unauthenticated user visiting /home redirects to /login', async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined })
      const page = await context.newPage()
      
      // Navigate to protected route
      await page.goto('/home')
      await page.waitForLoadState('domcontentloaded')
      
      // Should redirect to login
      await expect(async () => {
        expect(page.url()).toContain('/login')
      }).toPass({ timeout: 10000 })
      
      // Should have callbackUrl parameter
      const url = new URL(page.url())
      expect(url.searchParams.get('callbackUrl')).toBe('/home')
      
      await context.close()
    })

    test('unauthenticated user visiting /projects redirects to /login', async ({ browser }) => {
      const context = await browser.newContext({ storageState: undefined })
      const page = await context.newPage()
      
      await page.goto('/projects')
      await page.waitForLoadState('domcontentloaded')
      
      await expect(async () => {
        expect(page.url()).toContain('/login')
      }).toPass({ timeout: 10000 })
      
      await context.close()
    })
  })

  test.describe('D2: Authenticated User Without Workspace Redirects', () => {
    test('authenticated user without workspace visiting /home redirects to /welcome', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      // Authenticate user
      await ensureAuthenticated(page)
      
      // Note: This test assumes the E2E test user has no workspace memberships
      // If the test user has a workspace, this test will need to be adjusted
      // to create a user without workspace or mock the workspace check
      
      // Navigate to protected route
      await page.goto('/home')
      await page.waitForLoadState('domcontentloaded')
      
      // Should redirect to welcome (middleware checks isFirstTime flag)
      await expect(async () => {
        const url = page.url()
        // Should redirect to /welcome if user has no workspace
        expect(url).toMatch(/\/welcome/)
      }).toPass({ timeout: 10000 })
      
      await context.close()
    })

    test('authenticated user without workspace visiting /projects redirects to /welcome', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      await ensureAuthenticated(page)
      
      await page.goto('/projects')
      await page.waitForLoadState('domcontentloaded')
      
      await expect(async () => {
        expect(page.url()).toMatch(/\/welcome/)
      }).toPass({ timeout: 10000 })
      
      await context.close()
    })
  })

  test.describe('D3: Authenticated User With Workspace Can Access Protected Routes', () => {
    test('authenticated user with workspace can access /home', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      await ensureAuthenticated(page)
      
      // Navigate to protected route
      await page.goto('/home')
      await page.waitForLoadState('domcontentloaded')
      
      // Should NOT redirect (stays on /home)
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
      await expect(page).not.toHaveURL(/\/welcome/, { timeout: 5000 })
      
      // Should load page content (not redirect)
      // Check for any content that indicates the page loaded
      const body = page.locator('body')
      await expect(body).toBeVisible({ timeout: 10000 })
      
      await context.close()
    })

    test('authenticated user with workspace can access /projects', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      await ensureAuthenticated(page)
      
      await page.goto('/projects')
      await page.waitForLoadState('domcontentloaded')
      
      // Should NOT redirect
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
      await expect(page).not.toHaveURL(/\/welcome/, { timeout: 5000 })
      
      // Should load page content
      const body = page.locator('body')
      await expect(body).toBeVisible({ timeout: 10000 })
      
      await context.close()
    })

    test('hard refresh on /projects maintains session and workspace', async ({ browser }) => {
      const context = await browser.newContext()
      const page = await context.newPage()
      
      await ensureAuthenticated(page)
      
      // Navigate to protected route
      await page.goto('/projects')
      await page.waitForLoadState('networkidle')
      
      // Hard refresh
      await page.reload()
      await page.waitForLoadState('domcontentloaded')
      
      // Should NOT redirect after refresh
      await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
      await expect(page).not.toHaveURL(/\/welcome/, { timeout: 5000 })
      
      // Should still be on /projects
      expect(page.url()).toContain('/projects')
      
      await context.close()
    })
  })
})
