import { test, expect } from '@playwright/test'
import { waitForPageReady } from './helpers/page-ready'

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    
    // Verify page title and key elements (login page has unique layout)
    await expect(page.getByRole('heading', { name: /welcome to loopwell/i })).toBeVisible({ timeout: 10000 })
    
    // Verify sign-in button is present
    const signInButton = page.getByTestId('login-google-btn')
    await expect(signInButton).toBeVisible()
    await expect(signInButton).toBeEnabled()
  })

  test('unauthenticated user is redirected to login', async ({ browser }) => {
    // Create a new context without stored auth (no cookies)
    const context = await browser.newContext({ storageState: undefined })
    const page = await context.newPage()
    
    // Try to access a protected route
    await page.goto('/home')
    
    // Wait for redirect or page to settle
    await page.waitForLoadState('domcontentloaded')
    
    // Should be redirected to login or show login prompt
    // Use deterministic wait instead of timeout
    await expect(async () => {
      const url = page.url()
      const isOnLogin = url.includes('/login')
      const hasLoginButton = await page.getByTestId('login-google-btn').isVisible().catch(() => false)
      
      expect(isOnLogin || hasLoginButton).toBeTruthy()
    }).toPass({ timeout: 10000 })
    
    await context.close()
  })
})

test.describe('Authenticated Session', () => {
  test('authenticated user can access home', async ({ page }) => {
    await page.goto('/home')
    
    // Should not be redirected to login
    await expect(page).not.toHaveURL(/\/login/, { timeout: 5000 })
    
    // Dashboard container should be visible
    await expect(page.getByTestId('dashboard-container')).toBeVisible({ timeout: 10000 })
  })

  test('session persists across navigation', async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByTestId('dashboard-container')).toBeVisible({ timeout: 10000 })
    
    // Navigate to another page
    await page.goto('/todos')
    await waitForPageReady(page)
    
    // Should still be authenticated (not redirected)
    await expect(page).not.toHaveURL(/\/login/)
  })
})
