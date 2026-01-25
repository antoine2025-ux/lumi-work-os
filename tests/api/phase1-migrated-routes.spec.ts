import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getProjects, POST as createProject } from '@/app/api/projects/route'
import { GET as getTasks, POST as createTask } from '@/app/api/tasks/route'
import { GET as getEpics, POST as createEpic } from '@/app/api/projects/[projectId]/epics/route'

// Mock unified auth - returns proper AuthContext shape
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

vi.mock('@/lib/auth/assertAccess', () => ({
  assertAccess: vi.fn()
}))

vi.mock('@/lib/prisma/scopingMiddleware', () => ({
  setWorkspaceContext: vi.fn()
}))

// ============================================================================
// HELPER MODULE MOCKS
// ============================================================================
// WHY: These helpers internally call prisma.projectSpace.findFirst/create and
// prisma.space.findFirst/create. Mocking them avoids reproducing deep Prisma
// internals and keeps tests focused on route behavior.
//
// Return shape: string IDs matching what the route expects downstream.
// ============================================================================
vi.mock('@/lib/pm/project-space-helpers', () => ({
  getOrCreateGeneralProjectSpace: vi.fn().mockResolvedValue('general-space-1'),
  createPrivateProjectSpace: vi.fn().mockResolvedValue('private-space-1'),
}))

vi.mock('@/lib/spaces/canonical-space-helpers', () => ({
  getOrCreateTeamSpace: vi.fn().mockResolvedValue('team-space-1'),
  getOrCreatePersonalSpace: vi.fn().mockResolvedValue('personal-space-1'),
}))

// ============================================================================
// PRISMA MOCK BASELINE
// ============================================================================
// WHY: The projects route uses prisma.$transaction(async (tx) => ...) which
// requires passing a transaction-scoped `tx` object to the callback and
// returning the callback's result.
//
// VITEST HOISTING CONSTRAINT: vi.mock() factories are hoisted to the top of
// the file. Any data referenced inside must be defined WITHIN the factory
// (not as external variables). This is why mockProject is defined inline.
//
// TX MODELS REQUIRED: tx.project.{create, findUnique}, tx.projectMember.create
// ============================================================================
vi.mock('@/lib/db', () => {
  // Inline mock data - MUST be inside factory due to Vitest hoisting
  const mockProject = {
    id: 'project-1',
    name: 'Test Project',
    description: 'Test project description',
    workspaceId: 'workspace-1',
    createdById: 'user-1',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    projectSpaceId: 'general-space-1',
    spaceId: 'team-space-1',
    createdBy: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    members: [{ user: { id: 'user-1', name: 'Test User', email: 'test@example.com' }, role: 'OWNER' }],
    _count: { tasks: 0 }
  }

  // Transaction-scoped mocks
  const txProject = {
    create: vi.fn().mockResolvedValue(mockProject),
    findUnique: vi.fn().mockResolvedValue(mockProject),
  }
  const txProjectMember = {
    create: vi.fn().mockResolvedValue({ id: 'member-1', projectId: 'project-1', userId: 'user-1', role: 'OWNER' }),
  }

  return {
    prisma: {
      // $transaction executes callback with tx object and returns result
      $transaction: vi.fn(async <T>(
        fn: (tx: typeof prisma) => T | Promise<T>
      ): Promise<T> => {
        return await fn({ project: txProject, projectMember: txProjectMember } as typeof prisma)
      }),
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
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue(mockProject),
        findUnique: vi.fn().mockResolvedValue(mockProject)
      },
      projectMember: {
        create: vi.fn().mockResolvedValue({ id: 'member-1', projectId: 'project-1', userId: 'user-1', role: 'OWNER' })
      },
      projectWatcher: {
        createMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      projectAssignee: {
        createMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      projectSpace: {
        findFirst: vi.fn().mockResolvedValue({ id: 'general-space-1', name: 'General', workspaceId: 'workspace-1', visibility: 'PUBLIC' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'general-space-1', workspaceId: 'workspace-1' }),
        create: vi.fn()
      },
      space: {
        findFirst: vi.fn().mockResolvedValue(null), // No mapped space by default, falls back to team space
        create: vi.fn()
      },
      task: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn()
      },
      subtask: {
        createMany: vi.fn().mockResolvedValue({ count: 0 })
      },
      epic: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn()
      }
    }
  }
})

// Mock PM events
vi.mock('@/lib/pm/events', () => ({
  emitProjectEvent: vi.fn()
}))

describe('Phase 1 Migrated Routes - Projects API', () => {
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

  it('should return 200 with proper auth flow', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
    // Mock auth flow - return AuthContext shape
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
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    // Mock Prisma
    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.project.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/projects')
    const response = await getProjects(request)
    
    expect(response.status).toBe(200)
    
    // Verify auth flow was called correctly
    expect(getUnifiedAuth).toHaveBeenCalledWith(request)
    expect(assertAccess).toHaveBeenCalled()
    expect(setWorkspaceContext).toHaveBeenCalledWith('workspace-1')
  })

  it('should return 403 for insufficient permissions', async () => {
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
    const data = await response.json()
    expect(data.error).toBe('Forbidden')
  })

  it('should create project with proper workspace scoping', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    
    vi.mocked(getUnifiedAuth).mockResolvedValue({
      user: {
        userId: 'user-1',
        activeWorkspaceId: 'workspace-1',
        roles: ['ADMIN'],
        isDev: false,
        email: 'test@example.com',
        name: 'Test User',
        isFirstTime: false,
      },
      workspaceId: 'workspace-1',
      isAuthenticated: true,
      isDevelopment: false,
    })
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    // Helpers and $transaction are mocked in baseline - no additional mocking needed

    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Test project description',
        workspaceId: 'workspace-1'
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
    
    // Baseline completeness check: verify transaction was used for atomic project creation
    // This confirms our $transaction mock is correctly executing the callback
    const { prisma } = await import('@/lib/db')
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('should require ADMIN or OWNER role to create projects', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    
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
    vi.mocked(assertAccess).mockRejectedValue(new Error('Forbidden: Insufficient workspace permissions'))

    const request = new NextRequest('http://localhost:3000/api/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Test project description',
        workspaceId: 'workspace-1'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await createProject(request)
    
    expect(response.status).toBe(403)
    const data = await response.json()
    // API returns structured error format
    expect(data.error).toMatchObject({
      code: 'AUTHORIZATION_DENIED',
      message: expect.any(String)
    })
    
    // Verify assertAccess was called
    expect(assertAccess).toHaveBeenCalled()
  })
})

describe('Phase 1 Migrated Routes - Tasks API', () => {
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

  it('should return 200 with proper auth flow', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
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
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.task.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/tasks?projectId=project-1')
    const response = await getTasks(request)
    
    expect(response.status).toBe(200)
    
    // Verify auth flow was called correctly
    expect(getUnifiedAuth).toHaveBeenCalledWith(request)
    expect(assertAccess).toHaveBeenCalledTimes(2) // workspace + project access
    expect(setWorkspaceContext).toHaveBeenCalledWith('workspace-1')
  })

  it('should create task with proper workspace scoping', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
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

  it('should return 401 when getUnifiedAuth throws', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    vi.mocked(getUnifiedAuth).mockRejectedValue(new Error('Unauthorized: No session found'))

    const request = new NextRequest('http://localhost:3000/api/projects/project-1/epics')
    const response = await getEpics(request, { params: Promise.resolve({ projectId: 'project-1' }) })
    
    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 200 with proper auth flow', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
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
    vi.mocked(assertAccess).mockResolvedValue(undefined)

    const { prisma } = await import('@/lib/db')
    vi.mocked(prisma.epic.findMany).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/projects/project-1/epics')
    const response = await getEpics(request, { params: Promise.resolve({ projectId: 'project-1' }) })
    
    expect(response.status).toBe(200)
    
    // Verify auth flow was called correctly
    expect(getUnifiedAuth).toHaveBeenCalledWith(request)
    expect(assertAccess).toHaveBeenCalledTimes(2) // workspace + project access
    expect(setWorkspaceContext).toHaveBeenCalledWith('workspace-1')
  })

  it('should create epic with proper workspace scoping', async () => {
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    const { setWorkspaceContext } = await import('@/lib/prisma/scopingMiddleware')
    
    vi.mocked(getUnifiedAuth).mockResolvedValue({
      user: {
        userId: 'user-1',
        activeWorkspaceId: 'workspace-1',
        roles: ['ADMIN'],
        isDev: false,
        email: 'test@example.com',
        name: 'Test User',
        isFirstTime: false,
      },
      workspaceId: 'workspace-1',
      isAuthenticated: true,
      isDevelopment: false,
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
    const { getUnifiedAuth } = await import('@/lib/unified-auth')
    const { assertAccess } = await import('@/lib/auth/assertAccess')
    
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
    
    // Verify assertAccess was called
    expect(assertAccess).toHaveBeenCalled()
  })
})

