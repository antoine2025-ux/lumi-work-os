import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV !== 'development' || process.env.ALLOW_DEV_LOGIN !== 'true') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    // Check if user is already logged in
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      return NextResponse.json({ 
        message: 'Already logged in',
        user: session.user 
      })
    }

    // In development, we can't actually create a session without proper auth flow
    // Instead, we'll return a success message and let the unified auth handle it
    return NextResponse.json({ 
      message: 'Development mode - authentication handled by unified auth system',
      devMode: true
    })
  } catch (error) {
    console.error('Dev login error:', error)
    return NextResponse.json({ error: 'Failed to process dev login' }, { status: 500 })
  }
}

