import { NextRequest, NextResponse } from "next/server"
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from "@/lib/db"

// DELETE /api/workspaces/[workspaceId]/invites/[inviteId] - Revoke invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; inviteId: string }> }
) {
  try {
    const { workspaceId, inviteId } = await params
    const auth = await getUnifiedAuth(request)
    
    // Ensure workspaceId from route matches auth context
    if (auth.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID mismatch" },
        { status: 403 }
      )
    }
    
    // Assert user has OWNER or ADMIN role to revoke invites
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: workspaceId, 
      scope: 'workspace', 
      requireRole: ['OWNER', 'ADMIN'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(workspaceId)

    // Find invite and verify it belongs to this workspace
    const invite = await prisma.workspaceInvite.findUnique({
      where: { id: inviteId }
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      )
    }

    if (invite.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Invite does not belong to this workspace" },
        { status: 403 }
      )
    }

    // Soft revoke: Set revokedAt instead of deleting
    const revokedInvite = await prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { revokedAt: new Date() }
    })

    return NextResponse.json({
      message: "Invite revoked successfully",
      invite: {
        id: revokedInvite.id,
        email: revokedInvite.email,
        revokedAt: revokedInvite.revokedAt
      }
    })
  } catch (error) {
    console.error("Error revoking invite:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: "Failed to revoke invite", details: errorMessage },
      { status: 500 }
    )
  }
}
