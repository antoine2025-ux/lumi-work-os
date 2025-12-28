import { Page, expect } from '@playwright/test'

/**
 * E2E Test Helpers for Deterministic Page Waits
 * 
 * These helpers eliminate flaky waitForTimeout calls by waiting for
 * specific UI states or network conditions.
 */

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

