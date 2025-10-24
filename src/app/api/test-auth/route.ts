import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    return NextResponse.json({
      hasSession: !!session,
      session: session ? {
        user: session.user,
        expires: session.expires
      } : null,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Auth test error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      hasSession: false,
      timestamp: new Date().toISOString()
    })
  }
}
