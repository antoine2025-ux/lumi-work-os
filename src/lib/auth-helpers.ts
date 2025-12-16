import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth'
import { prisma } from './db'

export async function getAuthenticatedUser(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        workspaceMemberships: {
          include: {
            workspace: true
          }
        }
      }
    })

    return user
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

export async function getCurrentWorkspace(user: any) {
  if (!user?.workspaceMemberships?.length) {
    return null
  }

  // For now, return the first workspace
  // In production, you might want to handle workspace selection differently
  return user.workspaceMemberships[0].workspace
}
