import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

/**
 * GET /api/collab/token
 * 
 * Returns the raw NextAuth JWT token for the current user.
 * Used by the Hocuspocus collaboration client to authenticate with the collab server.
 * 
 * The token is verified by the Hocuspocus server to ensure only authenticated users
 * can connect to document collaboration sessions.
 */
export async function GET(request: NextRequest) {
  try {
    // Get the raw JWT token from the session cookie
    const token = await getToken({ 
      req: request, 
      raw: true,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ token })
  } catch (error) {
    console.error('[Collab Token] Error getting token:', error)
    return NextResponse.json(
      { error: 'Failed to get authentication token' },
      { status: 500 }
    )
  }
}
