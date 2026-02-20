import { NextRequest, NextResponse } from 'next/server'
import { prismaUnscoped } from '@/lib/db'
import { encode } from 'next-auth/jwt'

/**
 * E2E Test Authentication Endpoint
 * 
 * Creates a test session for automated E2E testing.
 * ONLY available when E2E_TEST_AUTH=true AND NODE_ENV !== 'production'.
 */
export async function POST(request: NextRequest) {
  // Security gates
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  
  if (process.env.E2E_TEST_AUTH !== 'true') {
    return NextResponse.json({ error: 'E2E test auth not enabled' }, { status: 403 })
  }
  
  const testPassword = process.env.E2E_TEST_PASSWORD
  if (!testPassword) {
    return NextResponse.json({ error: 'E2E_TEST_PASSWORD not configured' }, { status: 500 })
  }
  
  // Validate password
  let body: { password?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  
  if (body.password !== testPassword) {
    return NextResponse.json({ error: 'Invalid test password' }, { status: 401 })
  }
  
  try {
    const testEmail = 'e2e-test@loopwell.test'
    const testName = 'E2E Test User'
    
    // Use raw SQL to avoid Prisma schema mismatch issues
    // Upsert test user
    const userResult = await prismaUnscoped.$queryRaw<{ id: string; email: string; name: string | null }[]>`
      INSERT INTO users (id, email, name, "emailVerified", "createdAt", "updatedAt")
      VALUES (gen_random_uuid()::text, ${testEmail}, ${testName}, NOW(), NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET name = ${testName}, "emailVerified" = NOW()
      RETURNING id, email, name
    `
    
    const user = userResult[0]
    if (!user) {
      throw new Error('Failed to create/find user')
    }
    
    // Find existing workspace membership
    const membershipResult = await prismaUnscoped.$queryRaw<{ workspace_id: string; role: string }[]>`
      SELECT wm."workspaceId" as workspace_id, wm.role
      FROM workspace_members wm
      WHERE wm."userId" = ${user.id}
      LIMIT 1
    `
    
    let workspaceId: string
    let role = 'OWNER'
    
    if (membershipResult.length > 0) {
      workspaceId = membershipResult[0].workspace_id
      role = membershipResult[0].role
    } else {
      // Create workspace
      const slug = `e2e-test-${Date.now()}`
      const wsResult = await prismaUnscoped.$queryRaw<{ id: string }[]>`
        INSERT INTO workspaces (id, name, slug, "ownerId", "createdAt", "updatedAt")
        VALUES (gen_random_uuid()::text, 'E2E Test Workspace', ${slug}, ${user.id}, NOW(), NOW())
        RETURNING id
      `
      
      workspaceId = wsResult[0].id
      
      // Create membership
      await prismaUnscoped.$queryRaw`
        INSERT INTO workspace_members (id, "workspaceId", "userId", role, "joinedAt")
        VALUES (gen_random_uuid()::text, ${workspaceId}, ${user.id}, 'OWNER', NOW())
      `
    }
    
    // Create JWT token (compatible with NextAuth)
    const token = await encode({
      token: {
        sub: user.id,
        id: user.id,
        uid: user.id,
        email: user.email,
        name: user.name,
        workspaceId,
        role,
        isFirstTime: false,
      },
      secret: process.env.NEXTAUTH_SECRET!,
    })
    
    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
      workspaceId,
    })
    
    // Set NextAuth session cookie
    response.cookies.set('next-auth.session-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    
    return response
  } catch (error) {
    console.error('[E2E Auth] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to create test session', details: message }, { status: 500 })
  }
}
