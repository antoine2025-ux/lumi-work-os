import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cache, CACHE_KEYS } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'
import { prisma } from '@/lib/db'

// Helper to hash workspaceId for logging (privacy/correlation protection)
function hashWorkspaceId(workspaceId: string | null): string | undefined {
  if (!workspaceId) return undefined
  // Use last 6 chars as lightweight hash (stable, no crypto overhead)
  return workspaceId.slice(-6)
}

export async function GET(request: NextRequest) {
  const startTime = performance.now()
  const baseContext = await buildLogContextFromRequest(request)
  
  try {
    // Generate cache key based on session
    const cookieHeader = request.headers.get('cookie') || ''
    const sessionMatch = cookieHeader.match(/next-auth\.session-token=([^;]*)/)
    const sessionToken = sessionMatch ? sessionMatch[1] : 'no-session'
    const cacheKey = cache.generateKey(CACHE_KEYS.USER_STATUS, sessionToken)

    // Check cache first (short TTL since user status can change)
    const cacheCheckStart = performance.now()
    const cached = await cache.get(cacheKey)
    const cacheCheckDurationMs = performance.now() - cacheCheckStart
    
    if (cached) {
      const totalDurationMs = performance.now() - startTime
      logger.info('user-status (cached)', {
        ...baseContext,
        durationMs: Math.round(totalDurationMs * 100) / 100,
        cacheCheckDurationMs: Math.round(cacheCheckDurationMs * 100) / 100,
        cacheHit: true
      })
      const response = NextResponse.json(cached)
      response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
      response.headers.set('X-Cache', 'HIT')
      return response
    }

    const authStartTime = performance.now()
    const auth = await getUnifiedAuth(request)
    const authDurationMs = performance.now() - authStartTime
    
    // Fetch user role in workspace (if workspace exists)
    // Always set role to ensure it's included in response when workspaceId exists
    let userRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' = 'MEMBER' // Default to MEMBER for backward compatibility
    if (auth.workspaceId) {
      try {
        const roleStartTime = performance.now()
        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: auth.workspaceId,
              userId: auth.user.userId
            }
          },
          select: {
            role: true
          }
        })
        const roleDurationMs = performance.now() - roleStartTime
        
        if (membership?.role) {
          userRole = membership.role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
        }
        // Note: If membership is null, userRole stays as 'MEMBER' (default)
        // This ensures role is always defined when workspaceId exists
        
        // Log slow role queries (>100ms)
        if (roleDurationMs > 100) {
          logger.debug('user-status role query (slow)', {
            ...baseContext,
            roleDurationMs: Math.round(roleDurationMs * 100) / 100,
            workspaceIdHash: hashWorkspaceId(auth.workspaceId)
          })
        }
      } catch {
        // Graceful degradation: default to MEMBER if role fetch fails
        // Don't log error details to avoid exposing sensitive data
        logger.debug('user-status role query (failed, defaulting to MEMBER)', {
          ...baseContext,
          workspaceIdHash: hashWorkspaceId(auth.workspaceId)
        })
      }
    }
    
    const result = {
      isAuthenticated: auth.isAuthenticated,
      isFirstTime: auth.user.isFirstTime,
      user: {
        id: auth.user.userId,
        name: auth.user.name,
        email: auth.user.email
      },
      workspaceId: auth.workspaceId,
      role: userRole, // Include role in response
      isDevelopment: auth.isDevelopment
    }

    // Cache for 30 seconds
    const cacheSetStart = performance.now()
    await cache.set(cacheKey, result, 30)
    const cacheSetDurationMs = performance.now() - cacheSetStart

    const totalDurationMs = performance.now() - startTime
    logger.info('user-status', {
      ...baseContext,
      durationMs: Math.round(totalDurationMs * 100) / 100,
      authDurationMs: Math.round(authDurationMs * 100) / 100,
      cacheCheckDurationMs: Math.round(cacheCheckDurationMs * 100) / 100,
      cacheSetDurationMs: Math.round(cacheSetDurationMs * 100) / 100,
      cacheHit: false,
      workspaceIdHash: hashWorkspaceId(result.workspaceId)
    })
    
    // Log slow requests (>500ms)
    if (totalDurationMs > 500) {
      logger.warn('user-status (slow)', {
        ...baseContext,
        durationMs: Math.round(totalDurationMs * 100) / 100,
        authDurationMs: Math.round(authDurationMs * 100) / 100,
        workspaceIdHash: hashWorkspaceId(result.workspaceId)
      })
    }

    const response = NextResponse.json(result)
    response.headers.set('Cache-Control', 'private, s-maxage=30, stale-while-revalidate=60')
    response.headers.set('X-Cache', 'MISS')
    return response

  } catch (error) {
    const totalDurationMs = performance.now() - startTime
    
    // Handle "Unauthorized" errors first (before logging)
    if (error instanceof Error && (
      error.message.includes('Unauthorized') || 
      error.message.includes('No session found') ||
      error.message.includes('Please log in')
    )) {
      // User is not authenticated - return appropriate status without logging error
      logger.debug('user-status (unauthorized)', {
        ...baseContext,
        durationMs: Math.round(totalDurationMs * 100) / 100
      })
      return NextResponse.json({
        isAuthenticated: false,
        isFirstTime: true,
        workspaceId: null,
        role: 'MEMBER' as const, // Default role for backward compatibility
        error: 'Not authenticated'
      }, { status: 401 })
    }
    
    // Log other errors
    logger.error('user-status (error)', {
      ...baseContext,
      durationMs: Math.round(totalDurationMs * 100) / 100
    }, error)
    
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
        role: 'MEMBER' as const, // Default role for backward compatibility
        error: 'No workspace found',
        pendingInvite,
        user: session?.user ? {
          id: (session.user as { id?: string }).id || '',
          name: session.user.name,
          email: session.user.email
        } : null
      })
    }
    
    // Fallback for any other errors
    return NextResponse.json({ 
      isAuthenticated: false,
      isFirstTime: true,
      workspaceId: null,
      role: 'MEMBER' as const, // Default role for backward compatibility
      error: 'Failed to check user status'
    }, { status: 500 })
  }
}
