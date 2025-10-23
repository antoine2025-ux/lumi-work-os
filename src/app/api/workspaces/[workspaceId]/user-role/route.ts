import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/simple-auth'

// GET /api/workspaces/[workspaceId]/user-role - Get user's role in a workspace
export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const user = await requireAuth()
    const { workspaceId } = await params

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspaceId
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
    console.error('Error fetching user role:', error)
    return NextResponse.json({ error: 'Failed to fetch user role' }, { status: 500 })
  }
}