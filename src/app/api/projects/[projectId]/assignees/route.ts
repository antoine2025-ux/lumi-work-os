import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { assertProjectAccess } from '@/lib/pm/guards'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'

// GET /api/projects/[projectId]/assignees - Get users who can be assigned to tasks in this project
// Policy B compliant: Only returns users who have project access
// ProjectSpace is not in the schema; assignable = workspace members (per guards.ts)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['VIEWER'] })
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params
    const projectId = resolvedParams.projectId

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Convert UnifiedAuthUser to NextAuth User format for assertProjectAccess
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any

    // Verify requester has access to the project
    await assertProjectAccess(nextAuthUser, projectId, undefined, auth.workspaceId)

    // Get project (no projectSpace - not in schema)
    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Workspace members can be assigned (ProjectSpace not in schema; matches guards.ts)
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId: auth.workspaceId },
      select: { userId: true }
    })
    const assignableUserIds = workspaceMembers.map(m => m.userId)

    // Get user details for assignable users
    const assignableUsers = await prisma.user.findMany({
      where: {
        id: {
          in: assignableUserIds
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ users: assignableUsers })
  } catch (error) {
    return handleApiError(error, request)
  }
}
