import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'

// GET /api/org/users - Get all users available for org position assignment
export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)
    
    // Assert workspace access (VIEWER can read org structure)
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] 
    })

    // Set workspace context for Prisma middleware
    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Get workspace members
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: auth.workspaceId
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
        workspaceId: auth.workspaceId,
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
