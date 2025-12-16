import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/simple-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cache, CACHE_KEYS, CACHE_TTL } from '@/lib/cache'

export async function GET(request: NextRequest) {
  try {
    // Generate cache key based on session
    const cookieHeader = request.headers.get('cookie') || ''
    const sessionMatch = cookieHeader.match(/next-auth\.session-token=([^;]*)/)
    const sessionToken = sessionMatch ? sessionMatch[1] : 'no-session'
    const cacheKey = cache.generateKey(CACHE_KEYS.USER_STATUS, sessionToken)

    // Check cache first (short TTL since user status can change)
    const cached = await cache.get(cacheKey)
    if (cached) {
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    // Use getAuthUser which has SQL fallback when Prisma fails
    let authUser
    try {
      authUser = await getAuthUser()
    } catch (authError: any) {
      console.error('[user-status] getAuthUser threw error:', authError?.message || authError)
      // Even if getAuthUser fails, check if we have a session
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        // User has session but getAuthUser failed - return authenticated but with error
        console.warn('[user-status] Session exists but getAuthUser failed, returning partial auth')
        return NextResponse.json({
          isAuthenticated: true, // Still authenticated via session
          isFirstTime: true,
          workspaceId: null,
          error: `Auth check failed: ${authError?.message || 'Unknown error'}`,
          user: {
            id: (session.user as any).id || session.user.email,
            name: session.user.name || '',
            email: session.user.email
          }
        })
      }
      // No session either, truly not authenticated
      return NextResponse.json({
        isAuthenticated: false,
        isFirstTime: true,
        workspaceId: null,
        error: 'Not authenticated'
      })
    }
    
    if (!authUser) {
      // getAuthUser returned null - check session as fallback
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        console.warn('[user-status] getAuthUser returned null but session exists')
        return NextResponse.json({
          isAuthenticated: true, // Still authenticated via session
          isFirstTime: true,
          workspaceId: null,
          error: 'Workspace lookup failed',
          user: {
            id: (session.user as any).id || session.user.email,
            name: session.user.name || '',
            email: session.user.email
          }
        })
      }
      return NextResponse.json({
        isAuthenticated: false,
        isFirstTime: true,
        workspaceId: null,
        error: 'Not authenticated'
      })
    }
    
    const result = {
      isAuthenticated: true,
      isFirstTime: authUser.isFirstTime,
      user: {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email
      },
      workspaceId: authUser.workspaceId || null,
      isDevelopment: process.env.NODE_ENV === 'development'
    }

    // Cache for 30 seconds
    await cache.set(cacheKey, result, 30)

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    response.headers.set('X-Cache', 'MISS')
    return response

  } catch (error) {
    console.error('[user-status] Error checking user status:', error)
    
    // Always check for session as fallback - don't assume user is not authenticated
    const session = await getServerSession(authOptions).catch(() => null)
    
    // If user has no workspace, return appropriate status
    if (error instanceof Error && error.message.includes('No workspace found')) {
      return NextResponse.json({
        isAuthenticated: !!session?.user?.email,
        isFirstTime: true,
        workspaceId: null,
        error: 'No workspace found',
        user: session?.user ? {
          id: (session.user as any).id,
          name: session.user.name,
          email: session.user.email
        } : null
      })
    }
    
    // If user is not authenticated, return appropriate status
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({
        isAuthenticated: !!session?.user?.email, // Check session even for unauthorized errors
        isFirstTime: true,
        workspaceId: null,
        error: session?.user?.email ? 'Auth check failed' : 'Not authenticated',
        user: session?.user ? {
          id: (session.user as any).id,
          name: session.user.name,
          email: session.user.email
        } : null
      })
    }
    
    // Generic error - check session before assuming not authenticated
    return NextResponse.json({ 
      isAuthenticated: !!session?.user?.email, // Check session as fallback
      isFirstTime: true,
      workspaceId: null,
      error: session?.user?.email ? `Failed to check user status: ${error instanceof Error ? error.message : 'Unknown error'}` : 'Not authenticated',
      user: session?.user ? {
        id: (session.user as any).id,
        name: session.user.name,
        email: session.user.email
      } : null
    })
  }
}
