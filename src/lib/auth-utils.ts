import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface AuthResult {
  user: {
    id: string
    email: string
    name?: string
  }
  isAuthenticated: boolean
  isDevelopment: boolean
}

/**
 * Get authenticated user with development fallback
 * In development, creates/uses a default user if no session exists
 */
export async function getAuthenticatedUser(): Promise<AuthResult> {
  try {
    // Try to get real session first
    const session = await getServerSession(authOptions)
    
    if (session?.user?.email) {
      // Get the actual database user ID
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      })
      
      if (!dbUser) {
        throw new Error('User not found in database')
      }
      
      return {
        user: {
          id: dbUser.id,
          email: session.user.email,
          name: session.user.name || undefined
        },
        isAuthenticated: true,
        isDevelopment: false
      }
    }

    // No session found - require Google OAuth authentication
    throw new Error('No authenticated session found. Please log in through Google OAuth.')
    
  } catch (error) {
    console.error('❌ Authentication error:', error)
    throw new Error('Authentication failed')
  }
}

/**
 * Get workspace ID with fallback for development
 */
export async function getWorkspaceId(userId: string, requestedWorkspaceId?: string): Promise<string> {
  if (requestedWorkspaceId) {
    // Verify user has access to requested workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: requestedWorkspaceId
      }
    })
    
    if (membership) {
      return requestedWorkspaceId
    }
  }

  // Get user's first workspace
  const workspace = await prisma.workspace.findFirst({
    where: {
      members: {
        some: { userId }
      }
    }
  })

  if (!workspace) {
    // No workspace found - user needs to create one
    // Don't auto-create workspace, let the frontend handle this
    throw new Error('No workspace found - user needs to create a workspace')
  }

  return workspace.id
}

/**
 * Middleware helper for API routes
 */
export async function withAuth<T>(
  handler: (auth: AuthResult, workspaceId: string) => Promise<T>
): Promise<T> {
  const auth = await getAuthenticatedUser()
  const workspaceId = await getWorkspaceId(auth.user.id)
  
  return handler(auth, workspaceId)
}
