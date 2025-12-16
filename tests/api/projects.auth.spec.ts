import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getProjects, POST as createProject } from '@/app/api/projects/route'
import { GET as getTasks, POST as createTask } from '@/app/api/tasks/route'
import { getAuthenticatedUser } from '@/lib/auth/getAuthenticatedUser'
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

  it('should return 401 when no session and ALLOW_DEV_LOGIN=false', async () => {
    // Mock environment
    process.env.ALLOW_DEV_LOGIN = 'false'
    
    // Mock no session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await getProjects(request)
    
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
    vi.mocked(prisma.project.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/projects?workspaceId=workspace-1')
    const response = await getProjects(request)
    
    expect(response.status).toBe(200)
  })

  it('should return 403 for mismatched workspace', async () => {
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
    vi.mocked(prisma.workspace.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.workspace.create).mockResolvedValue({
      id: 'workspace-1',
      name: 'Test Workspace',
      slug: 'test-workspace'
    })

    const request = new NextRequest('http://localhost:3000/api/projects?workspaceId=workspace-1')
    const response = await getProjects(request)
    
    expect(response.status).toBe(200)
  })
})

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
})

describe('Auth Utilities', () => {
  it('should get authenticated user with session', async () => {
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
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      workspaceId: 'workspace-1',
      role: 'OWNER'
    })

    const request = new NextRequest('http://localhost:3000/api/projects?workspaceId=workspace-1')
    const user = await getAuthenticatedUser(request)
    
    expect(user.userId).toBe('user-1')
    expect(user.activeWorkspaceId).toBe('workspace-1')
    expect(user.isDev).toBe(false)
  })

  it('should get dev user when no session and dev login allowed', async () => {
    // Mock no session
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValue(null)

    // Mock Prisma responses
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: 'dev-user-1',
      email: 'dev@lumi.com',
      name: 'Dev User'
    })
    vi.mocked(prisma.workspaceMember.findFirst).mockResolvedValue({
      workspaceId: 'workspace-1',
      role: 'OWNER'
    })
    vi.mocked(prisma.workspaceMember.upsert).mockResolvedValue({
      userId: 'dev-user-1',
      workspaceId: 'workspace-1',
      role: 'OWNER'
    })

    const request = new NextRequest('http://localhost:3000/api/projects')
    const user = await getAuthenticatedUser(request)
    
    expect(user.userId).toBe('dev-user-1')
    expect(user.isDev).toBe(true)
  })
})

