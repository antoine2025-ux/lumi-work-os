import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import {
  CreateTalkingPointSchema,
  UpdateTalkingPointSchema,
} from '@/lib/validations/one-on-ones'

type RouteContext = { params: Promise<{ meetingId: string }> }

/**
 * Verify the user is a participant of the meeting.
 */
async function assertMeetingParticipant(
  meetingId: string,
  userId: string,
  workspaceId: string
) {
  const meeting = await prisma.oneOnOneMeeting.findFirst({
    where: { id: meetingId, workspaceId },
    select: { managerId: true, employeeId: true },
  })

  if (!meeting) {
    throw new Error('Not found')
  }

  if (meeting.managerId !== userId && meeting.employeeId !== userId) {
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
      select: { role: true },
    })
    if (!member || !['ADMIN', 'OWNER'].includes(member.role)) {
      throw new Error('Forbidden')
    }
  }
}

// ============================================================================
// GET /api/one-on-ones/meetings/[meetingId]/talking-points
// ============================================================================

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { meetingId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)
    await assertMeetingParticipant(meetingId, auth.user.userId, auth.workspaceId)

    const points = await prisma.oneOnOneTalkingPoint.findMany({
      where: { meetingId, workspaceId: auth.workspaceId },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json(points)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/one-on-ones/meetings/[meetingId]/talking-points
// ============================================================================

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { meetingId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)
    await assertMeetingParticipant(meetingId, auth.user.userId, auth.workspaceId)

    const body = await request.json()
    const data = CreateTalkingPointSchema.parse(body)

    // Get the next sort order
    const maxOrder = await prisma.oneOnOneTalkingPoint.findFirst({
      where: { meetingId, workspaceId: auth.workspaceId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const point = await prisma.oneOnOneTalkingPoint.create({
      data: {
        workspaceId: auth.workspaceId,
        meetingId,
        content: data.content,
        addedBy: auth.user.userId,
        source: data.source ?? 'MANUAL',
        sourceId: data.sourceId ?? null,
        sortOrder: (maxOrder?.sortOrder ?? -1) + 1,
      },
    })

    return NextResponse.json(point, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PUT /api/one-on-ones/meetings/[meetingId]/talking-points
// Body must include { id: string } to identify the talking point
// ============================================================================

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { meetingId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)
    await assertMeetingParticipant(meetingId, auth.user.userId, auth.workspaceId)

    const body = await request.json()
    const { id, ...rest } = body
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Talking point id is required' },
        { status: 400 }
      )
    }

    const data = UpdateTalkingPointSchema.parse(rest)

    // Verify the talking point belongs to this meeting
    const existing = await prisma.oneOnOneTalkingPoint.findFirst({
      where: { id, meetingId, workspaceId: auth.workspaceId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Talking point not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.oneOnOneTalkingPoint.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.isDiscussed !== undefined && { isDiscussed: data.isDiscussed }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// DELETE /api/one-on-ones/meetings/[meetingId]/talking-points
// Body must include { id: string }
// ============================================================================

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { meetingId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)
    await assertMeetingParticipant(meetingId, auth.user.userId, auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const pointId = searchParams.get('id')

    if (!pointId) {
      return NextResponse.json(
        { error: 'Talking point id is required as query param' },
        { status: 400 }
      )
    }

    // Verify the talking point belongs to this meeting
    const existing = await prisma.oneOnOneTalkingPoint.findFirst({
      where: { id: pointId, meetingId, workspaceId: auth.workspaceId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Talking point not found' },
        { status: 404 }
      )
    }

    await prisma.oneOnOneTalkingPoint.delete({ where: { id: pointId } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
