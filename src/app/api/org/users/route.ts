import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/org/users - Get all users available for org position assignment
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || 'workspace-1'
    const search = searchParams.get('search')

    // Get workspace members
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    // Get users who are already assigned to positions
    const assignedUserIds = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: {
          not: null
        }
      },
      select: {
        userId: true
      }
    })

    const assignedIds = assignedUserIds.map(p => p.userId).filter(Boolean)

    // Filter out already assigned users and apply search
    let availableUsers = workspaceMembers
      .map(member => member.user)
      .filter(user => !assignedIds.includes(user.id))

    if (search) {
      const searchLower = search.toLowerCase()
      availableUsers = availableUsers.filter(user => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      )
    }

    return NextResponse.json(availableUsers)
  } catch (error) {
    console.error('Error fetching available users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
