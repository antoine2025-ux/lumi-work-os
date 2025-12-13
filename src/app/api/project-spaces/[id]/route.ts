import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'

// GET /api/project-spaces/[id] - Get a single ProjectSpace
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

    // Assert workspace access
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['MEMBER'] 
    })

    // Set workspace context
    setWorkspaceContext(auth.workspaceId)

    // Get ProjectSpace
    const projectSpace = await prisma.projectSpace.findUnique({
      where: { id: projectSpaceId },
      select: {
        id: true,
        name: true,
        description: true,
        visibility: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!projectSpace) {
      return NextResponse.json({ error: 'ProjectSpace not found' }, { status: 404 })
    }

    // Verify it belongs to workspace
    if (projectSpace.workspaceId !== auth.workspaceId) {
      return NextResponse.json({ error: 'Forbidden: ProjectSpace does not belong to your workspace' }, { status: 403 })
    }

    return NextResponse.json(projectSpace)
  } catch (error) {
    console.error('Error fetching project space:', error)
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch project space' 
    }, { status: 500 })
  }
}
