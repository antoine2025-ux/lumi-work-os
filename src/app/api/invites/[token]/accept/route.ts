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
    
    // For invite acceptance, we need to check auth differently
    // because getUnifiedAuth() throws if user has no workspace
    // But users accepting invites might not have a workspace yet
    let auth
    try {
      auth = await getUnifiedAuth(request)
    } catch (authError: any) {
      // If error is about no workspace, that's OK for invite acceptance
      // We'll check session directly instead
      if (authError?.message?.includes('No workspace found')) {
        // Get session directly to verify user is authenticated
        const { getServerSession } = await import('next-auth')
        const { authOptions } = await import('@/lib/auth')
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.email) {
          return NextResponse.json(
            { error: "Authentication required to accept invite" },
            { status: 401 }
          )
        }
        
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, email: true }
        })
        
        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 404 }
          )
        }
        
        // Create minimal auth context for invite acceptance
        auth = {
          isAuthenticated: true,
          user: {
            userId: user.id,
            email: user.email
          }
        } as any
      } else {
        // Re-throw other auth errors
        throw authError
      }
    }
    
    // User must be logged in
    if (!auth.isAuthenticated || !auth.user.userId) {
      return NextResponse.json(
        { error: "Authentication required to accept invite" },
        { status: 401 }
      )
    }

    // Find invite by token (initial fetch for workspace info)
    const invite = await prisma.workspaceInvite.findUnique({
      where: { token },
      select: {
        id: true,
        workspaceId: true,
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
      // Invite already accepted - check if user is a member and return workspace info
      // This allows the frontend to redirect to the workspace instead of showing an error
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invite.workspaceId,
            userId: auth.user.userId
          }
        }
      })

      if (existingMember) {
        // User is already a member - return success with workspace info for redirect
        logger.info('Invite already accepted, user is member, returning workspace info', {
          ...baseContext,
          workspaceId: invite.workspaceId,
          userId: auth.user.userId
        })

        return NextResponse.json({
          success: true,
          alreadyAccepted: true,
          workspaceId: invite.workspaceId,
          role: existingMember.role,
          workspace: {
            id: invite.workspace.id,
            name: invite.workspace.name,
            slug: invite.workspace.slug
          }
        })
      } else {
        // Invite was accepted but user is not a member (edge case - shouldn't happen)
        logger.warn('Invite already accepted but user is not a member', {
          ...baseContext,
          workspaceId: invite.workspaceId,
          userId: auth.user.userId
        })

        return NextResponse.json(
          { error: "This invite was already accepted, but you are not a member of the workspace" },
          { status: 409 }
        )
      }
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

    // CRITICAL: Everything in one transaction to prevent half-states
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Re-fetch invite inside transaction to ensure it's still valid
      const currentInvite = await tx.workspaceInvite.findUnique({
        where: { id: invite.id },
        select: {
          id: true,
          workspaceId: true,
          positionId: true,
          role: true,
          email: true,
          revokedAt: true,
          acceptedAt: true,
          expiresAt: true,
          createdByRole: true
        }
      })
      
      if (!currentInvite) {
        throw new Error('Invite not found')
      }
      
      // Step 2: Re-validate invite status inside transaction
      if (currentInvite.revokedAt) {
        throw new Error('This invite has been revoked') // 410
      }
      if (currentInvite.acceptedAt) {
        throw new Error('This invite was already accepted') // 409
      }
      if (currentInvite.expiresAt < now) {
        throw new Error('This invite has expired') // 410
      }
      
      // Step 2a: Defense-in-depth: Validate OWNER invite creator was OWNER
      if (currentInvite.role === 'OWNER' && currentInvite.createdByRole !== 'OWNER') {
        throw new Error('Invalid invite: Only workspace owners can create owner invites') // 403
      }
      
      // Step 3: Verify email matches (re-check inside transaction)
      if (user.email.toLowerCase() !== currentInvite.email.toLowerCase()) {
        throw new Error('This invite was sent to a different email address') // 403
      }
      
      // Step 4: Create or upgrade WorkspaceMember
      const existingMember = await tx.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: currentInvite.workspaceId,
            userId: auth.user.userId
          }
        }
      })
      
      const roleHierarchy: Record<string, number> = {
        VIEWER: 1, MEMBER: 2, ADMIN: 3, OWNER: 4
      }
      
      let finalRole = currentInvite.role
      
      if (existingMember) {
        // Upgrade role if invite role is higher
        const currentRoleLevel = roleHierarchy[existingMember.role] || 0
        const inviteRoleLevel = roleHierarchy[currentInvite.role] || 0
        
        if (inviteRoleLevel > currentRoleLevel) {
          await tx.workspaceMember.update({
            where: {
              workspaceId_userId: {
                workspaceId: currentInvite.workspaceId,
                userId: auth.user.userId
              }
            },
            data: { role: currentInvite.role as any }
          })
          finalRole = currentInvite.role
        } else {
          finalRole = existingMember.role
        }
      } else {
        // Create new membership
        await tx.workspaceMember.create({
          data: {
            workspaceId: currentInvite.workspaceId,
            userId: auth.user.userId,
            role: currentInvite.role as any
          }
        })
      }
      
      // Step 5: If position-based invite, assign user to position (atomic)
      let assignedPositionId: string | null = null
      
      if (currentInvite.positionId) {
        // 5a. Verify position exists and belongs to workspace (inside transaction)
        const position = await tx.orgPosition.findUnique({
          where: { id: currentInvite.positionId },
          select: { userId: true, workspaceId: true }
        })
        
        if (!position) {
          throw new Error('Position not found')
        }
        
        if (position.workspaceId !== currentInvite.workspaceId) {
          throw new Error('Position does not belong to workspace')
        }
        
        // 5b. If occupied by different user, throw 409
        if (position.userId && position.userId !== auth.user.userId) {
          throw new Error('Position already occupied')
        }
        
        // 5c. Remove user from other positions in same workspace (atomic)
        // Invariant: one position per user per workspace
        await tx.orgPosition.updateMany({
          where: {
            workspaceId: currentInvite.workspaceId,
            userId: auth.user.userId,
            id: { not: currentInvite.positionId }
          },
          data: { userId: null }
        })
        
        // 5d. Atomic conditional update: assign only if unoccupied
        const updateResult = await tx.orgPosition.updateMany({
          where: {
            id: currentInvite.positionId,
            userId: null  // CRITICAL: Only update if currently unoccupied
          },
          data: { userId: auth.user.userId }
        })
        
        // 5e. Verify update succeeded (race condition check)
        if (updateResult.count === 0) {
          throw new Error('Position already occupied')
        }
        
        assignedPositionId = currentInvite.positionId
      }
      
      // Step 6: Mark invite as accepted (inside same transaction)
      await tx.workspaceInvite.update({
        where: { id: currentInvite.id },
        data: { acceptedAt: now }
      })
      
      return { finalRole, assignedPositionId }
    })

    const durationMs = Date.now() - startTime
    logger.info('Workspace invite accepted', {
      ...baseContext,
      workspaceId: invite.workspaceId,
      role: result.finalRole,
      positionId: result.assignedPositionId,
      durationMs,
    })

    // Clear user-status cache to ensure fresh workspace resolution
    // This is critical after creating a new workspace membership
    try {
      const { cache, CACHE_KEYS } = await import('@/lib/cache')
      // Invalidate cache for this user - we'll use a pattern to clear all user-status caches
      // Since we don't have the session token here, we'll let the cache expire naturally
      // But we can add a header to tell the client to invalidate
      logger.info('Workspace membership created, cache will refresh on next request', {
        userId: auth.user.userId,
        workspaceId: invite.workspaceId
      })
    } catch (cacheError) {
      // Cache clearing is best-effort, don't fail the request
      logger.warn('Could not clear cache after invite acceptance', { error: cacheError })
    }

    const response = NextResponse.json({
      success: true,
      workspaceId: invite.workspaceId,
      role: result.finalRole,
      positionId: result.assignedPositionId || undefined,  // Only present if position was assigned
      workspace: {
        id: invite.workspace.id,
        name: invite.workspace.name,
        slug: invite.workspace.slug
      }
    })
    
    // Add header to tell client to invalidate cache
    response.headers.set('X-Invalidate-Cache', 'user-status')
    
    return response
  } catch (error) {
    const durationMs = Date.now() - startTime
    logger.error('Error in /api/invites/[token]/accept', {
      ...baseContext,
      durationMs,
    }, error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Map error messages to HTTP status codes
    if (errorMessage.includes('This invite has been revoked')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 410 }
      )
    }
    if (errorMessage.includes('This invite was already accepted')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      )
    }
    if (errorMessage.includes('This invite has expired')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 410 }
      )
    }
    if (errorMessage.includes('This invite was sent to a different email address')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      )
    }
    if (errorMessage.includes('Invalid invite: Only workspace owners')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      )
    }
    if (errorMessage.includes('Position already occupied')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 409 }
      )
    }
    if (errorMessage.includes('Position not found')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }
    if (errorMessage.includes('Invite not found')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to accept invite", details: errorMessage },
      { status: 500 }
    )
  }
}
