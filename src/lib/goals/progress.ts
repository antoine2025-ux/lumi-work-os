/**
 * Goals Progress Calculation
 * 
 * Handles progress calculation and updates for goals, objectives, and key results.
 */

import { prisma } from '@/lib/db'
import { KeyResultStatus, ObjectiveStatus, GoalStatus } from '@prisma/client'
import { recalculateGoalAnalytics } from './analytics-engine'
import { syncGoalContext } from './loopbrain-integration'

// ============================================================================
// Types
// ============================================================================

interface KeyResultWithProgress {
  id: string
  targetValue: number
  currentValue: number
  progress: number
}

interface ObjectiveWithKeyResults {
  id: string
  weight: number
  progress: number
  keyResults: KeyResultWithProgress[]
}

// ============================================================================
// Key Result Progress
// ============================================================================

/**
 * Calculate progress percentage for a key result
 */
export function calculateKeyResultProgress(
  currentValue: number,
  targetValue: number
): number {
  if (targetValue === 0) {
    return currentValue > 0 ? 100 : 0
  }
  
  const progress = (currentValue / targetValue) * 100
  return Math.min(Math.max(progress, 0), 100) // Clamp between 0-100
}

/**
 * Determine key result status based on progress
 */
export function getKeyResultStatus(progress: number): KeyResultStatus {
  if (progress >= 100) return 'COMPLETED'
  if (progress > 0) return 'IN_PROGRESS'
  return 'NOT_STARTED'
}

/**
 * Update a key result's progress and status
 */
export async function updateKeyResultProgress(
  keyResultId: string,
  newValue: number
): Promise<void> {
  const keyResult = await prisma.keyResult.findUnique({
    where: { id: keyResultId },
  })

  if (!keyResult) {
    throw new Error(`Key result ${keyResultId} not found`)
  }

  const progress = calculateKeyResultProgress(newValue, keyResult.targetValue)
  const status = getKeyResultStatus(progress)

  await prisma.keyResult.update({
    where: { id: keyResultId },
    data: {
      currentValue: newValue,
      progress,
      status,
    },
  })
}

// ============================================================================
// Objective Progress
// ============================================================================

/**
 * Calculate objective progress as average of key results
 */
export function calculateObjectiveProgress(
  keyResults: KeyResultWithProgress[]
): number {
  if (keyResults.length === 0) return 0
  
  const totalProgress = keyResults.reduce((sum, kr) => sum + kr.progress, 0)
  return totalProgress / keyResults.length
}

/**
 * Determine objective status based on progress and key result statuses
 */
export function getObjectiveStatus(
  progress: number,
  keyResults: { status: KeyResultStatus }[]
): ObjectiveStatus {
  if (progress >= 100) return 'COMPLETED'
  
  // Check if any key results are at risk (low progress for their stage)
  const hasAtRiskKRs = keyResults.some(kr => 
    kr.status === 'IN_PROGRESS' && progress < 25
  )
  
  if (hasAtRiskKRs || (progress > 0 && progress < 33)) {
    return 'AT_RISK'
  }
  
  if (progress > 0) return 'IN_PROGRESS'
  return 'NOT_STARTED'
}

/**
 * Recalculate and update an objective's progress
 */
export async function updateObjectiveProgress(
  objectiveId: string
): Promise<void> {
  const objective = await prisma.objective.findUnique({
    where: { id: objectiveId },
    include: {
      keyResults: {
        select: {
          id: true,
          progress: true,
          targetValue: true,
          currentValue: true,
          status: true,
        },
      },
    },
  })

  if (!objective) {
    throw new Error(`Objective ${objectiveId} not found`)
  }

  const progress = calculateObjectiveProgress(objective.keyResults)
  const status = getObjectiveStatus(progress, objective.keyResults)

  await prisma.objective.update({
    where: { id: objectiveId },
    data: {
      progress,
      status,
    },
  })
}

// ============================================================================
// Goal Progress
// ============================================================================

/**
 * Calculate goal progress as weighted average of objectives
 */
export function calculateGoalProgress(
  objectives: ObjectiveWithKeyResults[]
): number {
  if (objectives.length === 0) return 0
  
  const totalWeight = objectives.reduce((sum, obj) => sum + obj.weight, 0) || 1
  const weightedProgress = objectives.reduce(
    (sum, obj) => sum + (obj.progress * obj.weight),
    0
  )
  
  return weightedProgress / totalWeight
}

/**
 * Determine goal status based on progress
 */
export function getGoalStatus(
  currentStatus: GoalStatus,
  progress: number
): GoalStatus {
  // Don't change DRAFT, PAUSED, or CANCELLED status automatically
  if (['DRAFT', 'PAUSED', 'CANCELLED'].includes(currentStatus)) {
    return currentStatus
  }
  
  // Auto-complete if progress reaches 100%
  if (progress >= 100) {
    return 'COMPLETED'
  }
  
  // Auto-activate if progress > 0 and still in DRAFT
  if (currentStatus === 'DRAFT' && progress > 0) {
    return 'ACTIVE'
  }
  
  return currentStatus
}

/**
 * Recalculate and update a goal's progress
 * This cascades updates through objectives and key results
 */
export async function updateGoalProgress(goalId: string): Promise<void> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      objectives: {
        include: {
          keyResults: {
            select: {
              id: true,
              progress: true,
              targetValue: true,
              currentValue: true,
              status: true,
            },
          },
        },
      },
      linkedProjects: {
        where: { autoUpdate: true },
        select: {
          actualImpact: true,
        },
      },
    },
  })

  if (!goal) {
    throw new Error(`Goal ${goalId} not found`)
  }

  // Update each objective's progress first
  for (const objective of goal.objectives) {
    const objProgress = calculateObjectiveProgress(objective.keyResults)
    const objStatus = getObjectiveStatus(objProgress, objective.keyResults)
    
    await prisma.objective.update({
      where: { id: objective.id },
      data: {
        progress: objProgress,
        status: objStatus,
      },
    })
  }

  // Determine progress source: projects with autoUpdate take precedence over OKRs
  let goalProgress: number
  
  if (goal.linkedProjects.length > 0) {
    // Use project contributions if projects are linked with autoUpdate
    goalProgress = goal.linkedProjects.reduce(
      (sum, link) => sum + link.actualImpact,
      0
    )
    goalProgress = Math.min(goalProgress, 100) // Cap at 100%
  } else {
    // Fall back to OKR progress if no auto-update projects
    goalProgress = calculateGoalProgress(
      goal.objectives.map(obj => ({
        id: obj.id,
        weight: obj.weight,
        progress: calculateObjectiveProgress(obj.keyResults),
        keyResults: obj.keyResults,
      }))
    )
  }

  const goalStatus = getGoalStatus(goal.status, goalProgress)

  // Update goal
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      progress: goalProgress,
      status: goalStatus,
    },
  })

  // Trigger analytics recalculation (fire-and-forget)
  recalculateGoalAnalytics(goalId).catch((err) => {
    console.error(`Failed to recalculate analytics for goal ${goalId}:`, err)
  })

  // Sync to Loopbrain context store (fire-and-forget)
  syncGoalContext(goalId).catch((err) => {
    console.error(`Failed to sync goal ${goalId} to Loopbrain:`, err)
  })
}

/**
 * Batch update progress for multiple goals
 * Useful for recalculating after bulk key result updates
 */
export async function batchUpdateGoalProgress(
  goalIds: string[]
): Promise<void> {
  for (const goalId of goalIds) {
    await updateGoalProgress(goalId)
  }
}

// ============================================================================
// Progress Analysis
// ============================================================================

/**
 * Analyze goal health based on progress and time remaining
 */
export interface ProgressHealth {
  status: 'on_track' | 'at_risk' | 'off_track' | 'completed'
  message: string
  expectedProgress: number
  actualProgress: number
  variance: number
}

export function analyzeGoalHealth(
  goal: {
    startDate: Date
    endDate: Date
    progress: number
    status: GoalStatus
  }
): ProgressHealth {
  if (goal.status === 'COMPLETED') {
    return {
      status: 'completed',
      message: 'Goal completed',
      expectedProgress: 100,
      actualProgress: goal.progress,
      variance: 0,
    }
  }

  const now = new Date()
  const totalDuration = goal.endDate.getTime() - goal.startDate.getTime()
  const elapsed = now.getTime() - goal.startDate.getTime()
  
  // Calculate expected progress based on time elapsed
  const expectedProgress = Math.min(
    (elapsed / totalDuration) * 100,
    100
  )
  
  const variance = goal.progress - expectedProgress
  
  let status: ProgressHealth['status']
  let message: string
  
  if (variance >= 0) {
    status = 'on_track'
    message = 'Goal is on track or ahead of schedule'
  } else if (variance >= -15) {
    status = 'at_risk'
    message = 'Goal is slightly behind schedule'
  } else {
    status = 'off_track'
    message = 'Goal is significantly behind schedule'
  }
  
  return {
    status,
    message,
    expectedProgress,
    actualProgress: goal.progress,
    variance,
  }
}
