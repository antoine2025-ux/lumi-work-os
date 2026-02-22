/**
 * Zod Validation Tests
 * 
 * Verify input validation catches malformed data across API routes.
 * Tests Zod schema validation for Goals, Wiki, and Org APIs.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockAuthContext, mockRequest, clearAllTestMocks } from '../helpers/test-utils'

// Mock all dependencies
vi.mock('@/lib/unified-auth')
vi.mock('@/lib/auth/assertAccess')
vi.mock('@/lib/prisma/scopingMiddleware')
vi.mock('@/lib/db', () => ({
  prisma: {
    goal: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    wikiPage: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    activity: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        goal: { create: vi.fn(), findUnique: vi.fn() },
        objective: { create: vi.fn() },
        keyResult: { createMany: vi.fn() },
      }
      return fn(tx)
    }),
  }
}))
vi.mock('@/lib/goals/loopbrain-integration', () => ({
  syncGoalContext: vi.fn().mockResolvedValue(undefined),
}))

describe('Zod Validation', () => {
  beforeEach(async () => {
    clearAllTestMocks()

    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')

    vi.mocked(getUnifiedAuth).mockResolvedValue(
      mockAuthContext({ userId: 'user-1', workspaceId: 'workspace-1' })
    )
    vi.mocked(assertAccess).mockResolvedValue(undefined)
    vi.mocked(setWorkspaceContext).mockReturnValue(undefined)
  })

  describe('Goals validation errors', () => {
    it('should return 400 when title is missing in POST /api/goals', async () => {
      const { POST } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        body: {
          // Missing title
          level: 'COMPANY',
          period: 'QUARTERLY',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when level enum is invalid in POST /api/goals', async () => {
      const { POST } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        body: {
          title: 'Test Goal',
          level: 'INVALID_LEVEL',
          period: 'QUARTERLY',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should return 400 when period enum is invalid in POST /api/goals', async () => {
      const { POST } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        body: {
          title: 'Test Goal',
          level: 'COMPANY',
          period: 'INVALID_PERIOD',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should return 400 when startDate is invalid format', async () => {
      const { POST } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        body: {
          title: 'Test Goal',
          level: 'COMPANY',
          period: 'QUARTERLY',
          startDate: 123,
          endDate: '2024-03-31',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should return 400 when title exceeds max length', async () => {
      const { POST } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        body: {
          title: 'A'.repeat(201), // Exceeds 200 char limit
          level: 'COMPANY',
          period: 'QUARTERLY',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('Wiki validation errors', () => {
    it('should return 400 when title is missing in POST /api/wiki/pages', async () => {
      const { prisma } = await import('@/lib/db')
      vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue(null)

      const { POST } = await import('@/app/api/wiki/pages/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages', {
        method: 'POST',
        body: {
          // Missing title
          content: '<p>Test content</p>',
          slug: 'test-page',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should return 400 when contentFormat is invalid in PUT /api/wiki/pages/[id]', async () => {
      const { prisma } = await import('@/lib/db')
      
      vi.mocked(prisma.wikiPage.findUnique).mockResolvedValue({
        id: 'wiki-1',
        workspaceId: 'workspace-1',
        title: 'Test Page',
        slug: 'test-page',
        content: '<p>Test</p>',
        contentJson: null,
        contentFormat: 'HTML',
        textContent: 'Test',
        excerpt: null,
        parentId: null,
        order: 0,
        isPublished: true,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-1',
        permissionLevel: 'team',
        category: 'general',
        view_count: 0,
        is_featured: false,
        workspace_type: 'team',
        last_viewed_at: null,
        ai_analysis: null,
        quality_score: null,
      })

      const { PUT } = await import('@/app/api/wiki/pages/[id]/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages/wiki-1', {
        method: 'PUT',
        body: {
          title: 'Updated Title',
          contentFormat: 'XML', // Invalid enum
        },
      })
      const response = await PUT(request, { params: { id: 'wiki-1' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('Org validation errors', () => {
    it('should return 400 when email is invalid in POST /api/org/people/create', async () => {
      const { POST } = await import('@/app/api/org/people/create/route')
      const request = mockRequest('http://localhost:3000/api/org/people/create', {
        method: 'POST',
        body: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'not-an-email', // Invalid email format
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should return 400 when required fields are missing', async () => {
      const { POST } = await import('@/app/api/org/people/create/route')
      const request = mockRequest('http://localhost:3000/api/org/people/create', {
        method: 'POST',
        body: {
          // Missing firstName, lastName, email
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })
  })

  describe('Valid requests pass validation', () => {
    it('should return 201 for valid POST /api/goals', async () => {
      const { prisma } = await import('@/lib/db')

      const goalData = {
        id: 'goal-1',
        workspaceId: 'workspace-1',
        title: 'Test Goal',
        description: 'Test description',
        level: 'COMPANY',
        ownerId: 'user-1',
        parentId: null,
        period: 'QUARTERLY',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        quarter: '2024-Q1',
        status: 'DRAFT',
        progress: 0,
        alignmentScore: 0,
        performanceWeight: 1.0,
        reviewCycle: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-1',
        owner: { id: 'user-1', name: 'Test User' },
        objectives: [],
      }

      vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: unknown) => unknown) => {
        const tx = {
          goal: {
            create: vi.fn().mockResolvedValue(goalData),
            findUnique: vi.fn().mockResolvedValue(goalData),
          },
          objective: { create: vi.fn() },
          keyResult: { createMany: vi.fn() },
        }
        return fn(tx)
      })

      const { POST } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        body: {
          title: 'Test Goal',
          description: 'Test description',
          level: 'COMPANY',
          period: 'QUARTERLY',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          quarter: '2024-Q1',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('Zod error format', () => {
    it('should return error with validation details', async () => {
      const { POST } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        body: {
          // Multiple validation errors
          title: '', // Empty string
          level: 'INVALID',
          period: 'INVALID',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      
      // Verify error structure
      expect(data.error).toBeDefined()
      expect(typeof data.error).toBe('object')
      expect(data.error.code).toBeDefined()
    })
  })
})
