import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { LaunchCycleSchema } from '@/lib/validations/performance'

// ============================================================================
// POST /api/performance/cycles/[cycleId]/launch
// Transitions SETUP → ACTIVE and bulk-creates reviews for participants
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cycleId: string }> }
) {
  try {
    const { cycleId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const { participantIds } = LaunchCycleSchema.parse(body)

    // Fetch cycle and verify it's in SETUP status
    const cycle = await prisma.performanceCycle.findFirst({
      where: { id: cycleId, workspaceId: auth.workspaceId },
    })

    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    if (cycle.status !== 'SETUP') {
      return NextResponse.json(
        { error: `Cycle must be in SETUP status to launch (current: ${cycle.status})` },
        { status: 400 }
      )
    }

    // Resolve manager relationships for each participant
    // Look up via PersonManagerLink first, fall back to OrgPosition.parentId
    const reviewRecords: Array<{
      workspaceId: string
      employeeId: string
      managerId: string
      period: string
      cycleId: string
      reviewerRole: 'SELF' | 'MANAGER'
      status: 'DRAFT'
    }> = []

    for (const employeeId of participantIds) {
      // Find the manager for this employee via OrgPosition parentId
      const employeePosition = await prisma.orgPosition.findFirst({
        where: {
          userId: employeeId,
          workspaceId: auth.workspaceId,
          isActive: true,
        },
        select: { parentId: true },
      })

      let managerId: string | null = null
      if (employeePosition?.parentId) {
        const managerPosition = await prisma.orgPosition.findFirst({
          where: {
            id: employeePosition.parentId,
            workspaceId: auth.workspaceId,
            isActive: true,
          },
          select: { userId: true },
        })
        managerId = managerPosition?.userId ?? null
      }

      // Fall back to PersonManagerLink if no OrgPosition manager found
      if (!managerId) {
        const managerLink = await prisma.personManagerLink.findFirst({
          where: {
            workspaceId: auth.workspaceId,
            personId: employeeId,
          },
          select: { managerId: true },
        })
        managerId = managerLink?.managerId ?? null
      }

      // Use the cycle creator as fallback manager if no manager found
      const effectiveManagerId = managerId ?? auth.user.userId

      const period = cycle.name // Use cycle name as period identifier

      // Create self-review if cycle allows it
      if (cycle.reviewType === 'SELF_ONLY' || cycle.reviewType === 'COMBINED') {
        reviewRecords.push({
          workspaceId: auth.workspaceId,
          employeeId,
          managerId: effectiveManagerId,
          period,
          cycleId: cycle.id,
          reviewerRole: 'SELF',
          status: 'DRAFT',
        })
      }

      // Create manager review if cycle allows it
      if (cycle.reviewType === 'MANAGER_ONLY' || cycle.reviewType === 'COMBINED') {
        reviewRecords.push({
          workspaceId: auth.workspaceId,
          employeeId,
          managerId: effectiveManagerId,
          period,
          cycleId: cycle.id,
          reviewerRole: 'MANAGER',
          status: 'DRAFT',
        })
      }
    }

    // Batch create reviews and transition cycle to ACTIVE
    const [updatedCycle] = await prisma.$transaction([
      prisma.performanceCycle.update({
        where: { id: cycleId },
        data: { status: 'ACTIVE' },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true, image: true },
          },
          _count: { select: { reviews: true, questions: true } },
        },
      }),
      ...reviewRecords.map((record) =>
        prisma.performanceReview.upsert({
          where: {
            workspaceId_employeeId_period_reviewerRole: {
              workspaceId: record.workspaceId,
              employeeId: record.employeeId,
              period: record.period,
              reviewerRole: record.reviewerRole,
            },
          },
          create: record,
          update: {}, // Don't update if already exists
        })
      ),
    ])

    return NextResponse.json({
      cycle: updatedCycle,
      reviewsCreated: reviewRecords.length,
      participantCount: participantIds.length,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
