import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { handleApiError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { ProjectPersonCreateSchema } from '@/lib/validations/project-people'
import { upsertProjectContext } from '@/lib/loopbrain/context-engine'
import { upsertIntegrationAllocation } from '@/lib/org/capacity/project-capacity'

// ---------------------------------------------------------------------------
// GET /api/projects/[projectId]/people — List people linked to a project
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request)
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER'],
    })
    setWorkspaceContext(auth.workspaceId)

    const { projectId } = await params

    const links = await prisma.projectPersonLink.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        orgPosition: {
          select: {
            id: true,
            title: true,
            team: {
              select: {
                id: true,
                name: true,
                department: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const people = links.map((link) => ({
      id: link.id,
      userId: link.userId,
      name: link.user.name,
      email: link.user.email,
      image: link.user.image,
      title: link.orgPosition?.title ?? null,
      team: link.orgPosition?.team?.name ?? null,
      department: link.orgPosition?.team?.department?.name ?? null,
      role: link.role,
      allocatedHours: link.allocatedHours,
      startDate: link.startDate?.toISOString() ?? null,
      endDate: link.endDate?.toISOString() ?? null,
    }))

    return NextResponse.json({ people })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ---------------------------------------------------------------------------
// POST /api/projects/[projectId]/people — Add a person to a project
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
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

    const { projectId } = await params
    const body = await request.json()
    const parsed = ProjectPersonCreateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { userId, role, orgPositionId, allocatedHours, startDate, endDate } = parsed.data

    // Auto-resolve orgPositionId if not provided
    let resolvedOrgPositionId = orgPositionId ?? null
    if (!resolvedOrgPositionId) {
      const position = await prisma.orgPosition.findFirst({
        where: { userId, workspaceId: auth.workspaceId, isActive: true },
        select: { id: true },
      })
      resolvedOrgPositionId = position?.id ?? null
    }

    const link = await prisma.projectPersonLink.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: {
        projectId,
        userId,
        orgPositionId: resolvedOrgPositionId,
        role,
        allocatedHours: allocatedHours ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        workspaceId: auth.workspaceId,
      },
      update: {
        orgPositionId: resolvedOrgPositionId,
        role,
        allocatedHours: allocatedHours ?? null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    // Fire-and-forget: refresh Loopbrain project context
    upsertProjectContext(projectId).catch(() => {})

    // Auto-create WorkAllocation for the added person (best-effort, never blocks response)
    try {
      await upsertIntegrationAllocation(auth.workspaceId, userId, projectId, auth.user.userId)
    } catch (err: unknown) {
      console.error('Failed to create integration allocation for project member', {
        projectId,
        userId,
        error: err,
      })
    }

    return NextResponse.json(link, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
