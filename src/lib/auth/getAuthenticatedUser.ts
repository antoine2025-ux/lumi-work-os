import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'
import { createDefaultWorkspaceForUser } from '@/lib/workspace-onboarding'

export interface AuthenticatedUser {
  userId: string
  activeWorkspaceId: string
  roles: string[]
  isDev: boolean
  email: string
  name?: string
}

/**
 * Get authenticated user with workspace context
 * Handles dev bypasses when ALLOW_DEV_LOGIN=true and NODE_ENV=development
 */
export async function getAuthenticatedUser(
  request?: NextRequest
): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions)
  const allowDevLogin = process.env.ALLOW_DEV_LOGIN === 'true'
  const prodLock = process.env.PROD_LOCK === 'true'
  const isDevelopment = process.env.NODE_ENV === 'development'

  // If no session and dev login is allowed in development
  if (!session?.user?.email && allowDevLogin && isDevelopment && !prodLock) {
    return await getDevUser(request)
  }

  // Production or session-based auth
  if (!session?.user?.email) {
    throw new Error('Unauthorized: No session found')
  }

  if (prodLock && !session?.user?.email) {
    throw new Error('Unauthorized: Production lock enabled')
  }

  // Get or create user from session
  let user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: session.user.email,
        name: session.user.name || 'Unknown User'
      }
    })
  }

  // Resolve active workspace
  const activeWorkspaceId = await resolveActiveWorkspaceId(user.id, request)

  // Get user roles for the workspace
  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        userId: user.id,
        workspaceId: activeWorkspaceId
      }
    }
  })

  const roles = workspaceMember ? [workspaceMember.role] : []

  return {
    userId: user.id,
    activeWorkspaceId,
    roles,
    isDev: false,
    email: user.email,
    name: user.name || undefined
  }
}

/**
 * Get development user with dev workspace
 */
async function getDevUser(request?: NextRequest): Promise<AuthenticatedUser> {
  // Create or find dev user
  const devUser = await prisma.user.upsert({
    where: { email: 'dev@lumi.com' },
    update: {},
    create: {
      email: 'dev@lumi.com',
      name: 'Dev User'
    }
  })

  // Resolve active workspace
  const activeWorkspaceId = await resolveActiveWorkspaceId(devUser.id, request)

  // Ensure dev user is workspace owner
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        userId: devUser.id,
        workspaceId: activeWorkspaceId
      }
    },
    update: { role: 'OWNER' },
    create: {
      userId: devUser.id,
      workspaceId: activeWorkspaceId,
      role: 'OWNER'
    }
  })

  return {
    userId: devUser.id,
    activeWorkspaceId,
    roles: ['OWNER'],
    isDev: true,
    email: devUser.email,
    name: devUser.name || undefined
  }
}

/**
 * Resolve active workspace ID with priority:
 * 1. URL params: workspaceId or projectId → map to workspace
 * 2. x-workspace-id header
 * 3. user's default workspace
 */
async function resolveActiveWorkspaceId(
  userId: string, 
  request?: NextRequest
): Promise<string> {
  // Priority 1: URL params
  if (request) {
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspaceId')
    if (workspaceId) {
      return workspaceId
    }

    const projectId = url.searchParams.get('projectId')
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true }
      })
      if (project) {
        return project.workspaceId
      }
    }
  }

  // Priority 2: Header
  if (request) {
    const headerWorkspaceId = request.headers.get('x-workspace-id')
    if (headerWorkspaceId) {
      return headerWorkspaceId
    }
  }

  // Priority 3: User's default workspace
  const userWorkspace = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    select: { workspaceId: true }
  })

  if (userWorkspace) {
    return userWorkspace.workspaceId
  }

  // Fallback: Create default workspace for user
  return await createDefaultWorkspaceForUser(userId)
}

/**
 * Check if current context allows dev bypasses
 */
export function isDevBypassAllowed(): boolean {
  const allowDevLogin = process.env.ALLOW_DEV_LOGIN === 'true'
  const prodLock = process.env.PROD_LOCK === 'true'
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return allowDevLogin && isDevelopment && !prodLock
}

/**
 * Assert that dev bypass is allowed, throw if not
 */
export function assertDevBypassAllowed(): void {
  if (!isDevBypassAllowed()) {
    throw new Error('Unauthorized: Dev bypass not allowed in this environment')
  }
}
