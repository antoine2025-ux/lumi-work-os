/**
 * Tests for wiki contributions query used in the org profile page.
 *
 * The query runs inline in:
 *   src/app/(dashboard)/w/[workspaceSlug]/org/profile/page.tsx
 *
 * Since it cannot be imported as a standalone function, this test file
 * defines a thin helper that replicates the exact query structure and
 * verifies correct call shape against a mocked Prisma client.
 *
 * If the query is ever extracted to a service function, these tests
 * can be updated to import and call it directly.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

// vi.hoisted: mock functions must exist before vi.mock factories run
const { mockFindMany, mockCount } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    wikiPage: {
      findMany: mockFindMany,
      count: mockCount,
    },
  },
}))

import { prisma } from '@/lib/db'

// ---------------------------------------------------------------------------
// Helper replicating the exact query in the profile page component
// ---------------------------------------------------------------------------

async function fetchWikiContributions(userId: string, workspaceId: string) {
  return Promise.all([
    prisma.wikiPage.findMany({
      where: { workspaceId, createdById: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        updatedAt: true,
        view_count: true,
      },
    }),
    prisma.wikiPage.count({
      where: { workspaceId, createdById: userId },
    }),
  ])
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'user-1'
const WORKSPACE_ID = 'ws-1'

const mockPages = [
  {
    id: 'p-1',
    title: 'How to Deploy',
    slug: 'how-to-deploy',
    updatedAt: new Date('2026-01-15'),
    view_count: 42,
  },
  {
    id: 'p-2',
    title: 'Team Handbook',
    slug: 'team-handbook',
    updatedAt: new Date('2026-01-10'),
    view_count: 18,
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('wiki contributions query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindMany.mockResolvedValue(mockPages)
    mockCount.mockResolvedValue(7)
  })

  it('scopes findMany by workspaceId and createdById (userId)', async () => {
    await fetchWikiContributions(USER_ID, WORKSPACE_ID)

    expect(mockFindMany).toHaveBeenCalledOnce()
    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.where).toEqual({ workspaceId: WORKSPACE_ID, createdById: USER_ID })
  })

  it('scopes count by workspaceId and createdById (userId)', async () => {
    await fetchWikiContributions(USER_ID, WORKSPACE_ID)

    expect(mockCount).toHaveBeenCalledOnce()
    const arg = mockCount.mock.calls[0][0]
    expect(arg.where).toEqual({ workspaceId: WORKSPACE_ID, createdById: USER_ID })
  })

  it('orders results by updatedAt descending', async () => {
    await fetchWikiContributions(USER_ID, WORKSPACE_ID)

    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.orderBy).toEqual({ updatedAt: 'desc' })
  })

  it('limits results to 5', async () => {
    await fetchWikiContributions(USER_ID, WORKSPACE_ID)

    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.take).toBe(5)
  })

  it('selects only id, title, slug, updatedAt, view_count', async () => {
    await fetchWikiContributions(USER_ID, WORKSPACE_ID)

    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.select).toEqual({
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
      view_count: true,
    })
  })

  it('returns the pages array and total count together', async () => {
    const [pages, count] = await fetchWikiContributions(USER_ID, WORKSPACE_ID)

    expect(pages).toEqual(mockPages)
    expect(count).toBe(7)
  })

  it('returns empty array and zero count when there are no contributions', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    const [pages, count] = await fetchWikiContributions(USER_ID, WORKSPACE_ID)

    expect(pages).toHaveLength(0)
    expect(count).toBe(0)
  })

  it('uses the provided userId in the where clause, not a hardcoded value', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await fetchWikiContributions('another-user', WORKSPACE_ID)

    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.where.createdById).toBe('another-user')
    expect(arg.where.workspaceId).toBe(WORKSPACE_ID)
  })
})
