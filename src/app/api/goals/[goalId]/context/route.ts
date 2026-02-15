import { NextRequest, NextResponse } from 'next/server'
import { getUnifiedAuth } from '@/lib/unified-auth'
import { assertAccess } from '@/lib/auth/assertAccess'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { prisma } from '@/lib/db'
import { handleApiError } from '@/lib/api-errors'
import { detectConflicts } from '@/lib/goals/cascading'

// ============================================================================
// GET /api/goals/[goalId]/context - Full context for AI reasoning
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

    // Fetch full goal context
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, workspaceId: auth.workspaceId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        objectives: {
          include: {
            keyResults: {
              select: {
                id: true,
                title: true,
                metricType: true,
                targetValue: true,
                currentValue: true,
                progress: true,
                status: true,
                dueDate: true,
              },
            },
          },
        },
        linkedProjects: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                description: true,
              },
            },
          },
        },
        stakeholders: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        parent: {
          select: { id: true, title: true, level: true, progress: true },
        },
        children: {
          select: { id: true, title: true, level: true, progress: true, status: true },
        },
        conflictsWith: {
          select: { id: true, title: true, level: true },
        },
      },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Get latest analytics
    const analytics = await prisma.goalAnalytics.findFirst({
      where: { goalId },
      orderBy: { calculatedAt: 'desc' },
    })

    // Get active recommendations
    const recommendations = await prisma.goalRecommendation.findMany({
      where: { goalId, status: { in: ['PENDING', 'ACKNOWLEDGED'] } },
      orderBy: { priority: 'desc' },
    })

    // Detect conflicts dynamically
    const conflictDetection = await detectConflicts(goalId, auth.workspaceId)

    // Build risk factors
    const riskFactors: Array<{ factor: string; severity: string; detail: string }> = []

    if (analytics) {
      if (analytics.riskScore > 70) {
        riskFactors.push({
          factor: 'high_risk_score',
          severity: 'critical',
          detail: `Risk score is ${Math.round(analytics.riskScore)}%`,
        })
      } else if (analytics.riskScore > 40) {
        riskFactors.push({
          factor: 'elevated_risk',
          severity: 'warning',
          detail: `Risk score is ${Math.round(analytics.riskScore)}%`,
        })
      }

      if (analytics.progressVelocity <= 0) {
        riskFactors.push({
          factor: 'stalled_progress',
          severity: 'warning',
          detail: 'Progress velocity is zero or negative',
        })
      }

      if (analytics.updateFrequency < 0.5) {
        riskFactors.push({
          factor: 'low_engagement',
          severity: 'info',
          detail: `Only ${analytics.updateFrequency.toFixed(1)} updates per week`,
        })
      }
    }

    if (conflictDetection.hasConflicts) {
      riskFactors.push({
        factor: 'goal_conflicts',
        severity: 'warning',
        detail: `${conflictDetection.conflicts.length} potential conflict(s) detected`,
      })
    }

    // Build possible actions
    const possibleActions = []

    if (analytics && analytics.riskScore > 60) {
      possibleActions.push({
        action: 'reallocate_resources',
        confidence: Math.min(analytics.riskScore / 100, 0.9),
        impact: 0.7,
        description: 'Reallocate resources from lower-priority projects',
        apiEndpoint: `/api/goals/${goalId}/actions/reallocate-resources`,
        requiredParams: ['fromProjectId', 'toProjectId', 'resourceCount'],
      })
    }

    if (analytics && analytics.projectedCompletion) {
      const projectedDate = new Date(analytics.projectedCompletion)
      if (projectedDate > goal.endDate) {
        possibleActions.push({
          action: 'adjust_timeline',
          confidence: 0.75,
          impact: 0.6,
          description: `Extend deadline — projected completion is ${projectedDate.toLocaleDateString()}`,
          apiEndpoint: `/api/goals/${goalId}/actions/adjust-timeline`,
          requiredParams: ['newEndDate'],
        })
      }
    }

    if (goal.stakeholders.length > 0 && analytics && analytics.updateFrequency < 1) {
      possibleActions.push({
        action: 'escalate_to_stakeholder',
        confidence: 0.7,
        impact: 0.5,
        description: 'Escalate to stakeholders due to low engagement',
        apiEndpoint: `/api/goals/${goalId}/actions/escalate-to-stakeholder`,
        requiredParams: ['escalateTo', 'reason'],
      })
    }

    return NextResponse.json({
      goal: {
        id: goal.id,
        title: goal.title,
        description: goal.description,
        level: goal.level,
        status: goal.status,
        progress: goal.progress,
        alignmentScore: goal.alignmentScore,
        performanceWeight: goal.performanceWeight,
        reviewCycle: goal.reviewCycle,
        startDate: goal.startDate,
        endDate: goal.endDate,
        quarter: goal.quarter,
        owner: goal.owner,
        parent: goal.parent,
        children: goal.children,
        objectives: goal.objectives,
      },
      stakeholders: goal.stakeholders.map(s => ({
        userId: s.user.id,
        name: s.user.name,
        email: s.user.email,
        role: s.role,
        canEdit: s.canEdit,
        canApprove: s.canApprove,
      })),
      linkedProjects: goal.linkedProjects.map(lp => ({
        projectId: lp.project.id,
        projectName: lp.project.name,
        projectStatus: lp.project.status,
        contributionType: lp.contributionType,
        expectedImpact: lp.expectedImpact,
        actualImpact: lp.actualImpact,
        autoUpdate: lp.autoUpdate,
      })),
      analytics: analytics ? {
        riskScore: analytics.riskScore,
        progressVelocity: analytics.progressVelocity,
        projectedCompletion: analytics.projectedCompletion,
        updateFrequency: analytics.updateFrequency,
        stakeholderEngagement: analytics.stakeholderEngagement,
        teamProductivity: analytics.teamProductivity,
        projectAlignment: analytics.projectAlignment,
      } : null,
      riskFactors,
      conflicts: conflictDetection.conflicts,
      recommendations: recommendations.map(r => ({
        id: r.id,
        type: r.type,
        priority: r.priority,
        title: r.title,
        description: r.description,
        automatable: r.automatable,
        confidence: r.confidence,
        impact: r.impact,
      })),
      possibleActions,
    })
  } catch (error) {
    return handleApiError(error, request)
  }
}
