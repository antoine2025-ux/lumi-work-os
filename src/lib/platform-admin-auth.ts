import { getServerSession } from 'next-auth/next'
import { notFound } from 'next/navigation'
import { authOptions } from '@/server/authOptions'
import { prisma } from '@/lib/db'

/**
 * Platform admin authentication context
 * Unlike workspace auth, this does NOT require workspace membership
 */
export interface PlatformAuthContext {
  userId: string
  email: string
  name: string | null
  isPlatformAdmin: boolean
}

/**
 * Get platform-level authentication without requiring workspace membership
 * 
 * Use this for platform admin routes that should be accessible
 * regardless of workspace membership status.
 * 
 * @returns PlatformAuthContext with user info and admin status
 * @throws Error if not authenticated
 */
export async function getPlatformAuth(): Promise<PlatformAuthContext> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    throw new Error('Unauthorized: No session found. Please log in.')
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      isPlatformAdmin: true,
    },
  })

  if (!user) {
    throw new Error('Unauthorized: User not found.')
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.isPlatformAdmin,
  }
}

/**
 * Assert that the current user is a platform admin
 * 
 * Use this as a guard for platform admin-only routes.
 * Returns 404 (not 403) if not admin, to hide route existence for security.
 * 
 * @returns PlatformAuthContext if user is admin
 * @throws notFound() if user is not a platform admin
 */
export async function assertPlatformAdmin(): Promise<PlatformAuthContext> {
  try {
    const auth = await getPlatformAuth()

    if (!auth.isPlatformAdmin) {
      // Return 404 to hide route existence for security
      notFound()
    }

    return auth
  } catch {
    // Any auth error (not logged in, user not found) = 404
    notFound()
  }
}

/**
 * Check if current user is a platform admin (non-throwing version)
 * 
 * Use this when you need to conditionally show/hide admin features
 * without blocking the page.
 * 
 * @returns true if user is authenticated and is a platform admin
 */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const auth = await getPlatformAuth()
    return auth.isPlatformAdmin
  } catch {
    return false
  }
}

