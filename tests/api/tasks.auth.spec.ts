import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getTasks, POST as createTask } from '@/app/api/tasks/route'
import { assertAccess } from '@/lib/auth/assertAccess'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn()
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

  it('should return 401 without session when ALLOW_DEV_LOGIN=false', async () => {
    // Mock environment
    process.env.ALLOW_DEV_LOGIN = 'false'
    
    // Mock no session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/tasks?projectId=project-1')
    const response = await getTasks(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 200 with session', async () => {
    // Mock session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    // Mock Prisma responses
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
      id: 'workspace-1',
      name: 'Test Workspace',
      slug: 'test-workspace'
    })
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/tasks?projectId=project-1&workspaceId=workspace-1')
    const response = await getTasks(request)
    
    expect(response.status).toBe(200)
  })

  it('should return 400 when projectId is missing', async () => {
    // Mock session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    const request = new NextRequest('http://localhost:3000/api/tasks')
    const response = await getTasks(request)
    
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Missing required parameter: projectId')
  })

  it('should create task with proper workspace scoping', async () => {
    // Mock session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue({
      user: {
        email: 'test@example.com',
        name: 'Test User'
      }
    })

    // Mock Prisma responses
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue({
      id: 'workspace-1',
      name: 'Test Workspace',
      slug: 'test-workspace'
    })
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
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      role: 'ADMIN'
    })

    await expect(assertAccess({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      scope: 'workspace',
      requireRole: ['MEMBER']
    })).resolves.not.toThrow()
  })

  it('should deny access with insufficient role', async () => {
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      workspaceId: 'workspace-1',
      role: 'VIEWER'
    })

    await expect(assertAccess({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      scope: 'workspace',
      requireRole: ['ADMIN']
    })).rejects.toThrow('Forbidden: Insufficient workspace permissions')
  })

  it('should allow dev bypass in development', async () => {
    process.env.ALLOW_DEV_LOGIN = 'true'
    process.env.NODE_ENV = 'development'
    process.env.PROD_LOCK = 'false'

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.workspaceMember.findUnique).mockResolvedValue(null)

    // Should not throw due to dev bypass
    await expect(assertAccess({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      scope: 'workspace',
      requireRole: ['ADMIN']
    })).resolves.not.toThrow()
  })
})

