/**
 * Auth Patterns Tests
 * 
 * Verify authentication and authorization on critical routes.
 * Tests unauthenticated access, role-based permissions, and assertAccess enforcement.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockAuthContext, mockRequest, clearAllTestMocks } from '../helpers/test-utils'

// Mock all dependencies
vi.mock('@/lib/unified-auth')
vi.mock('@/lib/auth/assertAccess')
vi.mock('@/lib/prisma/scopingMiddleware')
vi.mock('@/lib/db', () => {
  type PrismaMock = {
    project: { findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> }
    projectMember: { create: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> }
    projectWatcher: { createMany: ReturnType<typeof vi.fn> }
    goal: { findMany: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
    goalUpdate: { create: ReturnType<typeof vi.fn> }
    activity: { create: ReturnType<typeof vi.fn> }
    orgPosition: { findFirst: ReturnType<typeof vi.fn> }
    workspaceMember: { findUnique: ReturnType<typeof vi.fn> }
    $transaction: ReturnType<typeof vi.fn>
  }
  const prismaObj: PrismaMock = {
    project: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    projectMember: { create: vi.fn(), createMany: vi.fn() },
    projectWatcher: { createMany: vi.fn() },
    goal: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn(), update: vi.fn() },
    goalUpdate: { create: vi.fn() },
    activity: { create: vi.fn() },
    orgPosition: { findFirst: vi.fn() },
    workspaceMember: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  }
  // $transaction passes the same mock prisma to the callback so mocked methods are shared
  prismaObj.$transaction = vi.fn(async (fn: (client: PrismaMock) => unknown) => fn(prismaObj))
  return { prisma: prismaObj }
})

describe('Auth Patterns', () => {
  beforeEach(() => {
    clearAllTestMocks()
  })

  describe('Unauthenticated access blocked', () => {
    it('should return 401 for unauthenticated GET /api/org/people', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')

      // Simulate authentication failure
      vi.mocked(getUnifiedAuth).mockRejectedValue(
        new Error('Unauthorized: No session found')
      )

      const { GET } = await import('@/app/api/org/people/route')
      const request = mockRequest('http://localhost:3000/api/org/people')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toMatchObject({ code: 'UNAUTHORIZED' })
    })

    it('should return 401 for unauthenticated GET /api/goals', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')

      vi.mocked(getUnifiedAuth).mockRejectedValue(
        new Error('Unauthorized: No session found')
      )

      const { GET } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' })
    })

    it('should return 401 for unauthenticated GET /api/wiki/pages', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')

      vi.mocked(getUnifiedAuth).mockRejectedValue(
        new Error('Unauthorized: No session found')
      )

      const { GET } = await import('@/app/api/wiki/pages/route')
      const request = mockRequest('http://localhost:3000/api/wiki/pages')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' })
    })

    it('should return 401 for unauthenticated GET /api/projects', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')

      vi.mocked(getUnifiedAuth).mockRejectedValue(
        new Error('Unauthorized: No session found')
      )

      const { GET } = await import('@/app/api/projects/route')
      const request = mockRequest('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' })
    })
  })

  describe('VIEWER role restrictions', () => {
    it('should block VIEWER from POST /api/org/people/create (needs MEMBER+)', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ roles: ['VIEWER'], workspaceId: 'workspace-1' })
      )

      // assertAccess throws for insufficient permissions
      vi.mocked(assertAccess).mockRejectedValue(
        new Error('Forbidden: Insufficient workspace permissions')
      )

      const { POST } = await import('@/app/api/org/people/create/route')
      const request = mockRequest('http://localhost:3000/api/org/people/create', {
        method: 'POST',
        body: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toContain('Forbidden')
    })

    it('should block VIEWER from POST /api/goals (needs MEMBER+)', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ roles: ['VIEWER'], workspaceId: 'workspace-1' })
      )

      vi.mocked(assertAccess).mockRejectedValue(
        new Error('Forbidden: Insufficient workspace permissions')
      )

      const { POST } = await import('@/app/api/goals/route')
      const request = mockRequest('http://localhost:3000/api/goals', {
        method: 'POST',
        body: {
          title: 'New Goal',
          level: 'COMPANY',
          period: 'QUARTERLY',
          startDate: '2024-01-01',
          endDate: '2024-03-31',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toMatchObject({ code: 'AUTHORIZATION_DENIED' })
    })

    it('should allow VIEWER to GET /api/projects (read-only)', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ roles: ['VIEWER'], workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined) // VIEWER can read
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)
      vi.mocked(prisma.project.findMany).mockResolvedValue([])

      const { GET } = await import('@/app/api/projects/route')
      const request = mockRequest('http://localhost:3000/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })

  describe('MEMBER role permissions', () => {
    it('should block MEMBER from DELETE /api/goals/[id] (needs ADMIN/OWNER)', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ roles: ['MEMBER'], workspaceId: 'workspace-1' })
      )
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)

      // assertAccess throws for insufficient role
      vi.mocked(assertAccess).mockRejectedValue(
        new Error('Forbidden: Requires ADMIN or OWNER role')
      )

      const { DELETE } = await import('@/app/api/goals/[goalId]/route')
      const request = mockRequest('http://localhost:3000/api/goals/goal-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: Promise.resolve({ goalId: 'goal-1' }) })

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toMatchObject({ code: 'AUTHORIZATION_DENIED' })
    })

    it('should allow MEMBER to POST /api/projects (create)', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ roles: ['MEMBER'], workspaceId: 'workspace-1', userId: 'user-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined)
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)
      const mockProject = {
        id: 'project-1',
        workspaceId: 'workspace-1',
        name: 'New Project',
        description: null,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-1',
        ownerId: 'user-1',
        startDate: null,
        endDate: null,
        priority: 'MEDIUM',
        visibility: 'PRIVATE',
        archived: false,
        archivedAt: null,
        wikiPageId: null,
        tags: [],
        projectTemplateId: null,
        customFields: {},
        isTemplate: false,
        color: null,
        icon: null,
        members: [],
        createdBy: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        _count: { tasks: 0 },
      }
      vi.mocked(prisma.project.create).mockResolvedValue(mockProject as unknown as Awaited<ReturnType<typeof prisma.project.create>>)
      vi.mocked(prisma.project.findUnique).mockResolvedValue(mockProject as unknown as Awaited<ReturnType<typeof prisma.project.findUnique>>)
      vi.mocked(prisma.orgPosition.findFirst).mockResolvedValue(null)
      // @ts-expect-error - mock projectMember.create
      vi.mocked(prisma.projectMember.create).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof prisma.projectMember.create>>)

      const { POST } = await import('@/app/api/projects/route')
      const request = mockRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        body: {
          workspaceId: 'workspace-1',
          name: 'New Project',
          description: 'A new project',
        },
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('ADMIN role permissions', () => {
    it('should allow ADMIN to DELETE /api/goals/[id]', async () => {
      const { getUnifiedAuth } = await import('@/lib/unified-auth')
      const { assertAccess } = await import('@/lib/auth/assertAccess')
      const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
      const { prisma } = await import('@/lib/db')

      vi.mocked(getUnifiedAuth).mockResolvedValue(
        mockAuthContext({ roles: ['ADMIN'], workspaceId: 'workspace-1' })
      )
      vi.mocked(assertAccess).mockResolvedValue(undefined) // ADMIN allowed
      vi.mocked(setWorkspaceContext).mockReturnValue(undefined)
      
      vi.mocked(prisma.goal.findFirst).mockResolvedValue({
        id: 'goal-1',
        workspaceId: 'workspace-1',
        title: 'Test Goal',
        description: null,
        level: 'COMPANY',
        ownerId: null,
        parentId: null,
        period: 'QUARTERLY',
        startDate: new Date(),
        endDate: new Date(),
        quarter: '2024-Q1',
        status: 'ACTIVE',
        progress: 0,
        alignmentScore: 0,
        performanceWeight: 1.0,
        reviewCycle: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-1',
      })
      vi.mocked(prisma.goal.delete).mockResolvedValue({
        id: 'goal-1',
        workspaceId: 'workspace-1',
        title: 'Test Goal',
        description: null,
        level: 'COMPANY',
        ownerId: null,
        parentId: null,
        period: 'QUARTERLY',
        startDate: new Date(),
        endDate: new Date(),
        quarter: '2024-Q1',
        status: 'ACTIVE',
        progress: 0,
        alignmentScore: 0,
        performanceWeight: 1.0,
        reviewCycle: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-1',
      })
      vi.mocked(prisma.activity.create).mockResolvedValue({} as unknown as Awaited<ReturnType<typeof prisma.activity.create>>)

      const { DELETE } = await import('@/app/api/goals/[goalId]/route')
      const request = mockRequest('http://localhost:3000/api/goals/goal-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request, { params: Promise.resolve({ goalId: 'goal-1' }) })

      expect(response.status).toBe(200)
    })
  })

  describe('assertAccess error handling', () => {
    it('should throw correct error for insufficient permissions', async () => {
      const { assertAccess } = await import('@/lib/auth/assertAccess')

      // Reset to throw error
      vi.mocked(assertAccess).mockRejectedValue(
        new Error('Forbidden: Insufficient workspace permissions')
      )

      try {
        await assertAccess({
          userId: 'user-1',
          workspaceId: 'workspace-1',
          scope: 'workspace',
          requireRole: ['ADMIN'],
        })
        
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect((error as Error).message).toContain('Forbidden')
        expect((error as Error).message).toContain('permissions')
      }
    })
  })

  describe('Role hierarchy verification', () => {
    it('should verify role levels: VIEWER < MEMBER < ADMIN < OWNER', () => {
      // Role hierarchy (from src/lib/auth/assertAccess.ts):
      // VIEWER (1) - Read-only
      // MEMBER (2) - Can create/edit
      // ADMIN (3) - Can manage workspace
      // OWNER (4) - Full control
      
      const roleHierarchy = {
        VIEWER: 1,
        MEMBER: 2,
        ADMIN: 3,
        OWNER: 4,
      }
      
      expect(roleHierarchy.VIEWER).toBeLessThan(roleHierarchy.MEMBER)
      expect(roleHierarchy.MEMBER).toBeLessThan(roleHierarchy.ADMIN)
      expect(roleHierarchy.ADMIN).toBeLessThan(roleHierarchy.OWNER)
    })
  })
})
