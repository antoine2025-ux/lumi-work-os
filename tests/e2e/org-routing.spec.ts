import { test, expect, Page } from '@playwright/test'

/**
 * Org Routing Tests
 * 
 * Tests to verify:
 * 1. /w/[workspaceSlug]/org serves the NEW Org UI (not legacy)
 * 2. Legacy org routes are not accessible (404 or redirect)
 * 3. Navigation within the new Org works correctly
 * 
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
    console.log('E2E auth failed:', response.status())
    return false
  }
  
  // Verify session was created
  const sessionResponse = await page.request.get('/api/auth/session')
  const session = await sessionResponse.json()
  
  return !!session?.user
}

/**
 * Get the current workspace slug from user status API
 */
async function getWorkspaceSlug(page: Page): Promise<string | null> {
  const response = await page.request.get('/api/auth/user-status')
  if (!response.ok()) return null
  
  const data = await response.json()
  return data?.workspaceSlug || null
}

test.describe('Org Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate before each test
    const success = await loginWithE2EAuth(page)
    if (!success) {
      test.skip(true, 'E2E auth not configured')
    }
  })

  test('workspace-scoped org route serves NEW Org UI', async ({ page }) => {
    const workspaceSlug = await getWorkspaceSlug(page)
    test.skip(!workspaceSlug, 'No workspace slug available')

    // Navigate to workspace-scoped org route
    await page.goto(`/w/${workspaceSlug}/org`)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Assert NEW Org UI is present using data-testid
    const newOrgLayout = page.locator('[data-testid="new-org-layout"]')
    await expect(newOrgLayout).toBeVisible({ timeout: 10000 })

    // Also check for sidebar with "ORG" header
    const orgSidebar = page.locator('aside').filter({ hasText: 'ORG' })
    await expect(orgSidebar).toBeVisible()

    // Check for new Org navigation items (Overview, People, Structure, etc.)
    const overviewLink = page.getByRole('link', { name: /Overview/i })
    await expect(overviewLink).toBeVisible()

    const peopleLink = page.getByRole('link', { name: /People/i })
    await expect(peopleLink).toBeVisible()

    const structureLink = page.getByRole('link', { name: /Structure/i })
    await expect(structureLink).toBeVisible()

    // Assert LEGACY Org UI is NOT present
    // Legacy org had a "Utilities" button in the header
    const legacyUtilitiesButton = page.getByRole('button', { name: /Utilities/i })
    await expect(legacyUtilitiesButton).not.toBeVisible()

    // The new Org doesn't have Projects in the sidebar nav (legacy had it)
    const sidebarProjects = orgSidebar.getByRole('link', { name: /^Projects$/i })
    await expect(sidebarProjects).not.toBeVisible()
  })

  test('org people page is accessible via workspace-scoped route', async ({ page }) => {
    const workspaceSlug = await getWorkspaceSlug(page)
    test.skip(!workspaceSlug, 'No workspace slug available')

    // Navigate to people page
    await page.goto(`/w/${workspaceSlug}/org/people`)
    await page.waitForLoadState('networkidle')

    // Check for people page header
    const pageHeader = page.locator('text=People').first()
    await expect(pageHeader).toBeVisible({ timeout: 10000 })

    // Verify sidebar is still present
    const orgSidebar = page.locator('aside').filter({ hasText: 'ORG' })
    await expect(orgSidebar).toBeVisible()
  })

  test('org structure page is accessible via workspace-scoped route', async ({ page }) => {
    const workspaceSlug = await getWorkspaceSlug(page)
    test.skip(!workspaceSlug, 'No workspace slug available')

    // Navigate to structure page
    await page.goto(`/w/${workspaceSlug}/org/structure`)
    await page.waitForLoadState('networkidle')

    // Verify sidebar is present
    const orgSidebar = page.locator('aside').filter({ hasText: 'ORG' })
    await expect(orgSidebar).toBeVisible({ timeout: 10000 })
  })

  test('legacy org-legacy route returns 404 or redirects', async ({ page }) => {
    const workspaceSlug = await getWorkspaceSlug(page)
    test.skip(!workspaceSlug, 'No workspace slug available')

    // Try to access legacy route - should get 404
    const response = await page.goto(`/org-legacy`)
    
    // Either 404 or the route doesn't exist (both are acceptable)
    const is404 = response?.status() === 404
    const isNotFound = await page.locator('text=404').isVisible().catch(() => false)
    const isRedirected = response?.url().includes('/org') && !response?.url().includes('org-legacy')

    expect(is404 || isNotFound || isRedirected).toBe(true)
  })

  test('sidebar navigation uses correct workspace-scoped URLs', async ({ page }) => {
    const workspaceSlug = await getWorkspaceSlug(page)
    test.skip(!workspaceSlug, 'No workspace slug available')

    // Navigate to org page
    await page.goto(`/w/${workspaceSlug}/org`)
    await page.waitForLoadState('networkidle')

    // Get the People link href
    const peopleLink = page.getByRole('link', { name: /People/i }).first()
    await expect(peopleLink).toBeVisible({ timeout: 10000 })
    
    const href = await peopleLink.getAttribute('href')
    
    // Verify it's workspace-scoped
    expect(href).toContain(`/w/${workspaceSlug}/org/people`)
  })

  test('clicking sidebar nav item navigates to correct workspace-scoped route', async ({ page }) => {
    const workspaceSlug = await getWorkspaceSlug(page)
    test.skip(!workspaceSlug, 'No workspace slug available')

    // Navigate to org page
    await page.goto(`/w/${workspaceSlug}/org`)
    await page.waitForLoadState('networkidle')

    // Click on People link in sidebar
    const peopleLink = page.getByRole('link', { name: /People/i }).first()
    await expect(peopleLink).toBeVisible({ timeout: 10000 })
    await peopleLink.click()

    // Wait for navigation
    await page.waitForURL(`**/w/${workspaceSlug}/org/people**`)
    
    // Verify we're on the people page
    expect(page.url()).toContain(`/w/${workspaceSlug}/org/people`)
  })
})
