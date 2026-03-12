import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { CreateMeetingSchema } from '@/lib/validations/one-on-ones'

// ============================================================================
// GET /api/one-on-ones/meetings — List meetings for current user
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const seriesId = searchParams.get('seriesId')
    const status = searchParams.get('status')
    const upcoming = searchParams.get('upcoming') === 'true'
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

    const where: Record<string, unknown> = {
      workspaceId: auth.workspaceId,
      OR: [
        { managerId: auth.user.userId },
        { employeeId: auth.user.userId },
      ],
    }

    if (seriesId) where.seriesId = seriesId
    if (status) where.status = status
    if (upcoming) {
      where.scheduledAt = { gte: new Date() }
      where.status = { in: ['SCHEDULED', 'IN_PROGRESS'] }
    }

    const meetings = await prisma.oneOnOneMeeting.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
        series: {
          select: { id: true, frequency: true },
        },
        _count: {
          select: { talkingPoints: true, actionItems: true },
        },
      },
      orderBy: { scheduledAt: upcoming ? 'asc' : 'desc' },
      take: limit,
    })

    return NextResponse.json(meetings)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/one-on-ones/meetings — Create a meeting instance
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = CreateMeetingSchema.parse(body)

    // Verify participants are workspace members
    const participants = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: auth.workspaceId,
        userId: { in: [data.employeeId, data.managerId] },
      },
    })

    if (participants.length < 2) {
      return NextResponse.json(
        { error: 'Both participants must be workspace members' },
        { status: 400 }
      )
    }

    // Verify series exists if provided
    if (data.seriesId) {
      const series = await prisma.oneOnOneSeries.findFirst({
        where: { id: data.seriesId, workspaceId: auth.workspaceId },
      })
      if (!series) {
        return NextResponse.json(
          { error: 'Series not found' },
          { status: 404 }
        )
      }
    }

    const meeting = await prisma.oneOnOneMeeting.create({
      data: {
        workspaceId: auth.workspaceId,
        seriesId: data.seriesId ?? null,
        employeeId: data.employeeId,
        managerId: data.managerId,
        scheduledAt: data.scheduledAt,
        calendarEventId: data.calendarEventId ?? null,
        status: 'SCHEDULED',
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    return NextResponse.json(meeting, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
