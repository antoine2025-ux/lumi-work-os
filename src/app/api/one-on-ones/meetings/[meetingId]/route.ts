import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { UpdateMeetingSchema } from '@/lib/validations/one-on-ones'

type RouteContext = { params: Promise<{ meetingId: string }> }

/**
 * Helper to verify caller is a participant of the meeting (or ADMIN+).
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

  return meeting
}

// ============================================================================
// GET /api/one-on-ones/meetings/[meetingId]
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

    const meeting = await prisma.oneOnOneMeeting.findFirst({
      where: { id: meetingId, workspaceId: auth.workspaceId },
      include: {
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
        series: {
          select: { id: true, frequency: true, duration: true },
        },
        talkingPoints: {
          orderBy: { sortOrder: 'asc' },
        },
        actionItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    return NextResponse.json(meeting)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PUT /api/one-on-ones/meetings/[meetingId]
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
    const data = UpdateMeetingSchema.parse(body)

    const updated = await prisma.oneOnOneMeeting.update({
      where: { id: meetingId },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.managerNotes !== undefined && { managerNotes: data.managerNotes }),
        ...(data.employeeNotes !== undefined && { employeeNotes: data.employeeNotes }),
        ...(data.sharedNotes !== undefined && { sharedNotes: data.sharedNotes }),
      },
      include: {
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
        talkingPoints: {
          orderBy: { sortOrder: 'asc' },
        },
        actionItems: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, request)
  }
}
