import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from "@/lib/db"
import { randomBytes } from "crypto"
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'

// POST /api/workspaces/[workspaceId]/invites - Create invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const startTime = Date.now()
  const baseContext = await buildLogContextFromRequest(request)
  
  logger.info('Incoming request /api/workspaces/[workspaceId]/invites', baseContext)
  
  try {
    const { workspaceId } = await params
    const auth = await getUnifiedAuth(request)
    
    // Ensure workspaceId from route matches auth context (avoid cross-workspace leaks)
    if (auth.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID mismatch" },
        { status: 403 }
      )
    }
    
    // Assert user has OWNER or ADMIN role to create invites
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: workspaceId, 
      scope: 'workspace', 
      requireRole: ['OWNER', 'ADMIN'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(workspaceId)

    const body = await request.json()
    const { email, role = 'MEMBER' } = body

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

    // Role restrictions: Non-OWNER cannot invite OWNER
    const userRole = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: auth.user.userId
        }
      },
      select: { role: true }
    })

    if (role === 'OWNER' && userRole?.role !== 'OWNER') {
      return NextResponse.json(
        { error: "Only workspace owners can invite other owners" },
        { status: 403 }
      )
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
    const now = new Date()
    const existingInvite = await prisma.workspaceInvite.findFirst({
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
      await prisma.workspaceInvite.update({
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
    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        role: role as any,
        token,
        expiresAt,
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
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to create invite", details: errorMessage },
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
  const baseContext = await buildLogContextFromRequest(request)
  
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
    const now = new Date()
    const invites = await prisma.workspaceInvite.findMany({
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
