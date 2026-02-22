import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { prisma } from '@/lib/db'
import { getCachedAuth, setCachedAuth } from '@/lib/auth-cache'
import { logger } from '@/lib/logger'

// PHASE 1: Standard select for WorkspaceMember queries (excludes employmentStatus that may not exist in DB)
const WORKSPACE_MEMBER_SELECT = {
  id: true,
  workspaceId: true,
  userId: true,
  role: true,
  joinedAt: true,
  // Exclude employmentStatus, employmentStartDate, employmentEndDate - may not exist in database yet
  // Exclude customRoleId and customRole relation - they may not exist in database yet
} as const

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
 * Custom error class for "no workspace found" case
 * Allows callers to check error type instead of message string
 */
export class NoWorkspaceError extends Error {
  constructor(message: string = 'No workspace found - user needs to create a workspace') {
    super(message)
    this.name = 'NoWorkspaceError'
  }
}

/**
 * Unified authentication system that handles both development and production
 * Consolidates all authentication logic into a single, consistent interface
 * 
 * OPTIMIZED: Uses request-level caching to avoid duplicate auth queries
 */
export async function getUnifiedAuth(request?: NextRequest): Promise<AuthContext> {
  const startTime = performance.now()
  const requestId = request?.headers.get('x-request-id') || 'no-request-id'
  const route = request ? new URL(request.url).pathname : 'server-component'
  
  // Create cache key from request (use cookie hash or session ID)
  const cacheKey = request 
    ? `auth:${request.headers.get('cookie')?.substring(0, 50) || 'no-cookie'}`
    : 'auth:server'
  
  // Check request-level cache first (within same request)
  const cached = getCachedAuth(cacheKey)
  if (cached) {
    const durationMs = performance.now() - startTime
    logger.info('getUnifiedAuth (cached)', {
      requestId,
      route,
      durationMs: Math.round(durationMs * 100) / 100,
      cacheHit: true
    })
    return cached
  }

  const sessionStartTime = performance.now()
  // In App Router, getServerSession should work automatically
  // But for API routes, we need to handle it differently
  let session
  try {
    if (request) {
      // For API routes, extract cookies from request and pass to getServerSession
      const cookieHeader = request.headers.get('cookie') || ''
      
      // Create a request object that getServerSession can use
      const _req = {
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
  const sessionDurationMs = performance.now() - sessionStartTime
  
  // Require authentication - no dev bypasses
  // All users must authenticate through Google OAuth
  if (!session?.user?.email) {
    const durationMs = performance.now() - startTime
    logger.warn('getUnifiedAuth (unauthorized)', {
      requestId,
      route,
      durationMs: Math.round(durationMs * 100) / 100,
      sessionDurationMs: Math.round(sessionDurationMs * 100) / 100
    })
    throw new Error('Unauthorized: No session found. Please log in through Google OAuth.')
  }

  const dbStartTime = performance.now()
  // OPTIMIZED: Get user with workspace membership in a single query
  // This reduces 2 database round-trips to 1
  let user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      workspaceMemberships: {
        take: 1,
        orderBy: { joinedAt: 'asc' },
        select: {
          id: true,
          workspaceId: true,
          userId: true,
          role: true,
          joinedAt: true,
          // Exclude customRoleId as it may not exist in DB yet
          workspace: {
            select: { id: true, slug: true }
          }
        }
      }
    }
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: session.user.email,
        name: session.user.name || 'Unknown User',
        emailVerified: new Date()
      },
      include: {
        workspaceMemberships: {
          take: 1,
          orderBy: { joinedAt: 'asc' },
          select: {
            id: true,
            workspaceId: true,
            userId: true,
            role: true,
            joinedAt: true,
            // Exclude customRoleId as it may not exist in DB yet
            workspace: {
              select: { id: true, slug: true }
            }
          }
        }
      }
    })
  }
  const userQueryDurationMs = performance.now() - dbStartTime

  const workspaceStartTime = performance.now()
  // PHASE A3: Use JWT workspaceId first, then fall back to DB query
  let activeWorkspaceId: string
  let workspaceMember: any
  
  // Check if URL specifies a different workspace (slug or query param)
  const hasExplicitWorkspace = request && (
    new URL(request.url).pathname.match(/^\/w\/([^\/]+)/) ||
    new URL(request.url).searchParams.get('workspaceId') ||
    new URL(request.url).searchParams.get('workspaceSlug') ||
    new URL(request.url).searchParams.get('projectId') ||
    request.headers.get('x-workspace-id')
  )
  
  if (hasExplicitWorkspace) {
    // URL specifies workspace - resolve it (may be different from default)
    const result = await resolveActiveWorkspaceIdWithMember(user.id, request)
    if (!result) {
      // No workspace found - throw NoWorkspaceError for callers to handle
      throw new NoWorkspaceError('No workspace found - user needs to create a workspace')
    }
    activeWorkspaceId = result.workspaceId
    workspaceMember = result.workspaceMember
  } else if (session.user.workspaceId) {
    // PHASE A3: JWT has workspaceId - use it (but validate membership)
    const jwtWorkspaceId = session.user.workspaceId
    // Validate workspace access and get member in one query
    // PHASE 1: Use explicit select to exclude employmentStatus
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: jwtWorkspaceId,
          userId: user.id
        }
      },
      select: WORKSPACE_MEMBER_SELECT
    })
    
    if (member) {
      // Valid membership - use JWT workspaceId (avoids DB query for default workspace)
      activeWorkspaceId = jwtWorkspaceId
      workspaceMember = member
      logger.debug('getUnifiedAuth (JWT workspaceId)', {
        requestId,
        workspaceId: jwtWorkspaceId,
        source: 'JWT'
      })
    } else {
      // JWT workspaceId is invalid - fall back to DB query
      logger.warn('getUnifiedAuth (JWT workspaceId invalid, falling back to DB)', {
        requestId,
        jwtWorkspaceId,
        userId: user.id
      })
      // Fall through to DB query below
      if (user.workspaceMemberships.length > 0 && user.workspaceMemberships[0].workspace) {
        const defaultMembership = user.workspaceMemberships[0]
        activeWorkspaceId = defaultMembership.workspaceId
        workspaceMember = defaultMembership
      } else {
        throw new NoWorkspaceError()
      }
    }
  } else if (user.workspaceMemberships.length > 0 && user.workspaceMemberships[0].workspace) {
    // JWT has no workspaceId - use default workspace from DB query
    const defaultMembership = user.workspaceMemberships[0]
    activeWorkspaceId = defaultMembership.workspaceId
    workspaceMember = defaultMembership
    logger.debug('getUnifiedAuth (DB workspaceId)', {
      requestId,
      workspaceId: activeWorkspaceId,
      source: 'DB'
    })
  } else {
    // No workspace - user needs to create one
    throw new NoWorkspaceError()
  }
  const workspaceQueryDurationMs = performance.now() - workspaceStartTime

  const roles = workspaceMember ? [workspaceMember.role] : []
  const isFirstTime = !workspaceMember

  const authContext = {
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

  // Cache for this request
  setCachedAuth(cacheKey, authContext)
  
  const totalDurationMs = performance.now() - startTime
  logger.info('getUnifiedAuth', {
    requestId,
    route,
    durationMs: Math.round(totalDurationMs * 100) / 100,
    sessionDurationMs: Math.round(sessionDurationMs * 100) / 100,
    dbDurationMs: Math.round((userQueryDurationMs + workspaceQueryDurationMs) * 100) / 100,
    userQueryDurationMs: Math.round(userQueryDurationMs * 100) / 100,
    workspaceQueryDurationMs: Math.round(workspaceQueryDurationMs * 100) / 100,
    cacheHit: false,
    userId: user.id,
    workspaceId: activeWorkspaceId
  })
  
  // Log slow auth (>500ms)
  if (totalDurationMs > 500) {
    logger.warn('getUnifiedAuth (slow)', {
      requestId,
      route,
      durationMs: Math.round(totalDurationMs * 100) / 100,
      sessionDurationMs: Math.round(sessionDurationMs * 100) / 100,
      dbDurationMs: Math.round((userQueryDurationMs + workspaceQueryDurationMs) * 100) / 100
    })
  }
  
  return authContext
}

/**
 * Resolve active workspace ID and member in one optimized call
 * Returns both workspaceId and workspaceMember to avoid duplicate queries
 * Returns null if no workspace is found (instead of throwing)
 * 
 * Priority order:
 * 1. URL path slug (/w/[workspaceSlug]/...) - highest priority
 * 2. URL query params (workspaceId or projectId)
 * 3. x-workspace-id header
 * 4. User's default workspace
 */
async function resolveActiveWorkspaceIdWithMember(
  userId: string, 
  request?: NextRequest
): Promise<{ workspaceId: string; workspaceMember: any } | null> {
  const startTime = performance.now()
  const requestId = request?.headers.get('x-request-id') || 'no-request-id'
  
  // Priority 1: URL path slug (/w/[workspaceSlug]/...)
  if (request) {
    const url = new URL(request.url)
    const pathname = url.pathname
    
    // Check if path matches /w/[workspaceSlug]/... pattern
    const slugMatch = pathname.match(/^\/w\/([^\/]+)/)
    if (slugMatch) {
      const workspaceSlug = slugMatch[1]
      
      const dbStartTime = performance.now()
      // OPTIMIZED: Look up workspace by slug, then validate membership with direct query
      // This avoids loading all members and filtering client-side
      const workspace = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true } // Only need ID for membership check
      })
      
      if (!workspace) {
        throw new Error(`Not found: Workspace "${workspaceSlug}" does not exist`)
      }
      
      // Direct membership lookup (uses composite index)
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId
          }
        }
      })
      const dbDurationMs = performance.now() - dbStartTime
      
      if (member) {
        const totalDurationMs = performance.now() - startTime
        logger.debug('resolveActiveWorkspaceIdWithMember (slug)', {
          requestId,
          method: 'slug',
          durationMs: Math.round(totalDurationMs * 100) / 100,
          dbDurationMs: Math.round(dbDurationMs * 100) / 100,
          workspaceId: workspace.id
        })
        return { workspaceId: workspace.id, workspaceMember: member }
      }
      
      // If workspace exists but user is not a member, throw error
      throw new Error(`Forbidden: You do not have access to workspace "${workspaceSlug}"`)
    }
  }

  // Priority 2: URL query params
  if (request) {
    const url = new URL(request.url)
    const workspaceSlug = url.searchParams.get('workspaceSlug')
    if (workspaceSlug) {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true },
      })
      if (workspace) {
        const member = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: workspace.id,
              userId,
            },
          },
          select: WORKSPACE_MEMBER_SELECT,
        })
        if (member) {
          return { workspaceId: workspace.id, workspaceMember: member }
        }
      }
    }

    const workspaceId = url.searchParams.get('workspaceId')
    if (workspaceId) {
      // Validate workspace access and get member in one query
      // PHASE 1: Use explicit select to exclude employmentStatus
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            userId,
            workspaceId
          }
        },
        select: WORKSPACE_MEMBER_SELECT
      })
      if (member) {
        return { workspaceId, workspaceMember: member }
      }
    }

    const projectId = url.searchParams.get('projectId')
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true }
      })
      if (project) {
        // Validate workspace access and get member in one query
        // PHASE 1: Use explicit select to exclude employmentStatus
        const member = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              userId,
              workspaceId: project.workspaceId
            }
          },
          select: WORKSPACE_MEMBER_SELECT
        })
        if (member) {
          return { workspaceId: project.workspaceId, workspaceMember: member }
        }
      }
    }
  }

  // Priority 3: Header
  if (request) {
    const headerWorkspaceId = request.headers.get('x-workspace-id')
    if (headerWorkspaceId) {
      // Validate workspace access and get member in one query
      // PHASE 1: Use explicit select to exclude employmentStatus
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            userId,
            workspaceId: headerWorkspaceId
          }
        },
        select: WORKSPACE_MEMBER_SELECT
      })
      if (member) {
        return { workspaceId: headerWorkspaceId, workspaceMember: member }
      }
    }
  }

  // Priority 4: User's default workspace
  // OPTIMIZED: Single query to get first membership with workspace verification
  // Use findFirst with a join condition instead of findMany + filter
  // PHASE 1: Use explicit select to exclude employmentStatus
  const dbStartTime = performance.now()
  const validMembership = await prisma.workspaceMember.findFirst({
    where: { 
      userId,
      workspace: {
        id: { not: undefined } // Ensure workspace exists
      }
    },
    orderBy: { joinedAt: 'asc' },
    select: {
      ...WORKSPACE_MEMBER_SELECT,
      workspace: {
        select: { id: true } // Verify workspace still exists
      }
    }
  })
  const dbDurationMs = performance.now() - dbStartTime
  
  if (validMembership && validMembership.workspace) {
    const totalDurationMs = performance.now() - startTime
    logger.debug('resolveActiveWorkspaceIdWithMember (default)', {
      requestId,
      method: 'default',
      durationMs: Math.round(totalDurationMs * 100) / 100,
      dbDurationMs: Math.round(dbDurationMs * 100) / 100,
      workspaceId: validMembership.workspaceId
    })
    return { 
      workspaceId: validMembership.workspaceId, 
      workspaceMember: validMembership 
    }
  }

  // No workspace found - user needs to create one
  const totalDurationMs = performance.now() - startTime
  logger.warn('resolveActiveWorkspaceIdWithMember (no workspace)', {
    requestId,
    method: 'default',
    durationMs: Math.round(totalDurationMs * 100) / 100,
    dbDurationMs: Math.round(dbDurationMs * 100) / 100
  })
  // Return null instead of throwing to prevent Next.js from logging during SSR
  return null
}

/**
 * Resolve active workspace ID with priority:
 * 1. URL path slug (/w/[workspaceSlug]/...) - highest priority
 * 2. URL params: workspaceId or projectId → map to workspace
 * 3. x-workspace-id header
 * 4. user's default workspace
 * 5. Create default workspace if none exists
 */
async function _resolveActiveWorkspaceId(
  userId: string,
  request?: NextRequest
): Promise<string> {
  // Priority 1: URL path slug (/w/[workspaceSlug]/...)
  if (request) {
    const url = new URL(request.url)
    const pathname = url.pathname
    
    // Check if path matches /w/[workspaceSlug]/... pattern
    const slugMatch = pathname.match(/^\/w\/([^\/]+)/)
    if (slugMatch) {
      const workspaceSlug = slugMatch[1]
      
      // OPTIMIZED: Look up workspace by slug, then validate membership with direct query
      const workspace = await prisma.workspace.findUnique({
        where: { slug: workspaceSlug },
        select: { id: true } // Only need ID for membership check
      })
      
      if (!workspace) {
        throw new Error(`Not found: Workspace "${workspaceSlug}" does not exist`)
      }
      
      // Direct membership lookup (uses composite index)
      // PHASE 1: Use explicit select to exclude employmentStatus
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId
          }
        },
        select: WORKSPACE_MEMBER_SELECT
      })
      
      if (member) {
        return workspace.id
      }
      
      // If workspace exists but user is not a member, throw error
      throw new Error(`Forbidden: You do not have access to workspace "${workspaceSlug}"`)
    }
  }

  // Priority 2: URL params
  if (request) {
    const url = new URL(request.url)
    const workspaceId = url.searchParams.get('workspaceId')
    if (workspaceId) {
      // Validate workspace access
      // PHASE 1: Use explicit select to exclude employmentStatus
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            userId,
            workspaceId
          }
        },
        select: WORKSPACE_MEMBER_SELECT
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
        // PHASE 1: Use explicit select to exclude employmentStatus
        const member = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              userId,
              workspaceId: project.workspaceId
            }
          },
          select: WORKSPACE_MEMBER_SELECT
        })
        if (member) {
          return project.workspaceId
        }
      }
    }
  }

  // Priority 3: Header
  if (request) {
    const headerWorkspaceId = request.headers.get('x-workspace-id')
    if (headerWorkspaceId) {
      // Validate workspace access
      // PHASE 1: Use explicit select to exclude employmentStatus
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            userId,
            workspaceId: headerWorkspaceId
          }
        },
        select: WORKSPACE_MEMBER_SELECT
      })
      if (member) {
        return headerWorkspaceId
      }
    }
  }

  // Priority 4: User's default workspace
  // Get all memberships and find the first one with an existing workspace
  // PHASE 1: Use explicit select to exclude employmentStatus
  const userMemberships = await prisma.workspaceMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'asc' },
    select: {
      ...WORKSPACE_MEMBER_SELECT,
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
  // PHASE 1: Use explicit select to exclude employmentStatus
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        userId,
        workspaceId
      }
    },
    select: WORKSPACE_MEMBER_SELECT
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
