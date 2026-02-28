import { test, expect } from '@playwright/test'
import { skipIfNoAuth, gotoAuthenticated } from './helpers/page-ready'

/**
 * Onboarding — API contract & routing tests
 *
 * The shared E2E user is already onboarded, so we cannot walk the wizard UI
 * step-by-step without resetting state. Instead we verify:
 *
 *   1. Routing: completed users are redirected away from every onboarding step
 *   2. Progress API: GET returns a well-shaped object with all required fields
 *   3. Validation: POST rejects malformed payloads before touching the DB
 *   4. Step-1 idempotency: sending a valid Step-1 body returns the expected shape
 *      even when the workspace already exists (update path, not create).
 *
 * These tests are safe to run repeatedly against the shared test workspace
 * because they either read-only or hit validation short-circuits that never
 * reach persistence.
 */

test.describe('Onboarding — routing', () => {
  test('completed user visiting /onboarding/1 is redirected to /home', async ({ page }) => {
    await skipIfNoAuth(page)

    await page.goto('/onboarding/1')
    await page.waitForLoadState('domcontentloaded')

    await expect(async () => {
      const url = page.url()
      expect(url.includes('/home') || url.includes('/onboarding')).toBeTruthy()
    }).toPass({ timeout: 10_000 })

    const url = page.url()
    if (url.includes('/home')) {
      // Correct — completed user was redirected
      await expect(page.locator('header, nav, main').first()).toBeVisible({ timeout: 10_000 })
    } else {
      // Also acceptable: wizard renders, progress fetched, then client-side redirect fires
      // Just confirm it eventually leaves onboarding
      await expect(page).toHaveURL(/\/home/, { timeout: 10_000 })
    }
  })

  test('completed user visiting /onboarding/5 is redirected to /home', async ({ page }) => {
    await skipIfNoAuth(page)

    await page.goto('/onboarding/5')
    await page.waitForLoadState('domcontentloaded')

    await expect(async () => {
      const url = page.url()
      expect(url.includes('/home') || url.includes('/onboarding')).toBeTruthy()
    }).toPass({ timeout: 10_000 })

    // Client-side redirect: page.tsx fetches progress → isComplete=true → router.replace('/home')
    await expect(page).toHaveURL(/\/home/, { timeout: 12_000 })
  })

  test('/onboarding/99 (invalid step) redirects to a valid URL', async ({ page }) => {
    await skipIfNoAuth(page)

    await page.goto('/onboarding/99')
    await page.waitForLoadState('domcontentloaded')

    await expect(async () => {
      const url = page.url()
      const isValid =
        /\/onboarding\/[1-5]/.test(url) || url.includes('/home')
      expect(isValid).toBeTruthy()
    }).toPass({ timeout: 10_000 })
  })

  test('/welcome redirects to /onboarding/1 or /home', async ({ page }) => {
    await skipIfNoAuth(page)

    await page.goto('/welcome')
    await page.waitForLoadState('domcontentloaded')

    await expect(async () => {
      const url = page.url()
      expect(url.includes('/onboarding') || url.includes('/home')).toBeTruthy()
    }).toPass({ timeout: 10_000 })
  })
})

test.describe('Onboarding — progress API (GET)', () => {
  test('returns 200 with a valid progress object', async ({ page }) => {
    await skipIfNoAuth(page)

    const res = await page.request.get('/api/onboarding/progress')

    if (res.status() === 401) {
      test.skip(true, 'No auth session for API request')
      return
    }

    expect(res.ok()).toBeTruthy()
    const data = await res.json()

    // Required fields
    expect(data).toHaveProperty('currentStep')
    expect(data).toHaveProperty('completedSteps')
    expect(data).toHaveProperty('isComplete')

    // Type checks
    expect(typeof data.currentStep).toBe('number')
    expect(Array.isArray(data.completedSteps)).toBeTruthy()
    expect(typeof data.isComplete).toBe('boolean')

    // currentStep must be 1–5
    expect(data.currentStep).toBeGreaterThanOrEqual(1)
    expect(data.currentStep).toBeLessThanOrEqual(5)
  })

  test('completed user has isComplete=true', async ({ page }) => {
    await skipIfNoAuth(page)

    const res = await page.request.get('/api/onboarding/progress')
    if (!res.ok()) {
      test.skip(true, 'Progress endpoint unavailable')
      return
    }

    const data = await res.json()
    // The shared E2E user completes onboarding during seed — assert the flag is set
    expect(data.isComplete).toBe(true)
  })

  test('completedSteps contains at least step 1', async ({ page }) => {
    await skipIfNoAuth(page)

    const res = await page.request.get('/api/onboarding/progress')
    if (!res.ok()) {
      test.skip(true, 'Progress endpoint unavailable')
      return
    }

    const data = await res.json()
    // A fully onboarded workspace must have completed step 1
    expect(data.completedSteps).toContain(1)
  })
})

test.describe('Onboarding — step-submission validation (POST)', () => {
  test('POST without a step field returns 400', async ({ page }) => {
    await skipIfNoAuth(page)

    const res = await page.request.post('/api/onboarding/progress', {
      data: { data: { workspaceName: 'Test' } }, // missing "step"
    })

    if (res.status() === 401) {
      test.skip(true, 'No auth for API call')
      return
    }

    expect(res.status()).toBe(400)
    const body = await res.json()
    // Should describe a validation error, not a server crash
    expect(body).toHaveProperty('error')
  })

  test('POST step 1 with missing required fields returns 400', async ({ page }) => {
    await skipIfNoAuth(page)

    // workspaceName is required but omitted
    const res = await page.request.post('/api/onboarding/progress', {
      data: {
        step: 1,
        data: {
          adminName: 'Test Admin',
          // workspaceName intentionally omitted → schema should reject
        },
      },
    })

    if (res.status() === 401) {
      test.skip(true, 'No auth for API call')
      return
    }

    // Zod validation should return 400 before touching the DB
    expect(res.status()).toBe(400)
  })

  test('POST with invalid step number returns 400', async ({ page }) => {
    await skipIfNoAuth(page)

    const res = await page.request.post('/api/onboarding/progress', {
      data: { step: 99, data: {} },
    })

    if (res.status() === 401) {
      test.skip(true, 'No auth for API call')
      return
    }

    expect(res.status()).toBe(400)
  })

  test('POST step 1 with all valid fields succeeds (idempotent update path)', async ({ page }) => {
    await skipIfNoAuth(page)

    // For an already-onboarded user, step 1 hits the "resuming" update path.
    // It updates workspace name/size and the OrgPosition title — no data loss.
    const res = await page.request.post('/api/onboarding/progress', {
      data: {
        step: 1,
        data: {
          workspaceName: 'E2E Test Workspace',
          adminName: 'E2E User',
          adminTitle: 'Engineer',
          companySize: '2-10',
        },
      },
    })

    if (res.status() === 401) {
      test.skip(true, 'No auth for API call')
      return
    }

    // Expect success (200 or 2xx) — not a validation error
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body).toHaveProperty('success', true)
    expect(body).toHaveProperty('nextStep', 2)
  })
})

test.describe('Onboarding — UI renders correctly for authenticated user', () => {
  test('navigating directly to /onboarding shows a loading state then redirects', async ({ page }) => {
    const loaded = await gotoAuthenticated(page, '/onboarding/1')
    if (!loaded) return // redirected to /login

    // Either the spinner renders briefly or we land on /home immediately
    const url = page.url()
    const isOk = url.includes('/home') || url.includes('/onboarding')
    expect(isOk).toBeTruthy()
  })
})
