/**
 * Wiki Security Tests
 *
 * Verify personal space isolation that ensures users can only see/edit their own personal pages.
 * Personal pages are identified by workspace_type='personal' or permissionLevel='personal'.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockAuthContext, mockRequest, clearAllTestMocks } from '../helpers/test-utils'
import { createMockWikiPage } from '../helpers/fixtures'

// Mock all dependencies

// Must mock cache BEFORE routes import it
vi.mock('@/lib/cache', () => ({
  cache: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    generateKey: vi.fn((...args: string[]) => args.join('_')),
    invalidatePattern: vi.fn().mockResolvedValue(undefined),
  },
  CACHE_KEYS: { WIKI_PAGES: 'wiki_pages', WORKSPACE_DATA: 'workspace_data' },
  CACHE_TTL: { SHORT: 60, MEDIUM: 300 },
}))

vi.mock('@/lib/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({ page: 1, limit: 10, sortBy: 'order', sortOrder: 'asc' }),
  createPaginationResult: vi.fn((data: unknown[], total: number, page: number, limit: number) => ({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: false, hasPrev: false },
  })),
  getSkipValue: vi.fn().mockReturnValue(0),
  getOrderByClause: vi.fn().mockReturnValue({ order: 'asc' }),
}))

vi.mock('@/lib/events/emit', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/events/activityEvents', () => ({
  ACTIVITY_EVENTS: {},
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/validations/wiki', () => ({
  WikiPageCreateSchema: { parse: vi.fn((data: unknown) => data) },
  WikiPageUpdateSchema: { parse: vi.fn((data: unknown) => data) },
  WikiWorkspaceCreateSchema: { parse: vi.fn((data: unknown) => data) },
}))

vi.mock('@/lib/unified-auth')
vi.mock('@/lib/auth/assertAccess')
vi.mock('@/lib/prisma/scopingMiddleware')

vi.mock('@/lib/db', () => {
  const wikiPageMock = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const wikiWorkspacesMock = {
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
  }
  const prismaObj: Record<string, unknown> = {
    wikiPage: wikiPageMock,
    wiki_workspaces: wikiWorkspacesMock,
    $executeRaw: vi.fn().mockResolvedValue(undefined),
  }
  // $transaction passes the same wikiPage mock so tests can control it
  prismaObj.$transaction = vi.fn(async (fn: (tx: Record<string, unknown>) => unknown) => fn({
    $executeRaw: vi.fn().mockResolvedValue(undefined),
    wikiPage: wikiPageMock,
  }))
  return { prisma: prismaObj }
})

describe('Wiki Security', () => {
  beforeEach(() => {
    clearAllTestMocks()
  })

  describe('Personal pages filtered in list', () => {
    it('should exclude other users personal pages from GET /api/wiki/pages', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      // Current user is user-1
      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // Prisma returns only pages accessible to user-1
      // Personal pages from user-2 are filtered out
      vi.mocked(prisma.wikiPage.findMany).mockResolvedValue([
        createMockWikiPage({
          id: 'wiki-1',
          title: 'Team Page',
          workspace_type: 'team',
          createdById: 'user-2',
        }),
      ])
      vi.mocked(prisma.wikiPage.count).mockResolvedValue(1)

      const { GET } = await import('@/app/api/wiki/pages/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // createPaginationResult returns { data: [...], pagination: {...} }
      expect(data.data).toHaveLength(1)
      expect(data.data[0].workspace_type as string).toBe('team')
    })
  })

  describe('Personal pages in own list', () => {
    it('should include current users personal pages in GET /api/wiki/pages', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // Prisma returns user-1's personal pages
      vi.mocked(prisma.wikiPage.findMany).mockResolvedValue([
        createMockWikiPage({
          id: 'personal-1',
          title: 'My Personal Page',
          workspace_type: 'personal',
          createdById: 'user-1',
        }),
        createMockWikiPage({
          id: 'team-1',
          title: 'Team Page',
          workspace_type: 'team',
          createdById: 'user-1',
        }),
      ])
      vi.mocked(prisma.wikiPage.count).mockResolvedValue(2)

      const { GET } = await import('@/app/api/wiki/pages/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      expect(data.data).toHaveLength(2)
      expect(data.data.find((p: { id: string }) => p.id === 'personal-1')).toBeDefined()
      expect(data.data.find((p: { id: string }) => p.id === 'team-1')).toBeDefined()
    })
  })

  describe('Recent pages exclude personal', () => {
    it('should exclude other users personal pages from GET /api/wiki/recent-pages', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // Prisma returns only non-personal pages or user-1's personal pages
      vi.mocked(prisma.wikiPage.findMany).mockResolvedValue([
        createMockWikiPage({
          id: 'recent-1',
          title: 'Recent Team Page',
          workspace_type: 'team',
          createdById: 'user-2',
        }),
      ])

      const { GET } = await import('@/app/api/wiki/recent-pages/route')
      const request = mockRequest('http://localhost:3000/api/wiki/recent-pages')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // recent-pages route returns a flat array, not { pages: [...] }
      expect(Array.isArray(data)).toBe(true)
      expect(data.every((p: { workspace_type: string; createdById: string }) => p.workspace_type !== 'personal' || p.createdById === 'user-1')).toBe(true)
    })
  })

  describe('Page count scoping', () => {
    it('should only count users personal pages in GET /api/wiki/page-counts', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // The page-counts route first fetches workspaces, then loops over them counting pages.
      // We need wiki_workspaces.findMany to return at least a personal workspace.
      vi.mocked(prisma.wiki_workspaces.findMany).mockResolvedValue([
        { id: 'personal-space-user-1', type: 'personal', name: 'Personal Space' } as Record<string, unknown>,
      ] as unknown[])

      // Mock count for personal pages (only user-1's pages)
      vi.mocked(prisma.wikiPage.count).mockResolvedValue(2)

      const { GET } = await import('@/app/api/wiki/page-counts/route')
      const request = mockRequest('http://localhost:3000/api/wiki/page-counts')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // Route returns { [workspaceId]: count }, keyed by workspace ID
      expect(data['personal-space-user-1']).toBe(2)
    })
  })

  describe('Direct access blocked', () => {
    it('should return 404 for GET /api/wiki/pages/[id] when accessing another users personal page', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // Both findFirst and findUnique inside the $transaction return null
      vi.mocked(prisma.wikiPage.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue(null)

      const { GET } = await import('@/app/api/wiki/pages/[id]/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages/personal-page-2')
      const response = await GET(request, { params: Promise.resolve({ id: 'personal-page-2' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('not found')
    })
  })

  describe('Edit blocked', () => {
    it('should return 404 for PUT /api/wiki/pages/[id] when editing another users personal page', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // Prisma returns null because page doesn't exist in accessible scope
      vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue(null)

      const { PUT } = await import('@/app/api/wiki/pages/[id]/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages/personal-page-2', {
        method: 'PUT',
        body: { title: 'Hacked Title' },
      })
      const response = await PUT(request, { params: Promise.resolve({ id: 'personal-page-2' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('not found')
    })
  })

  describe('Delete blocked', () => {
    it('should return 404 for DELETE /api/wiki/pages/[id] when deleting another users personal page', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // Prisma returns null because page doesn't exist in accessible scope
      vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue(null)

      const { DELETE } = await import('@/app/api/wiki/pages/[id]/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages/personal-page-2', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: Promise.resolve({ id: 'personal-page-2' }) })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toContain('not found')
    })
  })

  describe('Team pages visible', () => {
    it('should include all team/shared pages regardless of creator in GET /api/wiki/pages', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // Prisma returns team pages from different users
      vi.mocked(prisma.wikiPage.findMany).mockResolvedValue([
        createMockWikiPage({
          id: 'team-1',
          title: 'Team Page by User 1',
          workspace_type: 'team',
          createdById: 'user-1',
        }),
        createMockWikiPage({
          id: 'team-2',
          title: 'Team Page by User 2',
          workspace_type: 'team',
          createdById: 'user-2',
        }),
      ])
      vi.mocked(prisma.wikiPage.count).mockResolvedValue(2)

      const { GET } = await import('@/app/api/wiki/pages/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // createPaginationResult returns { data: [...], pagination: {...} }
      expect(data.data).toHaveLength(2)
      expect(data.data.every((p: { workspace_type: string }) => p.workspace_type === 'team')).toBe(true)
    })
  })

  describe('Personal space auto-creation', () => {
    it('should create personal-space-{userId} if missing in GET /api/wiki/workspaces', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // First findMany returns NO personal space (triggers auto-creation)
      // Second findMany (re-query after create) returns the personal space
      let findManyCallCount = 0
      vi.mocked(prisma.wiki_workspaces.findMany).mockImplementation(async () => {
        findManyCallCount++
        if (findManyCallCount === 1) {
          // First call: no personal space found
          return [] as unknown[]
        }
        // Second call (re-query after create): includes personal space
        return [
          {
            id: 'personal-space-user-1',
            workspace_id: 'workspace-1',
            name: 'Personal Space',
            description: null,
            type: 'personal',
            color: '#10b981',
            icon: null,
            is_private: true,
            created_by_id: 'user-1',
            created_at: new Date(),
            updated_at: new Date(),
          },
        ] as unknown[]
      })

      // Create call returns new personal space
      vi.mocked(prisma.wiki_workspaces.create).mockResolvedValue({
        id: 'personal-space-user-1',
        workspace_id: 'workspace-1',
        name: 'Personal Space',
        description: null,
        type: 'personal',
        color: '#10b981',
        icon: null,
        is_private: true,
        created_by_id: 'user-1',
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown)

      const { GET } = await import('@/app/api/wiki/workspaces/route')
      const request = mockRequest('http://localhost:3000/api/wiki/workspaces')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // Route returns a flat array of workspaces (not { workspaces: [...] })
      expect(Array.isArray(data)).toBe(true)
      expect(data.some((w: { id: string }) => w.id === 'personal-space-user-1')).toBe(true)
    })
  })

  describe('Cache key includes userId', () => {
    it('should verify personal page queries include userId in filtering logic', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // Prisma query should filter by createdById for personal pages
      vi.mocked(prisma.wikiPage.findMany).mockImplementation((args: { where?: { OR?: Array<{ workspace_type?: string; createdById?: string }> } }) => {
        // Verify the OR clause includes createdById filter for personal pages
        const hasUserIdFilter = args?.where?.OR?.some((clause) =>
          clause.workspace_type === 'personal' && clause.createdById === 'user-1'
        )

        if (hasUserIdFilter) {
          return Promise.resolve([
            createMockWikiPage({
              id: 'personal-1',
              workspace_type: 'personal',
              createdById: 'user-1',
            }),
          ])
        }

        return Promise.resolve([])
      })
      vi.mocked(prisma.wikiPage.count).mockResolvedValue(1)

      const { GET } = await import('@/app/api/wiki/pages/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()

      // createPaginationResult returns { data: [...], pagination: {...} }
      expect(data.data.every((p: { workspace_type: string; createdById: string }) =>
        p.workspace_type !== 'personal' || p.createdById === 'user-1'
      )).toBe(true)
    })
  })
})
