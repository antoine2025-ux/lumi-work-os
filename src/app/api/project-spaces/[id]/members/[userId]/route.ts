import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'

// DELETE /api/project-spaces/[id]/members/[userId] - Remove a member from ProjectSpace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    const { id: projectSpaceId, userId } = resolvedParams

    if (!projectSpaceId || !userId) {
      return NextResponse.json({ error: 'ProjectSpace ID and User ID are required' }, { status: 400 })
    }

    // Get ProjectSpace to verify it belongs to workspace
    const projectSpace = await prisma.projectSpace.findUnique({
      where: { id: projectSpaceId },
      select: { workspaceId: true }
    })

    if (!projectSpace) {
      return NextResponse.json({ error: 'ProjectSpace not found' }, { status: 404 })
    }

    // Verify workspace membership
    if (projectSpace.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Forbidden: ProjectSpace does not belong to your workspace' }, { status: 403 })
    }

    // Only ADMIN/OWNER can remove members
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER']
    })

    // Set workspace context
    setWorkspaceContext(auth.workspaceId)

    // Check if member exists
    const member = await prisma.projectSpaceMember.findUnique({
      where: {
        projectSpaceId_userId: {
          projectSpaceId,
          userId
        }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Remove member
    await prisma.projectSpaceMember.delete({
      where: {
        projectSpaceId_userId: {
          projectSpaceId,
          userId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error removing ProjectSpace member:', error)
    
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden: Only workspace administrators can manage ProjectSpace members' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to remove member' 
    }, { status: 500 })
  }
}
