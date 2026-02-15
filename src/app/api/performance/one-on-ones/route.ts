import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'

// ============================================================================
// Schemas
// ============================================================================

const CreateMeetingSchema = z.object({
  employeeId: z.string(),
  managerId: z.string(),
  scheduledAt: z.coerce.date(),
})

// ============================================================================
// GET /api/performance/one-on-ones
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const managerId = searchParams.get('managerId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      workspaceId: auth.workspaceId,
    }

    if (employeeId) where.employeeId = employeeId
    if (managerId) where.managerId = managerId
    if (status) where.status = status

    const meetings = await prisma.oneOnOneMeeting.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { scheduledAt: 'desc' },
    })

    return NextResponse.json(meetings)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/performance/one-on-ones
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

    const meeting = await prisma.oneOnOneMeeting.create({
      data: {
        workspaceId: auth.workspaceId,
        employeeId: data.employeeId,
        managerId: data.managerId,
        scheduledAt: data.scheduledAt,
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
  } catch (error) {
    return handleApiError(error, request)
  }
}
