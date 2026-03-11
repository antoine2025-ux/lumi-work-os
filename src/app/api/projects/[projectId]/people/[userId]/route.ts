import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { ProjectPersonUpdateSchema } from '@/lib/validations/project-people'
import { upsertProjectContext } from '@/lib/loopbrain/context-engine'
import { removeIntegrationAllocation } from '@/lib/org/capacity/project-capacity'

// ---------------------------------------------------------------------------
// PUT /api/projects/[projectId]/people/[userId] — Update person's link
// ---------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { projectId, userId } = await params
    const body = await request.json()
    const parsed = ProjectPersonUpdateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const existing = await prisma.projectPersonLink.findUnique({
      where: { projectId_userId: { projectId, userId } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Person link not found' }, { status: 404 })
    }

    const updated = await prisma.projectPersonLink.update({
      where: { projectId_userId: { projectId, userId } },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.orgPositionId !== undefined && { orgPositionId: data.orgPositionId }),
        ...(data.allocatedHours !== undefined && { allocatedHours: data.allocatedHours }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    upsertProjectContext(projectId).catch(() => {})

    return NextResponse.json(updated)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/projects/[projectId]/people/[userId] — Remove person from project
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { projectId, userId } = await params

    const existing = await prisma.projectPersonLink.findUnique({
      where: { projectId_userId: { projectId, userId } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Person link not found' }, { status: 404 })
    }

    await prisma.projectPersonLink.delete({
      where: { projectId_userId: { projectId, userId } },
    })

    upsertProjectContext(projectId).catch(() => {})

    // Remove the INTEGRATION WorkAllocation for the removed person (best-effort, never blocks response)
    try {
      await removeIntegrationAllocation(auth.workspaceId, userId, projectId)
    } catch (err: unknown) {
      console.error('Failed to remove integration allocation for project member', {
        projectId,
        userId,
        error: err,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
