import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { recalculateGoalAnalytics } from '@/lib/goals/analytics-engine'

// ============================================================================
// Schemas
// ============================================================================

const CreateCheckInSchema = z.object({
  period: z.string(), // "2026-W07"
  progressUpdate: z.number().min(0).max(100).optional(),
  blockers: z.string().optional(),
  support: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

// ============================================================================
// GET /api/goals/[goalId]/check-ins - List check-ins
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period')

    const where: Record<string, unknown> = { goalId }
    if (period) where.period = period

    const checkIns = await prisma.goalCheckIn.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(checkIns)
  } catch (error) {
    return handleApiError(error, request)
  }
}

// ============================================================================
// POST /api/goals/[goalId]/check-ins - Submit check-in
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const { goalId } = await params
    const auth = await getUnifiedAuth(request)

    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: 'workspace',
      requireRole: ['MEMBER', 'ADMIN', 'OWNER'],
    })

    setWorkspaceContext(auth.workspaceId)

    const body = await request.json()
    const data = CreateCheckInSchema.parse(body)

    // Verify goal exists
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      select: { id: true, progress: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Auto-populate system updates from recent analytics
    const latestAnalytics = await prisma.goalAnalytics.findFirst({
      where: { goalId },
      orderBy: { calculatedAt: 'desc' },
    })

    // Auto-populate recommendations
    const activeRecommendations = await prisma.goalRecommendation.findMany({
      where: { goalId, status: 'PENDING' },
      take: 3,
      orderBy: { priority: 'desc' },
      select: { type: true, title: true, priority: true },
    })

    const systemUpdates = latestAnalytics
      ? {
          riskScore: latestAnalytics.riskScore,
          velocity: latestAnalytics.progressVelocity,
          projectedCompletion: latestAnalytics.projectedCompletion?.toISOString() ?? null,
          currentProgress: goal.progress,
        }
      : null

    const checkIn = await prisma.goalCheckIn.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        userId: auth.user.userId,
        period: data.period,
        progressUpdate: data.progressUpdate,
        blockers: data.blockers,
        support: data.support,
        confidence: data.confidence,
        systemUpdates: systemUpdates ?? undefined,
        recommendations: activeRecommendations.length > 0 ? activeRecommendations : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    })

    // If progress update provided, update goal progress and log it
    if (data.progressUpdate !== undefined) {
      const previousProgress = goal.progress

      await prisma.goal.update({
        where: { id: goalId },
        data: { progress: data.progressUpdate },
      })

      await prisma.goalProgressUpdate.create({
        data: {
          goalId,
          workspaceId: auth.workspaceId,
          triggeredBy: 'manual_update',
          sourceId: checkIn.id,
          previousProgress,
          newProgress: data.progressUpdate,
          confidence: data.confidence ?? 1.0,
          updatedById: auth.user.userId,
        },
      })

      // Recalculate analytics
      recalculateGoalAnalytics(goalId).catch(console.error)
    }

    // Log activity
    await prisma.goalUpdate.create({
      data: {
        goalId,
        workspaceId: auth.workspaceId,
        updateType: 'PROGRESS_UPDATE',
        content: `Check-in for ${data.period}${data.blockers ? ` — Blockers: ${data.blockers}` : ''}`,
        authorId: auth.user.userId,
      },
    })

    return NextResponse.json(checkIn, { status: 201 })
  } catch (error) {
    return handleApiError(error, request)
  }
}
