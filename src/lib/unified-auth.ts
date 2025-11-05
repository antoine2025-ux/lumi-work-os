import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createDefaultWorkspaceForUser } from '@/lib/workspace-onboarding'

export interface UnifiedAuthUser {
  userId: string
  activeWorkspaceId: string
  roles: string[]
  isDev: boolean
  email: string
  name?: string
  isFirstTime: boolean
}

export interface AuthContext {
  user: UnifiedAuthUser
  workspaceId: string
  isAuthenticated: boolean
  isDevelopment: boolean
}

/**
 * Unified authentication system that handles both development and production
 * Consolidates all authentication logic into a single, consistent interface
 */
export async function getUnifiedAuth(request?: NextRequest): Promise<AuthContext> {
  // In App Router, getServerSession should work automatically
  // But for API routes, we need to handle it differently
  let session
  try {
    if (request) {
      // For API routes, extract cookies from request and pass to getServerSession
      const cookieHeader = request.headers.get('cookie') || ''
      
      // Create a request object that getServerSession can use
      const req = {
        headers: {
          cookie: cookieHeader,
          get: (name: string) => request.headers.get(name),
        },
        cookies: {
          get: (name: string) => {
            const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
            return match ? { value: decodeURIComponent(match[1]) } : null
          },
          getAll: () => {
            return cookieHeader.split('; ').map(cookie => {
              const [name, ...values] = cookie.split('=')
              return { name, value: decodeURIComponent(values.join('=')) }
            })
          },
        },
      } as any

      session = await getServerSession(authOptions)
    } else {
      // For server components, use getServerSession directly
      session = await getServerSession(authOptions)
    }
  } catch (error) {
    console.error('Error getting session:', error)
    session = null
  }
  // Require authentication - no dev bypasses
  // All users must authenticate through Google OAuth
  if (!session?.user?.email) {
    throw new Error('Unauthorized: No session found. Please log in through Google OAuth.')
  }

  // Get or create user from session
  let user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: session.user.email,
        name: session.user.name || 'Unknown User',
        emailVerified: new Date()
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
  const isFirstTime = !workspaceMember

  return {
    user: {
      userId: user.id,
      activeWorkspaceId,
      roles,
      isDev: false,
      email: user.email,
      name: user.name || undefined,
      isFirstTime
    },
    workspaceId: activeWorkspaceId,
    isAuthenticated: true,
    isDevelopment: false
  }
}

/**
 * Resolve active workspace ID with priority:
 * 1. URL params: workspaceId or projectId → map to workspace
 * 2. x-workspace-id header
 * 3. user's default workspace
 * 4. Create default workspace if none exists
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
      // Validate workspace access
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            userId,
            workspaceId
          }
        }
      })
      if (member) {
        return workspaceId
      }
    }

    const projectId = url.searchParams.get('projectId')
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true }
      })
      if (project) {
        // Validate workspace access
        const member = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              userId,
              workspaceId: project.workspaceId
            }
          }
        })
        if (member) {
          return project.workspaceId
        }
      }
    }
  }

  // Priority 2: Header
  if (request) {
    const headerWorkspaceId = request.headers.get('x-workspace-id')
    if (headerWorkspaceId) {
      // Validate workspace access
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            userId,
            workspaceId: headerWorkspaceId
          }
        }
      })
      if (member) {
        return headerWorkspaceId
      }
    }
  }

  // Priority 3: User's default workspace
  // Get all memberships and find the first one with an existing workspace
  const userMemberships = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    include: {
      workspace: {
        select: { id: true } // Verify workspace still exists
      }
    }
  })

  // Find first membership with existing workspace
  const validMembership = userMemberships.find(m => m.workspace !== null)
  
  if (validMembership) {
    return validMembership.workspaceId
  }

  // No workspace found - user needs to create one
  // Don't auto-create workspace, let the frontend handle this
  throw new Error('No workspace found - user needs to create a workspace')
}

/**
 * Middleware helper for API routes with unified auth
 */
export async function withUnifiedAuth<T>(
  handler: (auth: AuthContext) => Promise<T>
): Promise<T> {
  const auth = await getUnifiedAuth()
  return handler(auth)
}

/**
 * Middleware helper for API routes that need request context
 */
export async function withUnifiedAuthRequest<T>(
  request: NextRequest,
  handler: (auth: AuthContext, request: NextRequest) => Promise<T>
): Promise<T> {
  const auth = await getUnifiedAuth(request)
  return handler(auth, request)
}

/**
 * Validate workspace access for a user
 */
export async function validateWorkspaceAccess(
  userId: string, 
  workspaceId: string
): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        userId,
        workspaceId
      }
    }
  })
  
  return !!member
}

/**
 * Get user's role in a workspace
 */
export async function getUserWorkspaceRole(
  userId: string, 
  workspaceId: string
): Promise<string | null> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        userId,
        workspaceId
      }
    },
    select: { role: true }
  })
  
  return member?.role || null
}
