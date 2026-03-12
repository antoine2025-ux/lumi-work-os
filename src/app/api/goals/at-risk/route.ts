import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'

// ============================================================================
// GET /api/goals/at-risk - Get all at-risk goals in workspace
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
    const threshold = parseFloat(searchParams.get('threshold') ?? '50')

    // Find goals with high risk analytics
    const atRiskAnalytics = await prisma.goalAnalytics.findMany({
      where: {
        riskScore: { gte: threshold },
        goal: {
          workspaceId: auth.workspaceId,
          status: { in: ['ACTIVE', 'DRAFT'] },
        },
      },
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            level: true,
            status: true,
            progress: true,
            endDate: true,
            quarter: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { riskScore: 'desc' },
    })

    // Deduplicate by goal (keep latest analytics)
    const seen = new Set<string>()
    const results = atRiskAnalytics.filter(a => {
      if (seen.has(a.goalId)) return false
      seen.add(a.goalId)
      return true
    })

    return NextResponse.json({
      total: results.length,
      threshold,
      goals: results.map(a => ({
        ...a.goal,
        analytics: {
          riskScore: a.riskScore,
          progressVelocity: a.progressVelocity,
          projectedCompletion: a.projectedCompletion,
          updateFrequency: a.updateFrequency,
        },
      })),
    })
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}
