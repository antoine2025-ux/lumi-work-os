import { Page, expect, test } from '@playwright/test'

/**
 * E2E Test Helpers for Deterministic Page Waits
 *
 * These helpers eliminate flaky waitForTimeout calls by waiting for
 * specific UI states or network conditions.
 */

/**
 * Check if the current session is authenticated.
 * Returns true if the session API returns a valid user.
 * Use with test.skip() to gracefully skip tests when auth is unavailable.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('/api/auth/session')
    if (!response.ok()) return false
    const session = await response.json()
    return !!session?.user
  } catch {
    return false
  }
}

/**
 * Skip the current test if the user is not authenticated.
 * Call at the start of any test that requires an active session.
 */
export async function skipIfNoAuth(page: Page): Promise<void> {
  const authed = await isAuthenticated(page)
  if (!authed) {
    test.skip(true, 'No authenticated session — set up .auth/user.json or enable E2E_TEST_AUTH')
  }
}

/**
 * Navigate to a protected page, skipping the test if auth redirects to /login.
 * Returns true if the page loaded successfully (not redirected to login).
 */
export async function gotoAuthenticated(
  page: Page,
  url: string,
  options?: { timeout?: number }
): Promise<boolean> {
  await page.goto(url)
  await page.waitForLoadState('domcontentloaded')

  // Check if we were redirected to login
  const currentUrl = page.url()
  if (currentUrl.includes('/login')) {
    test.skip(true, 'Redirected to login — no valid auth session')
    return false
  }

  await waitForPageReady(page, options)
  return true
}

/**
 * Wait for page to be ready for interaction.
 * Uses domcontentloaded + checks for main content visibility.
 */
export async function waitForPageReady(page: Page, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 10000
  
  await page.waitForLoadState('domcontentloaded')
  
  // Wait for any content to be visible - sidebar, main, or header
  // This is more reliable than looking for specific elements
  await expect(
    page.locator('header, nav, main, aside, [role="main"], [role="navigation"]').first()
  ).toBeVisible({ timeout })
}

/**
 * Wait for a navigation to complete and the target page to be ready.
 */
export async function waitForNavigation(page: Page, urlPattern: RegExp | string) {
  if (typeof urlPattern === 'string') {
    await expect(page).toHaveURL(urlPattern, { timeout: 10000 })
  } else {
    await expect(page).toHaveURL(urlPattern, { timeout: 10000 })
  }
  await page.waitForLoadState('domcontentloaded')
}

/**
 * Wait for a specific element to appear after an action (e.g., form submission).
 * More reliable than waiting for network idle.
 */
export async function waitForElement(
  page: Page, 
  selector: string, 
  options?: { timeout?: number; state?: 'visible' | 'attached' }
) {
  const timeout = options?.timeout ?? 10000
  const state = options?.state ?? 'visible'
  
  const locator = page.locator(selector)
  if (state === 'visible') {
    await expect(locator).toBeVisible({ timeout })
  } else {
    await expect(locator).toBeAttached({ timeout })
  }
  return locator
}

/**
 * Wait for an API response after an action.
 * Use this instead of waitForTimeout after form submissions.
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options?: { timeout?: number }
): Promise<void> {
  const timeout = options?.timeout ?? 10000
  
  await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout }
  )
}

/**
 * Wait for network to be idle (use sparingly - only for full page loads).
 * For most cases, prefer waitForElement or waitForApiResponse.
 */
export async function waitForNetworkIdle(page: Page, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 30000
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Wait for text to appear on the page.
 * Useful for success messages or dynamic content.
 */
export async function waitForText(
  page: Page, 
  text: string | RegExp, 
  options?: { timeout?: number }
) {
  const timeout = options?.timeout ?? 10000
  
  if (typeof text === 'string') {
    await expect(page.getByText(text)).toBeVisible({ timeout })
  } else {
    await expect(page.getByText(text)).toBeVisible({ timeout })
  }
}

