import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from "@/lib/db"
import { logger } from '@/lib/logger'
import { buildLogContextFromRequest } from '@/lib/request-context'

// POST /api/invites/[token]/accept - Accept workspace invite
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const startTime = Date.now()
  const baseContext = await buildLogContextFromRequest(request)
  
  logger.info('Incoming request /api/invites/[token]/accept', baseContext)
  
  try {
    const { token } = await params
    const auth = await getUnifiedAuth(request)
    
    // User must be logged in
    if (!auth.isAuthenticated || !auth.user.userId) {
      return NextResponse.json(
        { error: "Authentication required to accept invite" },
        { status: 401 }
      )
    }

    // Find invite by token
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      )
    }

    // Validate invite status
    const now = new Date()
    if (invite.revokedAt) {
      return NextResponse.json(
        { error: "This invite has been revoked" },
        { status: 410 }
      )
    }

    if (invite.acceptedAt) {
      return NextResponse.json(
        { error: "This invite has already been accepted" },
        { status: 409 }
      )
    }

    if (invite.expiresAt < now) {
      return NextResponse.json(
        { error: "This invite has expired" },
        { status: 410 }
      )
    }

    // Verify email matches logged-in user's email (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
      select: { email: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: "This invite was sent to a different email address" },
        { status: 403 }
      )
    }

    // Set workspace context for Prisma middleware
    setWorkspaceContext(invite.workspaceId)

    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId: auth.user.userId
        }
      }
    })

    // Role hierarchy for upgrades (higher number = higher privilege)
    const roleHierarchy: Record<string, number> = {
      VIEWER: 1,
      MEMBER: 2,
      ADMIN: 3,
      OWNER: 4
    }

    let finalRole = invite.role

    if (existingMember) {
      // User already a member - upgrade role if invite role is higher
      const currentRoleLevel = roleHierarchy[existingMember.role] || 0
      const inviteRoleLevel = roleHierarchy[invite.role] || 0

      if (inviteRoleLevel > currentRoleLevel) {
        // Upgrade role
        await prisma.workspaceMember.update({
          where: {
            workspaceId_userId: {
              workspaceId: invite.workspaceId,
              userId: auth.user.userId
            }
          },
          data: { role: invite.role as any }
        })
        finalRole = invite.role
      } else {
        // Keep existing role (never downgrade silently)
        finalRole = existingMember.role
      }
    } else {
      // Create new membership
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: auth.user.userId,
          role: invite.role as any
        }
      })
    }

    // Mark invite as accepted
    await prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: now }
    })

    const durationMs = Date.now() - startTime
    logger.info('Workspace invite accepted', {
      ...baseContext,
      workspaceId: invite.workspaceId,
      role: finalRole,
      durationMs,
    })

    return NextResponse.json({
      success: true,
      workspaceId: invite.workspaceId,
      role: finalRole,
      workspace: {
        id: invite.workspace.id,
        name: invite.workspace.name,
        slug: invite.workspace.slug
      }
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    logger.error('Error in /api/invites/[token]/accept', {
      ...baseContext,
      durationMs,
    }, error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to accept invite", details: errorMessage },
      { status: 500 }
    )
  }
}
