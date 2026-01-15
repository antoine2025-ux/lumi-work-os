import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home')
    await expect(page.getByTestId('dashboard-container')).toBeVisible({ timeout: 10000 })
  })

  test('dashboard loads without console errors', async ({ page }) => {
    const consoleErrors: string[] = []
    
    // Collect console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        // Ignore known non-critical errors
        const text = msg.text()
        if (!text.includes('favicon') && !text.includes('hydration')) {
          consoleErrors.push(text)
        }
      }
    })
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle')
    
    // Check for unexpected errors
    expect(consoleErrors, `Console errors found: ${consoleErrors.join(', ')}`).toHaveLength(0)
  })

  test('dashboard displays greeting', async ({ page }) => {
    // Should show a greeting based on time of day
    const greeting = page.getByRole('heading', { name: /good (morning|afternoon|evening)/i })
    await expect(greeting).toBeVisible()
  })

  test('dashboard shows quick actions', async ({ page }) => {
    // Quick actions section should be visible
    await expect(page.getByRole('heading', { name: /quick actions/i })).toBeVisible()
    
    // Key action buttons should be present
    await expect(page.getByRole('link', { name: /add to-do/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /new page/i })).toBeVisible()
  })

  test('dashboard loads projects section', async ({ page }) => {
    // Active projects card should be visible
    await expect(page.getByRole('heading', { name: /active projects/i })).toBeVisible()
  })

  test('navigation header is present', async ({ page }) => {
    // Header should be visible with navigation
    const header = page.locator('header')
    await expect(header).toBeVisible()
  })

  test('dashboard makes only one bootstrap API call on initial load', async ({ page }) => {
    // Track all network requests to /api/dashboard/bootstrap
    const bootstrapRequests: string[] = []
    
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('/api/dashboard/bootstrap')) {
        bootstrapRequests.push(url)
      }
    })
    
    // Navigate to dashboard (fresh page load)
    await page.goto('/home')
    await expect(page.getByTestId('dashboard-container')).toBeVisible({ timeout: 10000 })
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle')
    
    // Should have exactly 1 bootstrap call (not 10+ like before)
    expect(
      bootstrapRequests.length,
      `Expected 1 bootstrap call, but found ${bootstrapRequests.length}. This indicates a regression to the old multi-call pattern.`
    ).toBe(1)
  })
})

