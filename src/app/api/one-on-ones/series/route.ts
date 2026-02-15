import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { CreateSeriesSchema } from '@/lib/validations/one-on-ones'

// ============================================================================
// GET /api/one-on-ones/series — List user's 1:1 series
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

    const series = await prisma.oneOnOneSeries.findMany({
      where: {
        workspaceId: auth.workspaceId,
        OR: [
          { managerId: auth.user.userId },
          { employeeId: auth.user.userId },
        ],
      },
      include: {
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: { select: { meetings: true } },
        meetings: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const result = series.map((s) => ({
      ...s,
      nextMeeting: s.meetings[0] ?? null,
      meetings: undefined,
    }))

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/one-on-ones/series — Create new 1:1 series
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
    const data = CreateSeriesSchema.parse(body)

    // Verify the employee exists as a workspace member
    const employeeMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        userId: data.employeeId,
      },
    })

    if (!employeeMembership) {
      return NextResponse.json(
        { error: 'Employee is not a member of this workspace' },
        { status: 400 }
      )
    }

    const series = await prisma.oneOnOneSeries.create({
      data: {
        workspaceId: auth.workspaceId,
        managerId: auth.user.userId,
        employeeId: data.employeeId,
        frequency: data.frequency,
        dayOfWeek: data.dayOfWeek ?? null,
        duration: data.duration ?? 30,
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

    return NextResponse.json(series, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
