/**
 * Goal Analytics Engine (On-Write)
 * 
 * Computes analytics and generates recommendations whenever goals,
 * objectives, key results, or linked projects are updated.
 */

import { prisma } from '@/lib/db'
import type { RecommendationType, RecommendationPriority } from '@prisma/client'

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsSnapshot {
  progressVelocity: number
  projectedCompletion: Date | null
  riskScore: number
  updateFrequency: number
  stakeholderEngagement: number
  teamProductivity: number | null
  projectAlignment: number | null
}

interface RecommendationInput {
  goalId: string
  type: RecommendationType
  priority: RecommendationPriority
  title: string
  description: string
  suggestedActions: Array<{ action: string; params?: Record<string, string | number> }>
  automatable: boolean
  confidence: number
  impact: number
}

// ============================================================================
// Analytics Computation
// ============================================================================

/**
 * Main entry point: recalculate analytics for a goal.
 * Call this after any goal/objective/key-result/project update.
 */
export async function recalculateGoalAnalytics(goalId: string): Promise<AnalyticsSnapshot | null> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      objectives: {
        include: { keyResults: true },
      },
      linkedProjects: {
        include: {
          project: {
            select: {
              id: true,
              status: true,
              tasks: {
                select: { status: true },
              },
            },
          },
        },
      },
      progressUpdates: {
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
      updates: {
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      stakeholders: true,
      checkIns: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!goal) return null

  // 1. Progress velocity (rate of progress change per week)
  const progressVelocity = computeProgressVelocity(goal.progressUpdates)

  // 2. Projected completion
  const projectedCompletion = computeProjectedCompletion(
    goal.progress,
    progressVelocity,
    goal.endDate
  )

  // 3. Risk score
  const riskScore = computeRiskScore(
    goal.progress,
    goal.startDate,
    goal.endDate,
    progressVelocity,
    goal.updates.length,
    goal.status
  )

  // 4. Update frequency (updates per week over last 30 days)
  const updateFrequency = computeUpdateFrequency(
    goal.updates.map(u => u.createdAt)
  )

  // 5. Stakeholder engagement
  const stakeholderEngagement = computeStakeholderEngagement(
    goal.stakeholders.length,
    goal.checkIns.length,
    goal.updates.length
  )

  // 6. Project alignment
  const projectAlignment = computeProjectAlignment(goal.linkedProjects)

  // 7. Team productivity
  const teamProductivity = computeTeamProductivity(goal.linkedProjects)

  const analytics: AnalyticsSnapshot = {
    progressVelocity,
    projectedCompletion,
    riskScore,
    updateFrequency,
    stakeholderEngagement,
    teamProductivity,
    projectAlignment,
  }

  // Upsert the analytics record
  const period = getCurrentPeriod()
  await prisma.goalAnalytics.upsert({
    where: { goalId_period: { goalId, period } },
    update: {
      progressVelocity: analytics.progressVelocity,
      projectedCompletion: analytics.projectedCompletion,
      riskScore: analytics.riskScore,
      updateFrequency: analytics.updateFrequency,
      stakeholderEngagement: analytics.stakeholderEngagement,
      teamProductivity: analytics.teamProductivity,
      projectAlignment: analytics.projectAlignment,
      calculatedAt: new Date(),
    },
    create: {
      goalId,
      workspaceId: goal.workspaceId,
      period,
      progressVelocity: analytics.progressVelocity,
      projectedCompletion: analytics.projectedCompletion,
      riskScore: analytics.riskScore,
      updateFrequency: analytics.updateFrequency,
      stakeholderEngagement: analytics.stakeholderEngagement,
      teamProductivity: analytics.teamProductivity,
      projectAlignment: analytics.projectAlignment,
    },
  })

  // Generate recommendations based on analytics
  await generateRecommendations(goalId, analytics, goal)

  return analytics
}

// ============================================================================
// Velocity Computation
// ============================================================================

function computeProgressVelocity(
  progressUpdates: Array<{ previousProgress: number; newProgress: number; createdAt: Date }>
): number {
  if (progressUpdates.length < 2) return 0

  const sorted = [...progressUpdates].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )

  const oldest = sorted[0]
  const newest = sorted[sorted.length - 1]

  const totalProgressChange = newest.newProgress - oldest.previousProgress
  const timeSpanMs = newest.createdAt.getTime() - oldest.createdAt.getTime()
  const weekMs = 7 * 24 * 60 * 60 * 1000

  if (timeSpanMs === 0) return 0

  // Progress points per week
  return Math.round((totalProgressChange / (timeSpanMs / weekMs)) * 100) / 100
}

// ============================================================================
// Projected Completion
// ============================================================================

function computeProjectedCompletion(
  currentProgress: number,
  velocityPerWeek: number,
  endDate: Date
): Date | null {
  if (currentProgress >= 100) return new Date()
  if (velocityPerWeek <= 0) return null // Can't project if no progress

  const remainingProgress = 100 - currentProgress
  const weeksToComplete = remainingProgress / velocityPerWeek
  const msToComplete = weeksToComplete * 7 * 24 * 60 * 60 * 1000

  const projected = new Date(Date.now() + msToComplete)

  // Cap at 2x the original deadline to avoid unrealistic dates
  const maxDate = new Date(endDate.getTime() * 2 - Date.now())
  return projected > maxDate ? maxDate : projected
}

// ============================================================================
// Risk Score
// ============================================================================

function computeRiskScore(
  progress: number,
  startDate: Date,
  endDate: Date,
  velocity: number,
  updateCount: number,
  status: string
): number {
  if (status === 'COMPLETED') return 0
  if (status === 'CANCELLED') return 0
  if (status === 'PAUSED') return 50

  const now = Date.now()
  const totalDuration = endDate.getTime() - startDate.getTime()
  const elapsed = now - startDate.getTime()
  const timeProgress = Math.min((elapsed / totalDuration) * 100, 100)

  let risk = 0

  // Time vs progress gap (biggest factor)
  const gap = timeProgress - progress
  if (gap > 0) {
    risk += Math.min(gap * 1.2, 50) // Up to 50 points for being behind
  }

  // Velocity factor: if velocity is too slow to catch up
  if (velocity > 0) {
    const remaining = 100 - progress
    const timeRemainingWeeks = Math.max(
      (endDate.getTime() - now) / (7 * 24 * 60 * 60 * 1000),
      0.1
    )
    const requiredVelocity = remaining / timeRemainingWeeks

    if (velocity < requiredVelocity * 0.5) {
      risk += 25 // Very slow relative to what's needed
    } else if (velocity < requiredVelocity * 0.8) {
      risk += 10 // Somewhat slow
    }
  } else if (progress < 100 && timeProgress > 25) {
    risk += 20 // No velocity at all and we're past the start
  }

  // Update frequency factor: no updates is bad
  if (updateCount < 2 && timeProgress > 20) {
    risk += 15 // Barely any updates
  }

  // Deadline proximity: higher risk as deadline approaches
  const daysToDeadline = (endDate.getTime() - now) / (24 * 60 * 60 * 1000)
  if (daysToDeadline < 7 && progress < 80) {
    risk += 15
  } else if (daysToDeadline < 14 && progress < 60) {
    risk += 10
  }

  return Math.min(Math.max(Math.round(risk), 0), 100)
}

// ============================================================================
// Update Frequency
// ============================================================================

function computeUpdateFrequency(updateDates: Date[]): number {
  if (updateDates.length === 0) return 0

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentUpdates = updateDates.filter(d => d.getTime() > thirtyDaysAgo)

  // Updates per week over last 30 days (≈4.3 weeks)
  return Math.round((recentUpdates.length / 4.3) * 100) / 100
}

// ============================================================================
// Stakeholder Engagement
// ============================================================================

function computeStakeholderEngagement(
  stakeholderCount: number,
  checkInCount: number,
  updateCount: number
): number {
  if (stakeholderCount === 0) return 0

  // Engagement score out of 100
  const stakeholderScore = Math.min(stakeholderCount * 15, 30) // Up to 30 for having stakeholders
  const checkInScore = Math.min(checkInCount * 10, 35) // Up to 35 for check-ins
  const activityScore = Math.min(updateCount * 2, 35) // Up to 35 for activity

  return Math.min(Math.round(stakeholderScore + checkInScore + activityScore), 100)
}

// ============================================================================
// Project Alignment
// ============================================================================

function computeProjectAlignment(
  linkedProjects: Array<{
    contributionType: string
    expectedImpact: number
    actualImpact: number
    project: { status: string; tasks: Array<{ status: string }> }
  }>
): number | null {
  if (linkedProjects.length === 0) return null

  let totalWeight = 0
  let weightedAlignment = 0

  for (const link of linkedProjects) {
    const weight = link.expectedImpact
    totalWeight += weight

    const totalTasks = link.project.tasks.length
    const completedTasks = totalTasks > 0
      ? link.project.tasks.filter(t => t.status === 'DONE').length
      : 0
    const projectProgress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Alignment = how well actual impact matches expected
    const impactRatio = link.expectedImpact > 0
      ? Math.min(link.actualImpact / link.expectedImpact, 1)
      : 0

    const progressFactor = projectProgress / 100

    weightedAlignment += (impactRatio * 0.4 + progressFactor * 0.6) * weight
  }

  return totalWeight > 0 ? Math.round((weightedAlignment / totalWeight) * 100) : null
}

// ============================================================================
// Team Productivity
// ============================================================================

function computeTeamProductivity(
  linkedProjects: Array<{
    project: { tasks: Array<{ status: string }> }
  }>
): number | null {
  if (linkedProjects.length === 0) return null

  const allTasks = linkedProjects.flatMap(lp => lp.project.tasks)
  if (allTasks.length === 0) return null

  const completed = allTasks.filter(t => t.status === 'DONE').length
  return Math.round((completed / allTasks.length) * 100)
}

// ============================================================================
// Recommendation Generation
// ============================================================================

async function generateRecommendations(
  goalId: string,
  analytics: AnalyticsSnapshot,
  goal: { workspaceId: string; endDate: Date; progress: number; linkedProjects: Array<{ expectedImpact: number; actualImpact: number }> }
): Promise<void> {
  const recommendations: RecommendationInput[] = []

  // 1. PROGRESS_AT_RISK when riskScore > 60
  if (analytics.riskScore > 60) {
    recommendations.push({
      goalId,
      type: 'PROGRESS_AT_RISK',
      priority: analytics.riskScore > 80 ? 'URGENT' : 'HIGH',
      title: 'Goal is at risk of missing deadline',
      description: `Risk score is ${Math.round(analytics.riskScore)}%. Current velocity may not be sufficient to complete this goal on time.`,
      suggestedActions: [
        { action: 'Review and prioritize remaining objectives' },
        { action: 'Consider reallocating resources from lower-priority work' },
        { action: 'Schedule an alignment meeting with stakeholders' },
      ],
      automatable: false,
      confidence: Math.min(analytics.riskScore / 100, 0.95),
      impact: 0.8,
    })
  }

  // 2. TIMELINE_ADJUSTMENT when projected completion exceeds deadline
  if (
    analytics.projectedCompletion &&
    analytics.projectedCompletion > goal.endDate &&
    goal.progress < 90
  ) {
    const daysOverdue = Math.ceil(
      (analytics.projectedCompletion.getTime() - goal.endDate.getTime()) / (24 * 60 * 60 * 1000)
    )
    recommendations.push({
      goalId,
      type: 'TIMELINE_ADJUSTMENT',
      priority: daysOverdue > 30 ? 'HIGH' : 'MEDIUM',
      title: 'Timeline adjustment recommended',
      description: `At current velocity, this goal is projected to complete ${daysOverdue} day(s) after the deadline.`,
      suggestedActions: [
        { action: 'adjust_timeline', params: { suggestedExtensionDays: daysOverdue } },
        { action: 'Increase resource allocation to accelerate progress' },
      ],
      automatable: true,
      confidence: 0.75,
      impact: 0.6,
    })
  }

  // 3. STAKEHOLDER_ENGAGEMENT when update frequency drops
  if (analytics.updateFrequency < 0.5 && goal.progress > 0 && goal.progress < 100) {
    recommendations.push({
      goalId,
      type: 'STAKEHOLDER_ENGAGEMENT',
      priority: 'MEDIUM',
      title: 'Low update frequency detected',
      description: `This goal is only being updated ${analytics.updateFrequency.toFixed(1)} times per week. Consider scheduling regular check-ins.`,
      suggestedActions: [
        { action: 'Schedule weekly check-in for this goal' },
        { action: 'Enable automated project sync for linked projects' },
      ],
      automatable: false,
      confidence: 0.7,
      impact: 0.5,
    })
  }

  // 4. RESOURCE_REALLOCATION when linked projects have mismatched capacity
  const underperformingProjects = goal.linkedProjects.filter(
    lp => lp.expectedImpact > 20 && lp.actualImpact < lp.expectedImpact * 0.3
  )
  if (underperformingProjects.length > 0) {
    recommendations.push({
      goalId,
      type: 'RESOURCE_REALLOCATION',
      priority: 'HIGH',
      title: 'Resource reallocation may be needed',
      description: `${underperformingProjects.length} linked project(s) are significantly underperforming relative to expected impact.`,
      suggestedActions: [
        { action: 'Review resource allocation for underperforming projects' },
        { action: 'Consider adjusting expected impact or contribution type' },
      ],
      automatable: true,
      confidence: 0.65,
      impact: 0.7,
    })
  }

  // Upsert recommendations (avoid duplicates for same goal + type)
  for (const rec of recommendations) {
    const existing = await prisma.goalRecommendation.findFirst({
      where: {
        goalId: rec.goalId,
        type: rec.type,
        status: { in: ['PENDING', 'ACKNOWLEDGED'] },
      },
    })

    if (existing) {
      // Update existing recommendation
      await prisma.goalRecommendation.update({
        where: { id: existing.id },
        data: {
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          suggestedActions: JSON.parse(JSON.stringify(rec.suggestedActions)),
          confidence: rec.confidence,
          impact: rec.impact,
        },
      })
    } else {
      await prisma.goalRecommendation.create({
        data: {
          goalId: rec.goalId,
          workspaceId: goal.workspaceId,
          type: rec.type,
          priority: rec.priority,
          title: rec.title,
          description: rec.description,
          suggestedActions: JSON.parse(JSON.stringify(rec.suggestedActions)),
          automatable: rec.automatable,
          confidence: rec.confidence,
          impact: rec.impact,
        },
      })
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getFullYear()
  const week = getISOWeek(now)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function getISOWeek(date: Date): number {
  const d = new Date(date.getTime())
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const week1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
}
