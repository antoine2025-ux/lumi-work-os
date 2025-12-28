import { NextRequest, NextResponse } from 'next/server'
import { prismaUnscoped } from '@/lib/db'
import { encode } from 'next-auth/jwt'

/**
 * E2E Test Authentication Endpoint
 * 
 * Creates a valid NextAuth session for E2E testing in CI environments.
 * 
 * Security guards (all must pass):
 * 1. E2E_AUTH_ENABLED === "true"
 * 2. NODE_ENV !== "production" AND VERCEL_ENV !== "production"
 * 3. E2E_AUTH_SECRET is set and matches x-e2e-secret header
 * 
 * Returns 404 for all guard failures to hide endpoint existence.
 * 
 * Usage in tests:
 * POST /api/e2e-auth
 * Headers: { 'x-e2e-secret': process.env.E2E_AUTH_SECRET }
 * Body: { email: 'e2e@loopwell.test' } (optional, uses default)
 */

const E2E_DEFAULT_EMAIL = 'e2e@loopwell.test'

export async function POST(request: NextRequest) {
  // Guard 1: E2E_AUTH_ENABLED must be explicitly set to "true"
  if (process.env.E2E_AUTH_ENABLED !== 'true') {
    return new NextResponse(null, { status: 404 })
  }
  
  // Guard 2: Must NOT be production environment
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }
  
  // Guard 3: E2E_AUTH_SECRET must be configured
  const e2eSecret = process.env.E2E_AUTH_SECRET
  if (!e2eSecret) {
    return new NextResponse(null, { status: 404 })
  }
  
  // Guard 4: Verify the secret from request header
  const providedSecret = request.headers.get('x-e2e-secret')
  if (providedSecret !== e2eSecret) {
    return new NextResponse(null, { status: 404 })
  }
  
  try {
    let email = E2E_DEFAULT_EMAIL
    
    // Try to parse body for custom email (optional)
    try {
      const body = await request.json()
      if (body.email) {
        email = body.email
      }
    } catch {
      // No body or invalid JSON - use default email
    }
    
    // Find or create the test user
    const user = await prismaUnscoped.user.upsert({
      where: { email },
      update: {
        emailVerified: new Date(),
      },
      create: {
        email,
        name: 'E2E Test User',
        emailVerified: new Date(),
      },
    })
    
    // Find user's workspace membership
    const membership = await prismaUnscoped.workspaceMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: 'asc' },
      select: { workspaceId: true, role: true },
    })
    
    // Create a JWT token matching NextAuth's format
    const token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        workspaceId: membership?.workspaceId,
        role: membership?.role,
        isFirstTime: !membership,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 60 * 60 * 24, // 24 hours
    })
    
    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      workspaceId: membership?.workspaceId,
    })
    
    // Set the session cookie (matching NextAuth's cookie name)
    // In CI/test environments, we're not in production so use non-secure cookie
    const cookieName = 'next-auth.session-token'
    
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: false, // CI runs on localhost
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })
    
    return response
  } catch (error) {
    console.error('[E2E Auth] Error:', error)
    // Return 404 even on errors to hide endpoint behavior
    return new NextResponse(null, { status: 404 })
  }
}
