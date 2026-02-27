import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { assertProjectAccess } from '@/lib/pm/guards'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'

// DELETE /api/projects/[projectId]/documentation/[docId] - Detach documentation from a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; docId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['MEMBER'] })
    setWorkspaceContext(auth.workspaceId)
    const resolvedParams = await params
    const { projectId, docId } = resolvedParams

    if (!projectId || !docId) {
      return NextResponse.json({ error: 'Project ID and documentation ID are required' }, { status: 400 })
    }

    // Check project access (require MEMBER or higher to detach docs)
    const nextAuthUser = {
      id: auth.user.userId,
      email: auth.user.email,
      name: auth.user.name
    } as any
    await assertProjectAccess(nextAuthUser, projectId, 'MEMBER')

    // Verify the documentation link exists and belongs to this project
    const documentationLink = await prisma.projectDocumentation.findUnique({
      where: { id: docId },
      select: { id: true, projectId: true }
    })

    if (!documentationLink) {
      return NextResponse.json({ error: 'Documentation link not found' }, { status: 404 })
    }

    if (documentationLink.projectId !== projectId) {
      return NextResponse.json({ 
        error: 'Documentation link does not belong to this project' 
      }, { status: 403 })
    }

    // Delete the documentation link
    await prisma.projectDocumentation.delete({
      where: { id: docId }
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    return handleApiError(error, request)
  }
}

