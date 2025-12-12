import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma, prismaUnscoped } from "@/lib/db"
import { randomBytes } from "crypto"
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'

// POST /api/workspaces/[workspaceId]/invites - Create invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const startTime = Date.now()
  let baseContext
  try {
    baseContext = await buildLogContextFromRequest(request)
  } catch (error) {
    // If building context fails, create minimal context
    baseContext = {
      requestId: request.headers.get('x-request-id') ?? undefined,
      route: request.nextUrl.pathname,
      method: request.method,
    }
  }
  
  logger.info('Incoming request /api/workspaces/[workspaceId]/invites', baseContext)
  
  try {
    const { workspaceId } = await params
    
    // Get auth - handle unauthorized errors separately
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
      // Re-throw other auth errors to be handled as 500
      throw authError
    }
    
    // Ensure workspaceId from route matches auth context (avoid cross-workspace leaks)
    if (auth.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID mismatch" },
        { status: 403 }
      )
    }
    
    // Assert user has OWNER or ADMIN role to create invites
    // Handle access denied errors separately (403, not 500)
    try {
      await assertAccess({ 
        userId: auth.user.userId, 
        workspaceId: workspaceId, 
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
      // Re-throw other access errors to be handled as 500
      throw accessError
    }

    // Set workspace context for Prisma middleware (only needed for scoped models)
    // WorkspaceInvite is not in WORKSPACE_SCOPED_MODELS, but we set it anyway for consistency
    setWorkspaceContext(workspaceId)

    const body = await request.json()
    const { email, role = 'MEMBER', viewerScopeType, viewerScopeRefId } = body

    // Validate required fields
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

    // Normalize email (lowercase + trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Validate role
    const validRoles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Get creator's role (for defense-in-depth)
    const creatorMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
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

    // Role restrictions: Non-OWNER cannot invite OWNER
    if (role === 'OWNER' && creatorMember.role !== 'OWNER') {
      return NextResponse.json(
        { error: "Only workspace owners can invite other owners" },
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

    // Check if user is already a member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
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

    // Check for existing pending invite (not revoked, not accepted, not expired)
    // Use prismaUnscoped since WorkspaceInvite is not a scoped model
    const now = new Date()
    const existingInvite = await prismaUnscoped.workspaceInvite.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { gt: now }
      }
    })

    // If existing pending invite, revoke it before creating new one
    if (existingInvite) {
      await prismaUnscoped.workspaceInvite.update({
        where: { id: existingInvite.id },
        data: { revokedAt: now }
      })
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')

    // Default expiry: 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invite
    // Note: WorkspaceInvite is not in WORKSPACE_SCOPED_MODELS, so scoping middleware won't interfere
    // We're setting workspaceId explicitly in the data
    logger.info('Creating workspace invite', {
      ...baseContext,
      email: normalizedEmail,
      role,
      workspaceId,
      tokenLength: token.length,
      createdByUserId: auth.user.userId,
    })
    
    // Ensure role is a valid WorkspaceRole type
    const inviteRole = role as 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
    
    // Prepare invite data
    const inviteData = {
      workspaceId,
      email: normalizedEmail,
      role: inviteRole,
      token,
      expiresAt,
      createdByUserId: auth.user.userId,
      createdByRole: creatorMember.role,  // Defense-in-depth
      viewerScopeType: viewerScopeType || null,
      viewerScopeRefId: viewerScopeRefId || null
    }
    
    console.log('Creating invite with data:', {
      ...inviteData,
      token: '[REDACTED]', // Don't log the actual token
      expiresAt: inviteData.expiresAt.toISOString(),
    })
    
    // Use prismaUnscoped since WorkspaceInvite is not a scoped model
    // This avoids any potential issues with workspace scoping middleware
    let invite
    try {
      invite = await prismaUnscoped.workspaceInvite.create({
        data: inviteData,
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
      console.log('? Invite created successfully:', invite.id)
    } catch (createError) {
      console.error('? Prisma create error:', createError)
      if (createError instanceof Error) {
        console.error('Error name:', createError.name)
        console.error('Error message:', createError.message)
        console.error('Error stack:', createError.stack)
        // Check for common Prisma errors
        if (createError.message.includes('Unique constraint')) {
          console.error('? Unique constraint violation - token or email might already exist')
        }
        if (createError.message.includes('Foreign key constraint')) {
          console.error('? Foreign key constraint violation - workspaceId or createdByUserId might be invalid')
        }
      }
      // Re-throw to be caught by outer catch
      throw createError
    }

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.NEXTAUTH_URL || 
                   'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invites/${token}`

    const durationMs = Date.now() - startTime
    logger.info('Workspace invite created', {
      ...baseContext,
      inviteId: invite.id,
      inviteEmail: invite.email,
      role: invite.role,
      durationMs,
    })

    // Log slow requests
    if (durationMs > 500) {
      logger.warn('Slow request /api/workspaces/[workspaceId]/invites', {
        ...baseContext,
        durationMs,
      })
    }

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      inviteUrl,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      createdBy: invite.createdBy
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    logger.error('Error in /api/workspaces/[workspaceId]/invites', {
      ...baseContext,
      durationMs,
    }, error)
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('Invite creation error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      })
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // In development, return the actual error message for debugging
    // In production, return a generic message
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
    
    // Production: return generic error
    return NextResponse.json(
      { 
        error: "Failed to create invite"
      },
      { status: 500 }
    )
  }
}

// GET /api/workspaces/[workspaceId]/invites - List pending invites
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const startTime = Date.now()
  let baseContext
  try {
    baseContext = await buildLogContextFromRequest(request)
  } catch (error) {
    // If building context fails, create minimal context
    baseContext = {
      requestId: request.headers.get('x-request-id') ?? undefined,
      route: request.nextUrl.pathname,
      method: request.method,
    }
  }
  
  logger.info('Incoming request GET /api/workspaces/[workspaceId]/invites', baseContext)
  
  try {
    const { workspaceId } = await params
    const auth = await getUnifiedAuth(request)
    
    // Ensure workspaceId from route matches auth context
    if (auth.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID mismatch" },
        { status: 403 }
      )
    }
    
    // Assert user has OWNER or ADMIN role to list invites
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: workspaceId, 
      scope: 'workspace', 
      requireRole: ['OWNER', 'ADMIN'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(workspaceId)

    // Get pending invites: not revoked, not accepted, not expired
    // Use prismaUnscoped since WorkspaceInvite is not a scoped model
    const now = new Date()
    const invites = await prismaUnscoped.workspaceInvite.findMany({
      where: {
        workspaceId,
        revokedAt: null,
        acceptedAt: null,
        expiresAt: { gt: now }
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const durationMs = Date.now() - startTime
    logger.info('Workspace invites fetched', {
      ...baseContext,
      inviteCount: invites.length,
      durationMs,
    })

    return NextResponse.json({ invites })
  } catch (error) {
    const durationMs = Date.now() - startTime
    logger.error('Error in GET /api/workspaces/[workspaceId]/invites', {
      ...baseContext,
      durationMs,
    }, error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to fetch invites", details: errorMessage },
      { status: 500 }
    )
  }
}
