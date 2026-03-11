import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import {
  CreateActionItemSchema,
  UpdateActionItemSchema,
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
// GET /api/one-on-ones/meetings/[meetingId]/action-items
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

    const items = await prisma.oneOnOneActionItem.findMany({
      where: { meetingId, workspaceId: auth.workspaceId },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/one-on-ones/meetings/[meetingId]/action-items
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
    const data = CreateActionItemSchema.parse(body)

    const item = await prisma.oneOnOneActionItem.create({
      data: {
        workspaceId: auth.workspaceId,
        meetingId,
        content: data.content,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate ?? null,
        status: 'OPEN',
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// PUT /api/one-on-ones/meetings/[meetingId]/action-items
// Body must include { id: string } to identify the action item
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
        { error: 'Action item id is required' },
        { status: 400 }
      )
    }

    const data = UpdateActionItemSchema.parse(rest)

    // Verify the action item belongs to this meeting
    const existing = await prisma.oneOnOneActionItem.findFirst({
      where: { id, meetingId, workspaceId: auth.workspaceId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Action item not found' },
        { status: 404 }
      )
    }

    const updated = await prisma.oneOnOneActionItem.update({
      where: { id },
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
      },
    })

    return NextResponse.json(updated)
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// DELETE /api/one-on-ones/meetings/[meetingId]/action-items
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
    const itemId = searchParams.get('id')

    if (!itemId) {
      return NextResponse.json(
        { error: 'Action item id is required as query param' },
        { status: 400 }
      )
    }

    const existing = await prisma.oneOnOneActionItem.findFirst({
      where: { id: itemId, meetingId, workspaceId: auth.workspaceId },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Action item not found' },
        { status: 404 }
      )
    }

    await prisma.oneOnOneActionItem.delete({ where: { id: itemId } })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
