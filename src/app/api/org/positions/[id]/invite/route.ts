import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma, prismaUnscoped } from "@/lib/db"
import { randomBytes } from "crypto"
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'

// POST /api/org/positions/[id]/invite - Create position-based invite
// 
// IMPORTANT: OWNER role is NOT allowed for position-based invites (returns 400).
// OWNER role should only be assigned via workspace-based invites.
// When building Phase 2 UI, ensure OWNER is excluded from role selector.
//
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  let baseContext
  try {
    baseContext = await buildLogContextFromRequest(request)
  } catch (error) {
    baseContext = {
      requestId: request.headers.get('x-request-id') ?? undefined,
      route: request.nextUrl.pathname,
      method: request.method,
    }
  }
  
  logger.info('Incoming request /api/org/positions/[id]/invite', baseContext)
  
  try {
    const { id: positionId } = await params
    
    // Step 1: Authentication & Authorization
    let auth
    try {
      auth = await getUnifiedAuth(request)
    } catch (authError) {
      const authMessage = authError instanceof Error ? authError.message : String(authError)
      if (authMessage.includes('Unauthorized') || authMessage.includes('No session')) {
        return NextResponse.json(
          { error: authMessage },
          { status: 401 }
        )
      }
      throw authError
    }
    
    // Assert user has OWNER or ADMIN role to create invites
    try {
      await assertAccess({ 
        userId: auth.user.userId, 
        workspaceId: auth.workspaceId, 
        scope: 'workspace', 
        requireRole: ['OWNER', 'ADMIN'] 
      })
    } catch (accessError) {
      const accessMessage = accessError instanceof Error ? accessError.message : String(accessError)
      if (accessMessage.includes('Forbidden') || accessMessage.includes('Insufficient')) {
        return NextResponse.json(
          { error: accessMessage },
          { status: 403 }
        )
      }
      throw accessError
    }

    setWorkspaceContext(auth.workspaceId)

    // Step 2: Validate Position
    const position = await prisma.orgPosition.findUnique({
      where: { id: positionId },
      select: { id: true, workspaceId: true, userId: true }
    })

    if (!position) {
      return NextResponse.json(
        { error: "Position not found" },
        { status: 404 }
      )
    }

    if (position.workspaceId !== auth.workspaceId) {
      return NextResponse.json(
        { error: "Position does not belong to workspace" },
        { status: 403 }
      )
    }

    if (position.userId !== null) {
      return NextResponse.json(
        { error: "Position is already occupied" },
        { status: 409 }
      )
    }

    // Step 3: Validate Request Body
    const body = await request.json()
    const { email, role = 'MEMBER', viewerScopeType, viewerScopeRefId } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Validate role
    const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Hardening: Reject OWNER role for position-based invites
    // OWNER role should not be tied to a specific position
    if (role === 'OWNER') {
      return NextResponse.json(
        { error: "OWNER role cannot be assigned via position-based invites. Use workspace-based invites instead." },
        { status: 400 }
      )
    }

    // Get creator's role (for defense-in-depth)
    const creatorMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: auth.workspaceId,
          userId: auth.user.userId
        }
      },
      select: { role: true }
    })

    if (!creatorMember) {
      return NextResponse.json(
        { error: "Creator is not a member of this workspace" },
        { status: 403 }
      )
    }


    // Validate viewerScopeType (if provided)
    if (viewerScopeType !== undefined && viewerScopeType !== null) {
      const validScopeTypes = ['WORKSPACE_READONLY', 'TEAM_READONLY', 'PROJECTS_ONLY']
      if (!validScopeTypes.includes(viewerScopeType)) {
        return NextResponse.json(
          { error: `Invalid viewerScopeType. Must be one of: ${validScopeTypes.join(', ')}` },
          { status: 400 }
        )
      }
      
      // viewerScopeType can only be set for VIEWER role
      if (role !== 'VIEWER') {
        return NextResponse.json(
          { error: "viewerScopeType can only be set for VIEWER role" },
          { status: 400 }
        )
      }
      
      // viewerScopeRefId is required for TEAM_READONLY
      if (viewerScopeType === 'TEAM_READONLY' && !viewerScopeRefId) {
        return NextResponse.json(
          { error: "viewerScopeRefId is required when viewerScopeType is TEAM_READONLY" },
          { status: 400 }
        )
      }
    }

    // Step 4: Check Existing Member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: auth.workspaceId,
            userId: existingUser.id
          }
        }
      })

      if (existingMember) {
        return NextResponse.json(
          { error: "User is already a member of this workspace" },
          { status: 409 }
        )
      }
    }

    // Step 5: Handle Duplicate Invites
    const now = new Date()
    const existingInvite = await prismaUnscoped.workspaceInvite.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        email: normalizedEmail,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { gt: now }
      }
    })

    if (existingInvite) {
      await prismaUnscoped.workspaceInvite.update({
        where: { id: existingInvite.id },
        data: { revokedAt: now }
      })
    }

    // Step 6: Generate Token & Create Invite
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await prismaUnscoped.workspaceInvite.create({
      data: {
        workspaceId: auth.workspaceId,
        positionId: positionId,
        email: normalizedEmail,
        role: role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
        viewerScopeType: viewerScopeType || null,
        viewerScopeRefId: viewerScopeRefId || null,
        createdByRole: creatorMember.role,
        token: token,
        expiresAt: expiresAt,
        createdByUserId: auth.user.userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXTAUTH_URL || 
                   'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invites/${token}`

    const durationMs = Date.now() - startTime
    logger.info('Position-based invite created', {
      ...baseContext,
      inviteId: invite.id,
      positionId: positionId,
      // Log email domain only for privacy (not full email)
      inviteEmailDomain: invite.email.split('@')[1] || 'unknown',
      role: invite.role,
      durationMs,
    })
    // CRITICAL: Never log invite token or full inviteUrl - security risk

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      positionId: invite.positionId,
      token: invite.token,
      inviteUrl,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      createdBy: invite.createdBy
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    logger.error('Error in /api/org/positions/[positionId]/invite', {
      ...baseContext,
      durationMs,
      // CRITICAL: Never log invite token or sensitive invite data
    }, error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Map specific error codes
    if (errorMessage.includes('Position is already occupied')) {
      return NextResponse.json(
        { error: "Position is already occupied" },
        { status: 409 }
      )
    }
    
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(
        { 
          error: errorMessage,
          details: error instanceof Error ? {
            name: error.name,
            stack: error.stack?.split('\n').slice(0, 10).join('\n'),
          } : {}
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    )
  }
}
