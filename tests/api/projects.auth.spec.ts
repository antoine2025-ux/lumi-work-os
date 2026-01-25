import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getProjects, POST as createProject } from '@/app/api/projects/route'
import { GET as getTasks, POST as createTask } from '@/app/api/tasks/route'

// Mock unified auth - at the top before any imports that use it
vi.mock('@/lib/unified-auth', () => ({
  getUnifiedAuth: vi.fn().mockResolvedValue({
    user: {
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['MEMBER'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User',
      isFirstTime: false,
    },
    workspaceId: 'workspace-1',
    isAuthenticated: true,
    isDevelopment: false,
  }),
}))

// Mock assertAccess
vi.mock('@/lib/auth/assertAccess', () => ({
  assertAccess: vi.fn().mockResolvedValue(undefined),
}))

// Mock setWorkspaceContext
vi.mock('@/lib/prisma/scopingMiddleware', () => ({
  setWorkspaceContext: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    },
    workspace: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    workspaceMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn()
    },
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn()
    },
    projectMember: {
      create: vi.fn()
    },
    task: {
      findMany: vi.fn(),
      create: vi.fn()
    }
  }
}))

describe('Projects API Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when getUnifiedAuth throws', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    vi.mocked(getUnifiedAuth).mockRejectedValue(new Error('Unauthorized: No session found'))

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await getProjects(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 200 with valid auth', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    vi.mocked(getUnifiedAuth).mockResolvedValue({
      user: {
        userId: 'user-1',
        activeWorkspaceId: 'workspace-1',
        roles: ['MEMBER'],
        isDev: false,
        email: 'test@example.com',
        name: 'Test User',
        isFirstTime: false,
      },
      workspaceId: 'workspace-1',
      isAuthenticated: true,
      isDevelopment: false,
    })

    // Mock Prisma responses
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.project.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await getProjects(request)
    
    expect(response.status).toBe(200)
  })

  it('should return 403 when assertAccess fails', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    
    vi.mocked(getUnifiedAuth).mockResolvedValue({
      user: {
        userId: 'user-1',
        activeWorkspaceId: 'workspace-1',
        roles: ['VIEWER'],
        isDev: false,
        email: 'test@example.com',
        name: 'Test User',
        isFirstTime: false,
      },
      workspaceId: 'workspace-1',
      isAuthenticated: true,
      isDevelopment: false,
    })
    vi.mocked(assertAccess).mockRejectedValue(new Error('Forbidden: Insufficient workspace permissions'))

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await getProjects(request)
    
    expect(response.status).toBe(403)
  })
})

describe('Tasks API Auth', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset assertAccess to default resolved value (may have been set to reject by previous tests)
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    vi.mocked(assertAccess).mockResolvedValue(undefined)
  })

  it('should return 401 when getUnifiedAuth throws', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    vi.mocked(getUnifiedAuth).mockRejectedValue(new Error('Unauthorized: No session found'))

    const request = new NextRequest('http://localhost:3000/api/tasks?projectId=project-1')
    const response = await getTasks(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 200 with valid auth', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    vi.mocked(getUnifiedAuth).mockResolvedValue({
      user: {
        userId: 'user-1',
        activeWorkspaceId: 'workspace-1',
        roles: ['MEMBER'],
        isDev: false,
        email: 'test@example.com',
        name: 'Test User',
        isFirstTime: false,
      },
      workspaceId: 'workspace-1',
      isAuthenticated: true,
      isDevelopment: false,
    })

    // Mock Prisma responses
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/tasks?projectId=project-1')
    const response = await getTasks(request)
    
    expect(response.status).toBe(200)
  })

  it('should return 400 when projectId is missing', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    vi.mocked(getUnifiedAuth).mockResolvedValue({
      user: {
        userId: 'user-1',
        activeWorkspaceId: 'workspace-1',
        roles: ['MEMBER'],
        isDev: false,
        email: 'test@example.com',
        name: 'Test User',
        isFirstTime: false,
      },
      workspaceId: 'workspace-1',
      isAuthenticated: true,
      isDevelopment: false,
    })

    const request = new NextRequest('http://localhost:3000/api/tasks')
    const response = await getTasks(request)
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Missing required parameter: projectId')
  })
})

describe('Auth Utilities', () => {
  it('should return authenticated context with session', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    vi.mocked(getUnifiedAuth).mockResolvedValue({
      user: {
        userId: 'user-1',
        activeWorkspaceId: 'workspace-1',
        roles: ['MEMBER'],
        isDev: false,
        email: 'test@example.com',
        name: 'Test User',
        isFirstTime: false,
      },
      workspaceId: 'workspace-1',
      isAuthenticated: true,
      isDevelopment: false,
    })

    const request = new NextRequest('http://localhost:3000/api/projects')
    const auth = await getUnifiedAuth(request)
    
    expect(auth.user.userId).toBe('user-1')
    expect(auth.workspaceId).toBe('workspace-1')
    expect(auth.user.isDev).toBe(false)
  })

  it('should return dev context when isDev is true', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    vi.mocked(getUnifiedAuth).mockResolvedValue({
      user: {
        userId: 'dev-user-1',
        activeWorkspaceId: 'workspace-1',
        roles: ['OWNER'],
        isDev: true,
        email: 'dev@lumi.com',
        name: 'Dev User',
        isFirstTime: false,
      },
      workspaceId: 'workspace-1',
      isAuthenticated: true,
      isDevelopment: true,
    })

    const request = new NextRequest('http://localhost:3000/api/projects')
    const auth = await getUnifiedAuth(request)
    
    expect(auth.user.userId).toBe('dev-user-1')
    expect(auth.user.isDev).toBe(true)
  })
})

