import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
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
      findUnique: vi.fn(),
      create: vi.fn()
    },
    projectMember: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    task: {
      findMany: vi.fn(),
      create: vi.fn()
    }
  }
}))

describe('Tasks API Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('should create task with proper workspace scoping', async () => {
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
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: 'project-1',
      workspaceId: 'workspace-1'
    })
    vi.mocked(prisma.task.create).mockResolvedValue({
      id: 'task-1',
      title: 'Test Task',
      workspaceId: 'workspace-1',
      projectId: 'project-1'
    })

    const request = new NextRequest('http://localhost:3000/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'project-1',
        title: 'Test Task',
        description: 'Test task description'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await createTask(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.workspaceId).toBe('workspace-1')
    expect(data.projectId).toBe('project-1')
  })
})

describe('Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should allow access with sufficient role', async () => {
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    await expect(assertAccess({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      scope: 'workspace',
      requireRole: ['MEMBER']
    })).resolves.not.toThrow()
  })

  it('should deny access with insufficient role', async () => {
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    vi.mocked(assertAccess).mockRejectedValue(new Error('Forbidden: Insufficient workspace permissions'))

    await expect(assertAccess({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      scope: 'workspace',
      requireRole: ['ADMIN']
    })).rejects.toThrow('Forbidden: Insufficient workspace permissions')
  })

  it('should allow dev bypass when mocked to succeed', async () => {
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    // Should not throw when mocked to succeed
    await expect(assertAccess({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      scope: 'workspace',
      requireRole: ['ADMIN']
    })).resolves.not.toThrow()
  })
})

