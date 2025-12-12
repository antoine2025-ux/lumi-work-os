import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
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

    const auth = await getUnifiedAuth(request)
    
    const result = {
      isAuthenticated: auth.isAuthenticated,
      isFirstTime: auth.user.isFirstTime,
      user: {
        id: auth.user.userId,
        name: auth.user.name,
        email: auth.user.email
      },
      workspaceId: auth.workspaceId,
      isDevelopment: auth.isDevelopment
    }

    // Cache for 30 seconds
    await cache.set(cacheKey, result, 30)

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    response.headers.set('X-Cache', 'MISS')
    return response

  } catch (error) {
    console.error('[user-status] Error checking user status:', error)
    
    // If user has no workspace, return appropriate status
    if (error instanceof Error && error.message.includes('No workspace found')) {
      // Try to get the user at least
      const session = await getServerSession(authOptions)
      
      let pendingInvite = null
      
      // Check for pending invites if user is authenticated
      if (session?.user?.email) {
        const { prisma } = await import('@/lib/db')
        const normalizedEmail = session.user.email.toLowerCase().trim()
        
        try {
          const invite = await prisma.workspaceInvite.findFirst({
            where: {
              email: normalizedEmail,
              revokedAt: null,
              acceptedAt: null,
              expiresAt: { gt: new Date() }
            },
            select: {
              token: true,
              workspace: {
                select: {
                  slug: true,
                  name: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          })
          
          if (invite) {
            pendingInvite = {
              token: invite.token,
              workspace: invite.workspace
            }
            
            // Log pending invite found (dev/prod-safe: email domain only)
            const emailDomain = normalizedEmail.split('@')[1] || 'unknown'
            if (process.env.NODE_ENV === 'development') {
              console.log(`[user-status] Pending invite found for @${emailDomain}`)
            }
          } else {
            const emailDomain = normalizedEmail.split('@')[1] || 'unknown'
            if (process.env.NODE_ENV === 'development') {
              console.log(`[user-status] No pending invite found for @${emailDomain}`)
            }
          }
        } catch (inviteError) {
          console.error('[user-status] Error checking pending invites:', inviteError)
          // Graceful degradation: continue without pendingInvite
        }
      }
      
      return NextResponse.json({
        isAuthenticated: !!session?.user?.email,
        isFirstTime: true,
        workspaceId: null,
        error: 'No workspace found',
        pendingInvite,
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
        isAuthenticated: false,
        isFirstTime: true,
        workspaceId: null,
        error: 'Not authenticated'
      })
    }
    
    return NextResponse.json({ 
      isAuthenticated: false,
      isFirstTime: true,
      workspaceId: null,
      error: 'Failed to check user status'
    })
  }
}
