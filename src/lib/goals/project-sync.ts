/**
 * Project-Goal Deep Integration
 * 
 * Bidirectional sync between projects and goals. When project status changes
 * or tasks complete, goal progress is automatically updated based on
 * contribution type and expected impact.
 */

import { prisma } from '@/lib/db'
import { ContributionType, ProjectStatus } from '@prisma/client'
import { updateGoalProgress } from './progress'

// ============================================================================
// Types
// ============================================================================

export interface ProjectContribution {
  goalId: string
  projectId: string
  contributionType: ContributionType
  expectedImpact: number
  actualImpact: number
  projectProgress: number
}

export interface SyncResult {
  goalId: string
  previousProgress: number
  newProgress: number
  updated: boolean
}

// ============================================================================
// Contribution Weight Multipliers
// ============================================================================

const CONTRIBUTION_WEIGHTS: Record<ContributionType, number> = {
  REQUIRED: 1.0,       // Full weight
  CONTRIBUTING: 0.6,   // 60% weight
  SUPPORTING: 0.25,    // 25% weight
}

// ============================================================================
// Project Status to Progress Mapping
// ============================================================================

function getProjectCompletionPercent(status: ProjectStatus): number {
  switch (status) {
    case 'COMPLETED':
      return 100
    case 'ACTIVE':
      return -1 // Signal to use task-based calculation
    case 'ON_HOLD':
      return -1
    default:
      return 0
  }
}

// ============================================================================
// Core Sync Functions
// ============================================================================

/**
 * Calculate the actual impact of a project on a goal based on its contribution type
 * and completion status.
 */
export async function calculateProjectContribution(
  linkId: string
): Promise<ProjectContribution | null> {
  const link = await prisma.projectGoalLink.findUnique({
    where: { id: linkId },
    include: {
      project: {
        select: {
          id: true,
          status: true,
          tasks: {
            select: {
              status: true,
            },
          },
        },
      },
      goal: {
        select: {
          id: true,
        },
      },
    },
  })

  if (!link) return null

  const completionPercent = getProjectCompletionPercent(link.project.status)

  let projectProgress: number
  if (completionPercent >= 0) {
    projectProgress = completionPercent
  } else {
    // Calculate from tasks
    const totalTasks = link.project.tasks.length
    if (totalTasks === 0) {
      projectProgress = 0
    } else {
      const completedTasks = link.project.tasks.filter(
        t => t.status === 'DONE'
      ).length
      projectProgress = (completedTasks / totalTasks) * 100
    }
  }

  const weight = CONTRIBUTION_WEIGHTS[link.contributionType]
  const actualImpact = (projectProgress / 100) * link.expectedImpact * weight

  return {
    goalId: link.goal.id,
    projectId: link.project.id,
    contributionType: link.contributionType,
    expectedImpact: link.expectedImpact,
    actualImpact: Math.round(actualImpact * 100) / 100,
    projectProgress,
  }
}

/**
 * Sync a single project's contribution to its linked goals.
 * Called when a project's status changes or tasks are completed.
 */
export async function syncProjectToGoals(
  projectId: string,
  updatedById: string
): Promise<SyncResult[]> {
  console.log(`[GoalSync] Starting sync for project ${projectId}`)
  
  const links = await prisma.projectGoalLink.findMany({
    where: {
      projectId,
      autoUpdate: true,
    },
    include: {
      goal: {
        select: {
          id: true,
          progress: true,
          title: true,
          workspaceId: true,
        },
      },
    },
  })

  console.log(`[GoalSync] Found ${links.length} goals with autoUpdate enabled`)

  const results: SyncResult[] = []

  for (const link of links) {
    const contribution = await calculateProjectContribution(link.id)
    if (!contribution) continue

    console.log(`[GoalSync] Goal "${link.goal.title}": actualImpact=${contribution.actualImpact}%`)

    // Update the actual impact on the link
    await prisma.projectGoalLink.update({
      where: { id: link.id },
      data: { actualImpact: contribution.actualImpact },
    })

    // Record the progress update
    const previousProgress = link.goal.progress

    // Recalculate the goal's overall progress (includes OKR progress + project contributions)
    await updateGoalProgress(link.goal.id)

    // Fetch updated progress
    const updatedGoal = await prisma.goal.findUnique({
      where: { id: link.goal.id },
      select: { progress: true },
    })

    const newProgress = updatedGoal?.progress ?? previousProgress

    console.log(`[GoalSync] Goal "${link.goal.title}" updated: ${previousProgress}% → ${newProgress}%`)

    // Create audit trail
    if (Math.abs(newProgress - previousProgress) > 0.01) {
      await prisma.goalProgressUpdate.create({
        data: {
          goalId: link.goal.id,
          workspaceId: link.goal.workspaceId,
          triggeredBy: 'project_completion',
          sourceId: projectId,
          previousProgress,
          newProgress,
          confidence: 0.9,
          updatedById,
        },
      })
    }

    results.push({
      goalId: link.goal.id,
      previousProgress,
      newProgress,
      updated: Math.abs(newProgress - previousProgress) > 0.01,
    })
  }

  console.log(`[GoalSync] Sync complete. Updated ${results.filter(r => r.updated).length} of ${results.length} goals`)
  return results
}

/**
 * Sync all projects linked to a specific goal.
 * Called to refresh a goal's project contributions.
 */
export async function syncGoalProjects(
  goalId: string,
  updatedById: string
): Promise<SyncResult> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { progress: true, workspaceId: true },
  })

  if (!goal) {
    return { goalId, previousProgress: 0, newProgress: 0, updated: false }
  }

  const links = await prisma.projectGoalLink.findMany({
    where: { goalId, autoUpdate: true },
  })

  // Update each link's actual impact
  for (const link of links) {
    const contribution = await calculateProjectContribution(link.id)
    if (contribution) {
      await prisma.projectGoalLink.update({
        where: { id: link.id },
        data: { actualImpact: contribution.actualImpact },
      })
    }
  }

  // Recalculate goal progress
  const previousProgress = goal.progress
  await updateGoalProgress(goalId)

  const updatedGoal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { progress: true },
  })

  const newProgress = updatedGoal?.progress ?? previousProgress

  if (Math.abs(newProgress - previousProgress) > 0.01) {
    await prisma.goalProgressUpdate.create({
      data: {
        goalId,
        workspaceId: goal.workspaceId,
        triggeredBy: 'project_completion',
        sourceId: null,
        previousProgress,
        newProgress,
        confidence: 0.85,
        updatedById,
      },
    })
  }

  return {
    goalId,
    previousProgress,
    newProgress,
    updated: Math.abs(newProgress - previousProgress) > 0.01,
  }
}

/**
 * Get a summary of all project contributions to a goal.
 */
export async function getGoalProjectContributions(
  goalId: string
): Promise<ProjectContribution[]> {
  const links = await prisma.projectGoalLink.findMany({
    where: { goalId },
  })

  const contributions: ProjectContribution[] = []

  for (const link of links) {
    const contribution = await calculateProjectContribution(link.id)
    if (contribution) {
      contributions.push(contribution)
    }
  }

  return contributions
}
