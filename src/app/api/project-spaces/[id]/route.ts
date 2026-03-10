import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { handleApiError } from '@/lib/api-errors'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'

// @deprecated Use /api/spaces/[id] instead (unified Space model, Sprint 2).

// GET /api/project-spaces/[id] - Get a single ProjectSpace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.warn('[DEPRECATED] GET /api/project-spaces/[id] — use GET /api/spaces/[id] instead')
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
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
