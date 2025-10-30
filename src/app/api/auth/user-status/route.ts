import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('[user-status] Calling getUnifiedAuth...')
    const auth = await getUnifiedAuth(request)
    console.log('[user-status] getUnifiedAuth returned:', { workspaceId: auth.workspaceId, isFirstTime: auth.user.isFirstTime })
    
    return NextResponse.json({
      isAuthenticated: auth.isAuthenticated,
      isFirstTime: auth.user.isFirstTime,
      user: {
        id: auth.user.userId,
        name: auth.user.name,
        email: auth.user.email
      },
      workspaceId: auth.workspaceId,
      isDevelopment: auth.isDevelopment
    })

  } catch (error) {
    console.error('[user-status] Error checking user status:', error)
    
    // If user has no workspace, return appropriate status
    if (error instanceof Error && error.message.includes('No workspace found')) {
      // Try to get the user at least
      const session = await getServerSession(authOptions)
      
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
