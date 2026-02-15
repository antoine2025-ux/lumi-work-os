import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { UpdateSeriesSchema } from '@/lib/validations/one-on-ones'

type RouteContext = { params: Promise<{ seriesId: string }> }

/**
 * Helper to verify caller is a participant of the series (or ADMIN+).
 */
async function assertSeriesParticipant(
  seriesId: string,
  userId: string,
  workspaceId: string
) {
  const series = await prisma.oneOnOneSeries.findFirst({
    where: { id: seriesId, workspaceId },
    select: { managerId: true, employeeId: true },
  })

  if (!series) {
    throw new Error('Not found')
  }

  if (series.managerId !== userId && series.employeeId !== userId) {
    // Check if user is ADMIN+
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { role: true },
    })
    if (!member || !['ADMIN', 'OWNER'].includes(member.role)) {
      throw new Error('Forbidden')
    }
  }

  return series
}

// ============================================================================
// GET /api/one-on-ones/series/[seriesId]
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { seriesId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)
    await assertSeriesParticipant(seriesId, auth.user.userId, auth.workspaceId)

    const series = await prisma.oneOnOneSeries.findFirst({
      where: { id: seriesId, workspaceId: auth.workspaceId },
      include: {
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        meetings: {
          orderBy: { scheduledAt: 'desc' },
          take: 20,
          include: {
            _count: {
              select: { talkingPoints: true, actionItems: true },
            },
          },
        },
      },
    })

    if (!series) {
      return NextResponse.json({ error: 'Series not found' }, { status: 404 })
    }

    return NextResponse.json(series)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PUT /api/one-on-ones/series/[seriesId]
// ============================================================================

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { seriesId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    // Only the manager (or ADMIN+) can update series settings
    const series = await assertSeriesParticipant(
      seriesId,
      auth.user.userId,
      auth.workspaceId
    )

    if (series.managerId !== auth.user.userId) {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: auth.workspaceId, userId: auth.user.userId },
        select: { role: true },
      })
      if (!member || !['ADMIN', 'OWNER'].includes(member.role)) {
        return NextResponse.json(
          { error: 'Only the manager can update series settings' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const data = UpdateSeriesSchema.parse(body)

    const updated = await prisma.oneOnOneSeries.update({
      where: { id: seriesId },
      data: {
        ...(data.frequency !== undefined && { frequency: data.frequency }),
        ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
        ...(data.duration !== undefined && { duration: data.duration }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// DELETE /api/one-on-ones/series/[seriesId] — Deactivate (soft delete)
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { seriesId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)
    await assertSeriesParticipant(seriesId, auth.user.userId, auth.workspaceId)

    // Soft delete: deactivate the series
    const updated = await prisma.oneOnOneSeries.update({
      where: { id: seriesId },
      data: { isActive: false },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, request)
  }
}
