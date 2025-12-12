import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'

// GET /api/workspaces/[workspaceId]/user-role - Get user's role in a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    // Authentication check
    const auth = await getUnifiedAuth(request)
    const { workspaceId } = await params

    // Security: Use composite key lookup and verify membership exists
    // This is the authorization gate - if user isn't a member, they can't query role
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: auth.user.userId
        }
      },
      select: {
        role: true,
        joinedAt: true
      }
    })

    if (!membership) {
      return NextResponse.json({ error: 'User not found in workspace' }, { status: 404 })
    }

    return NextResponse.json({
      role: membership.role,
      joinedAt: membership.joinedAt
    })
  } catch (error) {
    // Error handling - don't log sensitive data
    return NextResponse.json({ error: 'Failed to fetch user role' }, { status: 500 })
  }
}