import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { CreateCycleSchema } from '@/lib/validations/performance'

// ============================================================================
// GET /api/performance/cycles - List performance cycles
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
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {
      workspaceId: auth.workspaceId,
    }

    if (status) where.status = status

    const cycles = await prisma.performanceCycle.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: {
            questions: true,
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // perf: eliminated N+1 — single groupBy across all cycleIds, aggregate in memory
    const cycleIds = cycles.map((c) => c.id)
    const allReviewStats = await prisma.performanceReview.groupBy({
      by: ['cycleId', 'status'],
      where: {
        workspaceId: auth.workspaceId,
        cycleId: { in: cycleIds },
      },
      _count: true,
    })

    // Group stats by cycleId for O(1) lookup
    const statsByCycleId = new Map<string, typeof allReviewStats>()
    for (const row of allReviewStats) {
      const key = row.cycleId
      if (!key) continue
      if (!statsByCycleId.has(key)) statsByCycleId.set(key, [])
      statsByCycleId.get(key)!.push(row)
    }

    const enrichedCycles = cycles.map((cycle) => {
      const reviewStats = statsByCycleId.get(cycle.id) ?? []
      const totalReviews = reviewStats.reduce((sum, s) => sum + s._count, 0)
      const submittedOrBeyond = reviewStats
        .filter((s) =>
          s.status != null &&
          ['SUBMITTED', 'IN_REVIEW', 'FINALIZED', 'COMPLETED'].includes(s.status)
        )
        .reduce((sum, s) => sum + s._count, 0)
      const finalized = reviewStats
        .filter((s) => s.status != null && ['FINALIZED', 'COMPLETED'].includes(s.status))
        .reduce((sum, s) => sum + s._count, 0)

      return {
        ...cycle,
        stats: {
          totalReviews,
          submittedOrBeyond,
          finalized,
          completionPercent:
            totalReviews > 0
              ? Math.round((finalized / totalReviews) * 100)
              : 0,
        },
      }
    })

    return NextResponse.json(enrichedCycles)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/performance/cycles - Create a new cycle (ADMIN only)
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = CreateCycleSchema.parse(body)

    const cycle = await prisma.performanceCycle.create({
      data: {
        workspaceId: auth.workspaceId,
        name: data.name,
        description: data.description,
        reviewType: data.reviewType,
        startDate: data.startDate,
        endDate: data.endDate,
        dueDate: data.dueDate,
        createdById: auth.user.userId,
        questions: {
          create: data.questions.map((q, idx) => ({
            workspaceId: auth.workspaceId,
            text: q.text,
            description: q.description,
            type: q.type,
            sortOrder: q.sortOrder ?? idx,
            isRequired: q.isRequired ?? true,
          })),
        },
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, image: true },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { reviews: true },
        },
      },
    })

    return NextResponse.json(cycle, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
