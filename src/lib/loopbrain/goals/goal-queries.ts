/**
 * Loopbrain Goal Query Handlers
 * 
 * Handles goal-specific queries for Loopbrain AI assistance.
 */

import { prisma } from '@/lib/db'
import { getCurrentQuarter } from '@/lib/goals/utils'
import { analyzeGoalHealth, ProgressHealth } from '@/lib/goals/progress'

// ============================================================================
// Query Detection
// ============================================================================

const GOAL_KEYWORDS = [
  'goal', 'goals', 'okr', 'okrs', 'objective', 'objectives',
  'key result', 'key results', 'target', 'targets',
  'quarterly', 'annual', 'milestone', 'achievement',
  'progress', 'tracking', 'status'
]

/**
 * Check if a query is about goals
 */
export function isGoalQuestion(query: string): boolean {
  const lowerQuery = query.toLowerCase()
  return GOAL_KEYWORDS.some(keyword => lowerQuery.includes(keyword))
}

// ============================================================================
// Query Handlers
// ============================================================================

/**
 * Main goal query router
 */
export async function handleGoalQuery(
  query: string,
  workspaceId: string
): Promise<any> {
  const lowerQuery = query.toLowerCase()

  // Route to specific handlers
  if (lowerQuery.includes('at risk') || lowerQuery.includes('behind')) {
    return await getAtRiskGoals(workspaceId)
  }

  if (lowerQuery.includes('progress') || lowerQuery.includes('tracking')) {
    return await getGoalProgress(workspaceId)
  }

  if (lowerQuery.includes('quarter') || /q[1-4]/i.test(query)) {
    const quarter = extractQuarter(query) || getCurrentQuarter()
    return await getQuarterlyGoals(workspaceId, quarter)
  }

  if (lowerQuery.includes('company') || lowerQuery.includes('organization')) {
    return await getCompanyGoals(workspaceId)
  }

  if (lowerQuery.includes('team')) {
    return await getTeamGoals(workspaceId)
  }

  // Default: overview
  return await getGoalOverview(workspaceId)
}

/**
 * Get goals that are at risk
 */
async function getAtRiskGoals(workspaceId: string) {
  const goals = await prisma.goal.findMany({
    where: {
      workspaceId,
      status: 'ACTIVE',
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      objectives: {
        include: {
          keyResults: true,
        },
      },
    },
  })

  const atRiskGoals = goals
    .map(goal => ({
      ...goal,
      health: analyzeGoalHealth({
        startDate: goal.startDate,
        endDate: goal.endDate,
        progress: goal.progress,
        status: goal.status,
      }),
    }))
    .filter(goal => 
      goal.health.status === 'at_risk' || 
      goal.health.status === 'off_track'
    )

  return {
    type: 'goal_analysis',
    title: 'Goals At Risk',
    summary: `Found ${atRiskGoals.length} goals that need attention`,
    goals: atRiskGoals.map(goal => ({
      id: goal.id,
      title: goal.title,
      level: goal.level,
      owner: goal.owner?.name || 'Unassigned',
      progress: goal.progress,
      expectedProgress: goal.health.expectedProgress,
      variance: goal.health.variance,
      status: goal.health.status,
      message: goal.health.message,
      objectives: goal.objectives.map(obj => ({
        title: obj.title,
        progress: obj.progress,
        status: obj.status,
        keyResultCount: obj.keyResults.length,
      })),
    })),
    recommendations: generateAtRiskRecommendations(atRiskGoals),
  }
}

/**
 * Get overall goal progress
 */
async function getGoalProgress(workspaceId: string) {
  const currentQuarter = getCurrentQuarter()

  const goals = await prisma.goal.findMany({
    where: {
      workspaceId,
      quarter: currentQuarter,
      status: { in: ['ACTIVE', 'COMPLETED'] },
    },
    include: {
      objectives: {
        include: {
          keyResults: true,
        },
      },
    },
  })

  const summary = {
    total: goals.length,
    completed: goals.filter(g => g.status === 'COMPLETED').length,
    onTrack: goals.filter(g => g.progress >= 75 && g.status === 'ACTIVE').length,
    atRisk: goals.filter(g => g.progress < 50 && g.status === 'ACTIVE').length,
    averageProgress: goals.length > 0
      ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
      : 0,
    byLevel: {
      COMPANY: goals.filter(g => g.level === 'COMPANY').length,
      DEPARTMENT: goals.filter(g => g.level === 'DEPARTMENT').length,
      TEAM: goals.filter(g => g.level === 'TEAM').length,
      INDIVIDUAL: goals.filter(g => g.level === 'INDIVIDUAL').length,
    },
  }

  return {
    type: 'goal_progress',
    title: `${currentQuarter} Goal Progress`,
    quarter: currentQuarter,
    summary,
    goals: goals.map(g => ({
      id: g.id,
      title: g.title,
      level: g.level,
      progress: g.progress,
      status: g.status,
      objectiveCount: g.objectives.length,
      keyResultCount: g.objectives.reduce((sum, obj) => sum + obj.keyResults.length, 0),
    })),
    recommendations: generateProgressRecommendations(summary),
  }
}

/**
 * Get goals for a specific quarter
 */
async function getQuarterlyGoals(workspaceId: string, quarter: string) {
  const goals = await prisma.goal.findMany({
    where: {
      workspaceId,
      quarter,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      objectives: {
        include: {
          keyResults: true,
        },
      },
    },
    orderBy: [
      { level: 'asc' },
      { progress: 'desc' },
    ],
  })

  return {
    type: 'quarterly_goals',
    title: `${quarter} Goals`,
    quarter,
    total: goals.length,
    goals: goals.map(g => ({
      id: g.id,
      title: g.title,
      level: g.level,
      owner: g.owner?.name || 'Unassigned',
      progress: g.progress,
      status: g.status,
      objectives: g.objectives.map(obj => ({
        title: obj.title,
        progress: obj.progress,
        keyResults: obj.keyResults.length,
      })),
    })),
  }
}

/**
 * Get company-level goals
 */
async function getCompanyGoals(workspaceId: string) {
  const goals = await prisma.goal.findMany({
    where: {
      workspaceId,
      level: 'COMPANY',
      status: { in: ['ACTIVE', 'DRAFT'] },
    },
    include: {
      objectives: {
        include: {
          keyResults: true,
        },
      },
      children: {
        select: {
          id: true,
          title: true,
          level: true,
          progress: true,
        },
      },
    },
  })

  return {
    type: 'company_goals',
    title: 'Company Goals',
    total: goals.length,
    goals: goals.map(g => ({
      id: g.id,
      title: g.title,
      description: g.description,
      progress: g.progress,
      status: g.status,
      period: g.period,
      quarter: g.quarter,
      objectives: g.objectives.length,
      cascadedGoals: g.children.length,
      childGoals: g.children,
    })),
  }
}

/**
 * Get team-level goals
 */
async function getTeamGoals(workspaceId: string) {
  const goals = await prisma.goal.findMany({
    where: {
      workspaceId,
      level: 'TEAM',
      status: { in: ['ACTIVE', 'DRAFT'] },
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      objectives: {
        include: {
          keyResults: true,
        },
      },
    },
  })

  return {
    type: 'team_goals',
    title: 'Team Goals',
    total: goals.length,
    goals: goals.map(g => ({
      id: g.id,
      title: g.title,
      owner: g.owner?.name || 'Unassigned',
      progress: g.progress,
      status: g.status,
      objectives: g.objectives.length,
    })),
  }
}

/**
 * Get general goal overview
 */
async function getGoalOverview(workspaceId: string) {
  const currentQuarter = getCurrentQuarter()

  const [allGoals, quarterGoals] = await Promise.all([
    prisma.goal.count({
      where: { workspaceId },
    }),
    prisma.goal.findMany({
      where: {
        workspaceId,
        quarter: currentQuarter,
      },
      select: {
        id: true,
        title: true,
        level: true,
        progress: true,
        status: true,
      },
    }),
  ])

  return {
    type: 'goal_overview',
    title: 'Goals Overview',
    totalGoals: allGoals,
    currentQuarter,
    quarterGoals: quarterGoals.length,
    goals: quarterGoals,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract quarter from query (e.g., "Q1 2026" or "2026-Q1")
 */
function extractQuarter(query: string): string | null {
  // Match patterns like "Q1", "Q2", "2026-Q1", "Q1 2026"
  const match = query.match(/(?:(\d{4})-?)?Q([1-4])|Q([1-4])\s*(\d{4})/i)
  
  if (match) {
    const year = match[1] || match[4] || new Date().getFullYear()
    const quarter = match[2] || match[3]
    return `${year}-Q${quarter}`
  }
  
  return null
}

/**
 * Generate recommendations for at-risk goals
 */
function generateAtRiskRecommendations(
  goals: Array<any>
): string[] {
  const recommendations: string[] = []

  if (goals.length === 0) {
    recommendations.push('All goals are on track! Keep up the great work.')
    return recommendations
  }

  const severelyOffTrack = goals.filter(g => g.health.variance < -25)
  if (severelyOffTrack.length > 0) {
    recommendations.push(
      `${severelyOffTrack.length} goal(s) are severely off track. Consider reallocating resources or revising targets.`
    )
  }

  const lowProgressGoals = goals.filter(g => g.progress < 25)
  if (lowProgressGoals.length > 0) {
    recommendations.push(
      `${lowProgressGoals.length} goal(s) have very low progress. Review key results and remove blockers.`
    )
  }

  recommendations.push(
    'Schedule check-ins with goal owners to discuss challenges and support needed.'
  )

  return recommendations
}

/**
 * Generate recommendations based on progress summary
 */
function generateProgressRecommendations(
  summary: any
): string[] {
  const recommendations: string[] = []

  if (summary.averageProgress >= 80) {
    recommendations.push('Excellent progress! Team is on track to meet goals.')
  } else if (summary.averageProgress >= 60) {
    recommendations.push('Good progress overall, but some goals may need attention.')
  } else {
    recommendations.push('Progress is below expected levels. Consider reviewing priorities.')
  }

  if (summary.atRisk > summary.onTrack) {
    recommendations.push(
      'More goals are at risk than on track. Focus on unblocking key results.'
    )
  }

  const completionRate = (summary.completed / summary.total) * 100
  if (completionRate < 20) {
    recommendations.push(
      'Low completion rate suggests goals may be too ambitious or under-resourced.'
    )
  }

  return recommendations
}
