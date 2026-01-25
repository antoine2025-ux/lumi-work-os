import { test, expect } from '@playwright/test'

/**
 * Regression test: /api/projects should return 200 (not 500)
 * 
 * PHASE 1: This test verifies that WorkspaceMember queries don't fail
 * due to missing employmentStatus field in database.
 * 
 * Run with:
 * npx playwright test tests/e2e/api-projects-regression.spec.ts --config=playwright.snapshot.config.ts
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

test('PHASE 1: /api/projects returns 200 (not 500 from employmentStatus error)', async ({ page, context }) => {
  // Check if we have auth state
  const sessionRes = await page.request.get(`${BASE_URL}/api/auth/session`)
  const session = await sessionRes.json().catch(() => ({}))
  
  if (!session?.user) {
    test.skip('No authenticated session - skipping test')
    return
  }
  
  // Make request to /api/projects
  const projectsRes = await page.request.get(`${BASE_URL}/api/projects`)
  
  // Should return 200, not 500
  expect(projectsRes.status()).toBe(200)
  
  // Should return valid JSON
  const body = await projectsRes.json().catch(() => null)
  expect(body).not.toBeNull()
  
  // Should not have error about employmentStatus
  if (body && typeof body === 'object') {
    const bodyStr = JSON.stringify(body)
    expect(bodyStr).not.toContain('employmentStatus')
    expect(bodyStr).not.toContain('P2022') // Prisma schema mismatch error code
  }
  
  console.log('✅ /api/projects returned 200 successfully')
  console.log(`Response has ${Array.isArray(body?.projects) ? body.projects.length : 0} projects`)
})
