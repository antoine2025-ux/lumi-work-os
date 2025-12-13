import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'

// GET /api/project-spaces/[id]/members - List members of a ProjectSpace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    const projectSpaceId = resolvedParams.id

    if (!projectSpaceId) {
      return NextResponse.json({ error: 'ProjectSpace ID is required' }, { status: 400 })
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

    // Only ADMIN/OWNER can view members
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER']
    })

    // Set workspace context
    setWorkspaceContext(auth.workspaceId)

    // Get members
    const members = await prisma.projectSpaceMember.findMany({
      where: { projectSpaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    return NextResponse.json({ members })
  } catch (error: any) {
    console.error('Error fetching ProjectSpace members:', error)
    
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden: Only workspace administrators can manage ProjectSpace members' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch members' 
    }, { status: 500 })
  }
}

// POST /api/project-spaces/[id]/members - Add a member to ProjectSpace
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    const resolvedParams = await params
    const projectSpaceId = resolvedParams.id

    if (!projectSpaceId) {
      return NextResponse.json({ error: 'ProjectSpace ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
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

    // Only ADMIN/OWNER can add members
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER']
    })

    // Verify user is a workspace member
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: auth.workspaceId,
          userId
        }
      }
    })

    if (!workspaceMember) {
      return NextResponse.json({ error: 'User is not a member of this workspace' }, { status: 400 })
    }

    // Check if already a member
    const existingMember = await prisma.projectSpaceMember.findUnique({
      where: {
        projectSpaceId_userId: {
          projectSpaceId,
          userId
        }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this ProjectSpace' }, { status: 400 })
    }

    // Set workspace context
    setWorkspaceContext(auth.workspaceId)

    // Add member
    const member = await prisma.projectSpaceMember.create({
      data: {
        projectSpaceId,
        userId
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

    return NextResponse.json({ member }, { status: 201 })
  } catch (error: any) {
    console.error('Error adding ProjectSpace member:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'User is already a member of this ProjectSpace' }, { status: 400 })
    }
    
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden: Only workspace administrators can manage ProjectSpace members' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to add member' 
    }, { status: 500 })
  }
}
