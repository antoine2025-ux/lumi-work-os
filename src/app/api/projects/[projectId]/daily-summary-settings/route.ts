import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { assertProjectAccess } from '@/lib/pm/guards'
import { handleApiError } from '@/lib/api-errors'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const toggleDailySummarySchema = z.object({
  dailySummaryEnabled: z.boolean()
})

// PATCH /api/projects/[projectId]/daily-summary-settings - Toggle daily summary setting
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const validatedData = toggleDailySummarySchema.parse(body)

    // Get session and verify access
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Set workspace context for Prisma scoping
    const auth = await getUnifiedAuth(request)
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] })
    setWorkspaceContext(auth.workspaceId)

    // Get authenticated user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Check project access (require admin/owner to change settings) - development bypass
    let accessResult: any
    try {
      accessResult = await assertProjectAccess(user, projectId, 'ADMIN')
      if (!accessResult) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const project = await prisma.project.findUnique({ where: { id: projectId } })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      accessResult = { project, user: { id: session.user.id } }
    }

    // Update the project setting
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        dailySummaryEnabled: validatedData.dailySummaryEnabled
      },
      select: {
        id: true,
        name: true,
        dailySummaryEnabled: true
      }
    })

    return NextResponse.json({
      message: `Daily summaries ${validatedData.dailySummaryEnabled ? 'enabled' : 'disabled'} for project`,
      project: updatedProject
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
