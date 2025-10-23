import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getProjects, POST as createProject } from '@/app/api/projects/route'
import { GET as getTasks, POST as createTask } from '@/app/api/tasks/route'
import { GET as getEpics, POST as createEpic } from '@/app/api/projects/[projectId]/epics/route'

// Mock auth utilities
vi.mock('@/lib/auth/getAuthenticatedUser', () => ({
  getAuthenticatedUser: vi.fn()
}))

vi.mock('@/lib/auth/assertAccess', () => ({
  assertAccess: vi.fn()
}))

vi.mock('@/lib/prisma/scopingMiddleware', () => ({
  setWorkspaceContext: vi.fn()
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
    projectWatcher: {
      createMany: vi.fn()
    },
    projectAssignee: {
      createMany: vi.fn()
    },
    task: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    subtask: {
      createMany: vi.fn()
    },
    epic: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn()
    }
  }
}))

// Mock PM events
vi.mock('@/lib/pm/events', () => ({
  emitProjectEvent: vi.fn()
}))

describe('Phase 1 Migrated Routes - Projects API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when getAuthenticatedUser throws', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    vi.mocked(getAuthenticatedUser).mockRejectedValue(new Error('Unauthorized: No session found'))

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await getProjects(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 200 with proper auth flow', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
    // Mock auth flow
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['MEMBER'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    // Mock Prisma
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.project.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await getProjects(request)
    
    expect(response.status).toBe(200)
    
    // Verify auth flow was called correctly
    expect(getAuthenticatedUser).toHaveBeenCalledWith(request)
    expect(assertAccess).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      scope: 'workspace',
      requireRole: ['MEMBER']
    })
    expect(setWorkspaceContext).toHaveBeenCalledWith('workspace-1')
  })

  it('should return 403 for insufficient permissions', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['VIEWER'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockRejectedValue(new Error('Forbidden: Insufficient workspace permissions'))

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await getProjects(request)
    
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Forbidden')
  })

  it('should create project with proper workspace scoping', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['ADMIN'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.project.create).mockResolvedValue({
      id: 'project-1',
      name: 'Test Project',
      workspaceId: 'workspace-1',
      createdById: 'user-1'
    })
    vi.mocked(prisma.projectMember.create).mockResolvedValue({
      id: 'member-1',
      projectId: 'project-1',
      userId: 'user-1',
      role: 'OWNER'
    })

    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Test project description'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await createProject(request)
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.workspaceId).toBe('workspace-1')
    expect(data.createdById).toBe('user-1')
    
    // Verify project creation used correct workspace
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'workspace-1',
          createdById: 'user-1'
        })
      })
    )
  })

  it('should require ADMIN or OWNER role to create projects', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['MEMBER'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockRejectedValue(new Error('Forbidden: Insufficient workspace permissions'))

    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Test project description'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await createProject(request)
    
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Forbidden')
    
    // Verify assertAccess was called with correct role requirements
    expect(assertAccess).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER']
    })
  })
})

describe('Phase 1 Migrated Routes - Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when getAuthenticatedUser throws', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    vi.mocked(getAuthenticatedUser).mockRejectedValue(new Error('Unauthorized: No session found'))

    const request = new NextRequest('http://localhost:3000/api/tasks?projectId=project-1')
    const response = await getTasks(request)
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 200 with proper auth flow', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['MEMBER'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/tasks?projectId=project-1')
    const response = await getTasks(request)
    
    expect(response.status).toBe(200)
    
    // Verify auth flow was called correctly
    expect(getAuthenticatedUser).toHaveBeenCalledWith(request)
    expect(assertAccess).toHaveBeenCalledTimes(2) // workspace + project access
    expect(setWorkspaceContext).toHaveBeenCalledWith('workspace-1')
  })

  it('should create task with proper workspace scoping', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['MEMBER'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: 'project-1',
      workspaceId: 'workspace-1'
    })
    vi.mocked(prisma.task.create).mockResolvedValue({
      id: 'task-1',
      title: 'Test Task',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      createdById: 'user-1'
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
    expect(data.createdById).toBe('user-1')
    
    // Verify task creation used correct workspace
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'workspace-1',
          createdById: 'user-1'
        })
      })
    )
  })
})

describe('Phase 1 Migrated Routes - Epics API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when getAuthenticatedUser throws', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    vi.mocked(getAuthenticatedUser).mockRejectedValue(new Error('Unauthorized: No session found'))

    const request = new NextRequest('http://localhost:3000/api/projects/project-1/epics')
    const response = await getEpics(request, { params: Promise.resolve({ projectId: 'project-1' }) })
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 200 with proper auth flow', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['MEMBER'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.epic.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/projects/project-1/epics')
    const response = await getEpics(request, { params: Promise.resolve({ projectId: 'project-1' }) })
    
    expect(response.status).toBe(200)
    
    // Verify auth flow was called correctly
    expect(getAuthenticatedUser).toHaveBeenCalledWith(request)
    expect(assertAccess).toHaveBeenCalledTimes(2) // workspace + project access
    expect(setWorkspaceContext).toHaveBeenCalledWith('workspace-1')
  })

  it('should create epic with proper workspace scoping', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['ADMIN'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: 'project-1',
      workspaceId: 'workspace-1'
    })
    vi.mocked(prisma.epic.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.epic.create).mockResolvedValue({
      id: 'epic-1',
      title: 'Test Epic',
      workspaceId: 'workspace-1',
      projectId: 'project-1'
    })

    const request = new NextRequest('http://localhost:3000/api/projects/project-1/epics', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Epic',
        description: 'Test epic description'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await createEpic(request, { params: Promise.resolve({ projectId: 'project-1' }) })
    
    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.workspaceId).toBe('workspace-1')
    expect(data.projectId).toBe('project-1')
    
    // Verify epic creation used correct workspace
    expect(prisma.epic.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'workspace-1'
        })
      })
    )
  })

  it('should require ADMIN or OWNER role to create epics', async () => {
    const { getAuthenticatedUser } = await import('@/lib/auth/getAuthenticatedUser')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      userId: 'user-1',
      activeWorkspaceId: 'workspace-1',
      roles: ['MEMBER'],
      isDev: false,
      email: 'test@example.com',
      name: 'Test User'
    })
    vi.mocked(assertAccess).mockRejectedValue(new Error('Forbidden: Insufficient project permissions'))

    const request = new NextRequest('http://localhost:3000/api/projects/project-1/epics', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Epic',
        description: 'Test epic description'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await createEpic(request, { params: Promise.resolve({ projectId: 'project-1' }) })
    
    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Forbidden')
    
    // Verify assertAccess was called with correct role requirements
    expect(assertAccess).toHaveBeenCalledWith({
      userId: 'user-1',
      workspaceId: 'workspace-1',
      projectId: 'project-1',
      scope: 'project',
      requireRole: ['ADMIN', 'OWNER']
    })
  })
})
