import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
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
    console.error('Error checking user status:', error)
    
    // If user has no workspace, return appropriate status
    if (error instanceof Error && error.message.includes('No workspace found')) {
      return NextResponse.json({
        isAuthenticated: true,
        isFirstTime: true,
        workspaceId: null,
        error: 'No workspace found'
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
