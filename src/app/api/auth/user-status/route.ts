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
    return NextResponse.json({ 
      isAuthenticated: false,
      isFirstTime: false,
      error: 'Failed to check user status'
    }, { status: 500 })
  }
}
