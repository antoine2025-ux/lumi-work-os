import { test, expect } from '@playwright/test'
import {
  gotoAuthenticated,
  skipIfNoAuth,
  waitForPageReady,
} from './helpers/page-ready'

/**
 * Spaces E2E Tests
 *
 * Test Suite 1: Sidebar structure (MY SPACE, TEAM SPACES, SHARED, MY STUFF)
 * Test Suite 2: Personal view smoke
 * Test Suite 3: Team space view smoke
 * Test Suite 4: Company Wiki smoke
 * Test Suite 7: Navigation (project card, page links)
 *
 * Uses workspace slug from URL after navigating to a workspace-scoped route.
 */

/** Extract workspace slug from URL like /w/loopwell/... */
function getWorkspaceSlugFromUrl(url: string): string | null {
  const match = url.match(/\/w\/([^/]+)/)
  return match ? match[1] : null
}

/** Navigate to spaces home and return workspace slug, or null if auth failed */
async function getSpacesHomeWithSlug(
  page: import('@playwright/test').Page
): Promise<string | null> {
  // /spaces/home does server redirect to /w/[slug]/spaces/home
  const ok = await gotoAuthenticated(page, '/spaces/home')
  if (!ok) return null

  // Wait for URL to settle (server redirect)
  await page.waitForURL(/\/w\/[^/]+\/spaces\/home/, { timeout: 15000 }).catch(() => {})
  const slug = getWorkspaceSlugFromUrl(page.url())
  return slug
}

/** Alternative: get slug from /projects redirect */
async function getWorkspaceSlugFromProjects(
  page: import('@playwright/test').Page
): Promise<string | null> {
  const ok = await gotoAuthenticated(page, '/projects')
  if (!ok) return null
  await page.waitForURL(/\/w\/[^/]+\/projects/, { timeout: 15000 }).catch(() => {})
  return getWorkspaceSlugFromUrl(page.url())
}

test.describe('Spaces - Test Suite 1: Sidebar Structure', () => {
  test('sidebar has MY SPACE section with Personal', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: 'MY SPACE' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: 'Personal' })).toBeVisible()
  })

  test('sidebar has TEAM SPACES section', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: 'TEAM SPACES' })).toBeVisible({ timeout: 10000 })
  })

  test('sidebar has SHARED section with Company Wiki and Templates', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: 'SHARED' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: 'Company Wiki' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Templates/i })).toBeVisible()
  })

  test('sidebar has MY STUFF section with To-do List and Favorites', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: 'MY STUFF' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('link', { name: 'To-do List' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Favorites' })).toBeVisible()
  })

  test('Company Wiki is in SHARED, not in TEAM SPACES', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    const sharedSection = page.getByRole('heading', { name: 'SHARED' })
    await expect(sharedSection).toBeVisible({ timeout: 10000 })
    const companyWikiLink = page.getByRole('link', { name: 'Company Wiki' })
    await expect(companyWikiLink).toBeVisible()

    // Company Wiki is under SHARED (verify DOM order: SHARED comes before MY STUFF)
    const teamSpaces = page.getByRole('heading', { name: 'TEAM SPACES' })
    const shared = page.getByRole('heading', { name: 'SHARED' })
    const teamSpacesBox = await teamSpaces.boundingBox()
    const sharedBox = await shared.boundingBox()
    if (teamSpacesBox && sharedBox) {
      expect(sharedBox.y).toBeGreaterThan(teamSpacesBox.y)
    }
    // Company Wiki link should be under SHARED heading (not under TEAM SPACES)
    const wikiBox = await companyWikiLink.boundingBox()
    if (teamSpacesBox && wikiBox && sharedBox) {
      expect(wikiBox.y).toBeGreaterThan(sharedBox.y)
    }
  })

  test('sidebar consistent across spaces/home, spaces/[id], projects/[id], wiki', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }

    const routes = [
      `/w/${slug}/spaces/home`,
      `/w/${slug}/projects`,
      '/wiki/home',
    ]

    for (const route of routes) {
      await gotoAuthenticated(page, route)
      await waitForPageReady(page)

      await expect(page.getByRole('heading', { name: 'MY SPACE' })).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('heading', { name: 'TEAM SPACES' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'SHARED' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'MY STUFF' })).toBeVisible()
    }

    // If we have a team space, verify sidebar on space detail too
    const teamSpaceLink = page.locator('a[href*="/spaces/"]').filter({
      hasNot: page.locator('text=Personal')
    }).first()
    const hasTeamSpace = await teamSpaceLink.isVisible({ timeout: 2000 }).catch(() => false)
    if (hasTeamSpace) {
      const href = await teamSpaceLink.getAttribute('href')
      if (href && href.includes('/spaces/') && !href.includes('/spaces/home')) {
        await page.goto(href)
        await waitForPageReady(page)
        await expect(page.getByRole('heading', { name: 'MY SPACE' })).toBeVisible({ timeout: 10000 })
      }
    }
  })
})

test.describe('Spaces - Test Suite 2: Personal View Smoke', () => {
  test('Personal view loads and shows sections', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: 'My Work' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Spaces / Personal')).toBeVisible()
    await expect(page.getByRole('heading', { name: /working on/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /recent activity/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /personal notes/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /due soon/i })).toBeVisible()
  })
})

test.describe('Spaces - Test Suite 3: Team Space View Smoke', () => {
  test('Team space view loads when navigating to a team space', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    const teamSpaceLink = page.locator('a[href*="/spaces/"]').filter({
      hasNot: page.locator('text=Personal')
    }).first()
    const hasTeamSpace = await teamSpaceLink.isVisible({ timeout: 3000 }).catch(() => false)
    if (!hasTeamSpace) {
      test.skip(true, 'No team spaces found')
      return
    }

    await teamSpaceLink.click()
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: 'OUR PROJECTS' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: 'TEAM DOCS' })).toBeVisible()
  })
})

test.describe('Spaces - Test Suite 4: Company Wiki Smoke', () => {
  test('Company Wiki loads and shows sections', async ({ page }) => {
    await skipIfNoAuth(page)
    const ok = await gotoAuthenticated(page, '/wiki/home')
    if (!ok) return
    await waitForPageReady(page)

    await expect(page.getByRole('heading', { name: 'Company Wiki' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Company-wide documentation and knowledge base')).toBeVisible()
    await expect(page.getByRole('heading', { name: /recent updates/i })).toBeVisible()
  })
})

test.describe('Spaces - Test Suite 7: Navigation', () => {
  test('project card links work', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    const projectCard = page.locator('a[href*="/projects/"]').first()
    const hasProject = await projectCard.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasProject) {
      test.skip(true, 'No project cards on Personal view')
      return
    }

    await projectCard.click()
    await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 10000 })
    await waitForPageReady(page)
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 5000 })
  })

  test('page links work from Personal view', async ({ page }) => {
    await skipIfNoAuth(page)
    const slug = await getSpacesHomeWithSlug(page) ?? await getWorkspaceSlugFromProjects(page)
    if (!slug) {
      test.skip(true, 'Could not resolve workspace slug')
      return
    }
    await gotoAuthenticated(page, `/w/${slug}/spaces/home`)
    await waitForPageReady(page)

    const pageLink = page.locator('a[href*="/wiki/"]').first()
    const hasPageLink = await pageLink.isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasPageLink) {
      test.skip(true, 'No wiki page links on Personal view')
      return
    }

    await pageLink.click()
    await expect(page).toHaveURL(/\/wiki\/[^/]+/, { timeout: 10000 })
    await waitForPageReady(page)
  })
})
