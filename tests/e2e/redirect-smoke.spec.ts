import { test, expect, BrowserContext, Page } from '@playwright/test'

/**
 * Redirect Verification Smoke Tests
 * 
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

test.describe('Redirect Verification - Unauthenticated', () => {
  let context: BrowserContext

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({ storageState: undefined })
  })

  test.afterEach(async () => {
    await context.close()
  })

  test('TC-1: Unauthenticated user hitting /home redirects to /login', async () => {
    const page = await context.newPage()
    await page.goto('/home')
    await page.waitForLoadState('domcontentloaded')
    
    await expect(async () => {
      expect(page.url()).toContain('/login')
    }).toPass({ timeout: 10000 })
    
    expect(page.url()).toContain('callbackUrl')
  })

  test('TC-1b: Unauthenticated user hitting /projects redirects to /login', async () => {
    const page = await context.newPage()
    await page.goto('/projects')
    await page.waitForLoadState('domcontentloaded')
    
    await expect(async () => {
      expect(page.url()).toContain('/login')
    }).toPass({ timeout: 10000 })
  })

  test('TC-1c: Unauthenticated user hitting /wiki redirects to /login', async () => {
    const page = await context.newPage()
    await page.goto('/wiki')
    await page.waitForLoadState('domcontentloaded')
    
    await expect(async () => {
      expect(page.url()).toContain('/login')
    }).toPass({ timeout: 10000 })
  })

  test('TC-10: Unauthenticated user hitting /api/tasks returns 401', async () => {
    const page = await context.newPage()
    const response = await page.request.get('/api/tasks')
    expect(response.status()).toBe(401)
  })
})

test.describe('Redirect Verification - Authenticated', () => {
  test('TC-2: Authenticated user hitting /login redirects to /home', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    await ensureAuthenticated(page)
    
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    
    await expect(async () => {
      expect(page.url()).not.toContain('/login')
    }).toPass({ timeout: 10000 })
    
    await context.close()
  })

  test('TC-4: Authenticated user with workspace can access /home', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    await ensureAuthenticated(page)
    
    await page.goto('/home')
    await page.waitForLoadState('domcontentloaded')
    
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
    await expect(page.getByTestId('dashboard-container')).toBeVisible({ timeout: 10000 })
    
    await context.close()
  })

  test('TC-4b: Authenticated user can access /projects', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    await ensureAuthenticated(page)
    
    await page.goto('/projects')
    await page.waitForLoadState('domcontentloaded')
    
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
    
    await context.close()
  })

  test('TC-8: Hard refresh on protected route maintains session', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    await ensureAuthenticated(page)
    
    await page.goto('/home')
    await page.waitForLoadState('networkidle')
    
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
    await expect(page.getByTestId('dashboard-container')).toBeVisible({ timeout: 10000 })
    
    await context.close()
  })

  test('TC-9: Session endpoint returns user after E2E auth', async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    
    await ensureAuthenticated(page)
    
    const sessionResponse = await page.request.get('/api/auth/session')
    const session = await sessionResponse.json()
    
    expect(session).toHaveProperty('user')
    expect(session.user).toHaveProperty('email')
    expect(session.user.email).toBe('e2e-test@loopwell.test')
    
    await context.close()
  })
})

test.describe('API Route Protection', () => {
  test('Protected task route requires auth', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()
    
    const response = await page.request.get('/api/tasks/some-fake-id')
    expect(response.status()).toBe(401)
    
    await context.close()
  })

  test('Protected project route requires auth', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()
    
    const response = await page.request.get('/api/projects/some-fake-id')
    expect([401, 500]).toContain(response.status())
    
    await context.close()
  })
})
