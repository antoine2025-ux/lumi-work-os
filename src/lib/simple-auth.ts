import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string | null
  workspaceId: string
  isFirstTime: boolean
}

/**
 * Simple authentication - works in development and production
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    // Get NextAuth session
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return null
    }

    // Ensure user exists in database
    const user = await prisma.user.upsert({
      where: { email: session.user.email! },
      update: { name: session.user.name },
      create: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name || '',
        emailVerified: new Date(),
      }
    })

    // Check if user has any workspace membership
    const workspaceMembership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id }
    })

    let workspace
    let isFirstTime = false

    if (!workspaceMembership) {
      // First-time user - they need to create a workspace
      isFirstTime = true
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: session.user.image,
        workspaceId: '', // No workspace yet
        isFirstTime: true
      }
    } else {
      // Existing user - get their workspace
      workspace = await prisma.workspace.findUnique({
        where: { id: workspaceMembership.workspaceId }
      })
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: session.user.image,
      workspaceId: workspace?.id || '',
      isFirstTime: false
    }
  } catch (error) {
    console.error('Auth error:', error)
    return null
  }
}

/**
 * Create workspace for first-time user
 */
export async function createUserWorkspace(userData: {
  id: string
  email: string
  name: string
  image?: string | null
}, workspaceData: {
  name: string
  slug: string
  description: string
  teamSize?: string
  industry?: string
}): Promise<AuthUser> {
  try {
    // First ensure the user exists in the database
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { 
        name: userData.name,
        image: userData.image
      },
      create: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        image: userData.image,
        emailVerified: new Date(),
      }
    })

    // Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceData.name,
        slug: workspaceData.slug,
        description: workspaceData.description,
        ownerId: user.id, // Use the upserted user's ID
      }
    })

    // Add user as OWNER
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'OWNER',
        joinedAt: new Date(),
      }
    })

    // Return the auth user data
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      workspaceId: workspace.id,
      isFirstTime: false
    }
  } catch (error) {
    console.error('Error creating workspace:', error)
    throw error
  }
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}
