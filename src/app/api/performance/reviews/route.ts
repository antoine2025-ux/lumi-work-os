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

const CreateReviewSchema = z.object({
  employeeId: z.string(),
  managerId: z.string(),
  period: z.string(), // "2026-Q1", "2026-H1", "2026"
  goalIds: z.array(z.string()).optional().default([]),
})

// ============================================================================
// GET /api/performance/reviews - List reviews
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
    const period = searchParams.get('period')

    const where: Record<string, unknown> = {
      workspaceId: auth.workspaceId,
    }

    if (employeeId) where.employeeId = employeeId
    if (managerId) where.managerId = managerId
    if (status) where.status = status
    if (period) where.period = period

    const reviews = await prisma.performanceReview.findMany({
      where,
      include: {
        employee: {
          select: { id: true, name: true, email: true, image: true },
        },
        manager: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reviews)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/performance/reviews - Create review
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
    const data = CreateReviewSchema.parse(body)

    // Check for existing review
    const existing = await prisma.performanceReview.findFirst({
      where: {
        workspaceId: auth.workspaceId,
        employeeId: data.employeeId,
        period: data.period,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A review already exists for this employee and period' },
        { status: 409 }
      )
    }

    const review = await prisma.performanceReview.create({
      data: {
        workspaceId: auth.workspaceId,
        employeeId: data.employeeId,
        managerId: data.managerId,
        period: data.period,
        goalIds: data.goalIds,
        status: 'DRAFT',
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

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
