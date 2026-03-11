/**
 * Goal Workflow Engine
 * 
 * Evaluates workflow rules and executes automated actions
 * when goals meet trigger conditions.
 */

import { prisma } from '@/lib/db'
import { WorkflowTrigger } from '@prisma/client'
import { recalculateGoalAnalytics } from './analytics-engine'
import { cascadeParentChanges } from './cascading'

// ============================================================================
// Types
// ============================================================================

export interface WorkflowContext {
  goalId: string
  workspaceId: string
  trigger: WorkflowTrigger
  data: Record<string, unknown>
}

export interface WorkflowAction {
  type: 'notify_stakeholders' | 'escalate_goal' | 'adjust_timeline' | 'reallocate_resources' | 'update_status'
  params: Record<string, unknown>
}

export interface WorkflowResult {
  ruleId: string
  ruleName: string
  actionsExecuted: number
  results: Array<{ action: string; success: boolean; detail?: string }>
}

// ============================================================================
// Rule Evaluation
// ============================================================================

/**
 * Evaluate all active workflow rules for a given trigger and context.
 * Executes matching rules' actions.
 */
export async function evaluateWorkflowRules(
  context: WorkflowContext
): Promise<WorkflowResult[]> {
  const rules = await prisma.goalWorkflowRule.findMany({
    where: {
      workspaceId: context.workspaceId,
      trigger: context.trigger,
      isActive: true,
    },
  })

  const results: WorkflowResult[] = []

  for (const rule of rules) {
    const conditions = rule.conditions as Record<string, unknown>
    const actions = rule.actions as unknown as WorkflowAction[]

    if (!evaluateConditions(conditions, context)) {
      continue
    }

    const actionResults: WorkflowResult['results'] = []

    for (const action of actions) {
      try {
        await executeAction(action, context)
        actionResults.push({ action: action.type, success: true })
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        actionResults.push({
          action: action.type,
          success: false,
          detail: errorMessage,
        })
      }
    }

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      actionsExecuted: actionResults.filter(r => r.success).length,
      results: actionResults,
    })
  }

  return results
}

// ============================================================================
// Condition Evaluation
// ============================================================================

function evaluateConditions(
  conditions: Record<string, unknown>,
  context: WorkflowContext
): boolean {
  // If no conditions, always match
  if (!conditions || Object.keys(conditions).length === 0) return true

  // Evaluate each condition
  for (const [key, expected] of Object.entries(conditions)) {
    const actual = context.data[key]

    if (typeof expected === 'object' && expected !== null) {
      const cond = expected as Record<string, unknown>

      // Comparison operators
      if ('gte' in cond && typeof actual === 'number' && actual < (cond.gte as number)) return false
      if ('lte' in cond && typeof actual === 'number' && actual > (cond.lte as number)) return false
      if ('gt' in cond && typeof actual === 'number' && actual <= (cond.gt as number)) return false
      if ('lt' in cond && typeof actual === 'number' && actual >= (cond.lt as number)) return false
      if ('eq' in cond && actual !== cond.eq) return false
      if ('ne' in cond && actual === cond.ne) return false
      if ('in' in cond && Array.isArray(cond.in) && !cond.in.includes(actual)) return false
    } else {
      // Direct equality
      if (actual !== expected) return false
    }
  }

  return true
}

// ============================================================================
// Action Execution
// ============================================================================

async function executeAction(
  action: WorkflowAction,
  context: WorkflowContext
): Promise<void> {
  switch (action.type) {
    case 'notify_stakeholders':
      await notifyStakeholders(context.goalId, action.params.message as string)
      break
    case 'escalate_goal':
      await escalateGoal(context.goalId, action.params.escalateTo as string)
      break
    case 'adjust_timeline':
      await adjustTimeline(context.goalId, new Date(action.params.newEndDate as string))
      break
    case 'reallocate_resources':
      await reallocateResources(
        action.params.fromProjectId as string,
        action.params.toProjectId as string,
        action.params.resourceCount as number
      )
      break
    case 'update_status':
      await updateGoalStatus(context.goalId, action.params.status as string)
      break
    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}

// ============================================================================
// Action Executors
// ============================================================================

/**
 * Create notifications for all stakeholders on a goal
 */
async function notifyStakeholders(goalId: string, message: string): Promise<void> {
  const stakeholders = await prisma.goalStakeholder.findMany({
    where: { goalId },
    select: { userId: true },
  })

  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { workspaceId: true, title: true },
  })

  if (!goal) return

  // Create a goal update as notification mechanism
  await prisma.goalUpdate.create({
    data: {
      goalId,
      workspaceId: goal.workspaceId,
      updateType: 'STATUS_CHANGE',
      content: `[Automated] ${message}`,
      authorId: stakeholders[0]?.userId ?? 'system',
      previousData: { type: 'workflow_notification', stakeholderCount: stakeholders.length },
    },
  })

  // Create activity entries for each stakeholder
  for (const stakeholder of stakeholders) {
    await prisma.activity.create({
      data: {
        workspaceId: goal.workspaceId,
        actorId: stakeholder.userId,
        entity: 'goal',
        entityId: goalId,
        action: 'WORKFLOW_NOTIFICATION',
        meta: { message, goalTitle: goal.title },
      },
    })
  }
}

/**
 * Escalate a goal to a manager or higher-level stakeholder
 */
async function escalateGoal(goalId: string, escalateTo: string): Promise<void> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { id: true, title: true, workspaceId: true },
  })

  if (!goal) return

  // Add escalation target as a REVIEWER stakeholder
  await prisma.goalStakeholder.upsert({
    where: { goalId_userId: { goalId, userId: escalateTo } },
    update: { role: 'REVIEWER', canApprove: true },
    create: {
      goalId,
      workspaceId: goal.workspaceId,
      userId: escalateTo,
      role: 'REVIEWER',
      canApprove: true,
    },
  })

  // Log the escalation
  await prisma.goalUpdate.create({
    data: {
      goalId,
      workspaceId: goal.workspaceId,
      updateType: 'STATUS_CHANGE',
      content: `[Automated] Goal escalated for review`,
      authorId: escalateTo,
    },
  })

  await prisma.activity.create({
    data: {
      workspaceId: goal.workspaceId,
      actorId: escalateTo,
      entity: 'goal',
      entityId: goalId,
      action: 'GOAL_ESCALATED',
      meta: { goalTitle: goal.title },
    },
  })
}

/**
 * Adjust a goal's timeline and cascade to children
 */
async function adjustTimeline(goalId: string, newEndDate: Date): Promise<void> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { id: true, endDate: true, workspaceId: true },
  })

  if (!goal) return

  await prisma.goal.update({
    where: { id: goalId },
    data: { endDate: newEndDate },
  })

  // Cascade timeline changes to children
  await cascadeParentChanges(goalId, { endDate: newEndDate })

  // Recalculate analytics
  await recalculateGoalAnalytics(goalId)

  await prisma.goalUpdate.create({
    data: {
      goalId,
      workspaceId: goal.workspaceId,
      updateType: 'STATUS_CHANGE',
      content: `[Automated] Timeline adjusted — new deadline: ${newEndDate.toLocaleDateString()}`,
      authorId: 'system',
      previousData: { oldEndDate: goal.endDate.toISOString() },
      newData: { newEndDate: newEndDate.toISOString() },
    },
  })
}

/**
 * Reallocate resources between projects
 */
async function reallocateResources(
  fromProjectId: string,
  toProjectId: string,
  resourceCount: number
): Promise<void> {
  // Move project allocations
  const allocations = await prisma.projectAllocation.findMany({
    where: { projectId: fromProjectId },
    take: resourceCount,
  })

  for (const allocation of allocations) {
    await prisma.projectAllocation.update({
      where: { id: allocation.id },
      data: { projectId: toProjectId },
    })
  }

  // Log activities for both projects
  const [fromProject, toProject] = await Promise.all([
    prisma.project.findUnique({ where: { id: fromProjectId }, select: { workspaceId: true, name: true } }),
    prisma.project.findUnique({ where: { id: toProjectId }, select: { name: true } }),
  ])

  if (fromProject) {
    await prisma.activity.create({
      data: {
        workspaceId: fromProject.workspaceId,
        actorId: 'system',
        entity: 'project',
        entityId: fromProjectId,
        action: 'RESOURCE_REALLOCATED',
        meta: {
          from: fromProject.name,
          to: toProject?.name,
          count: resourceCount,
        },
      },
    })
  }
}

/**
 * Update a goal's status
 */
async function updateGoalStatus(goalId: string, status: string): Promise<void> {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { status: true, workspaceId: true },
  })

  if (!goal) return

  await prisma.goal.update({
    where: { id: goalId },
    data: { status: status as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' },
  })

  await prisma.goalUpdate.create({
    data: {
      goalId,
      workspaceId: goal.workspaceId,
      updateType: 'STATUS_CHANGE',
      content: `[Automated] Status changed from ${goal.status} to ${status}`,
      authorId: 'system',
      previousData: { status: goal.status },
      newData: { status },
    },
  })
}

// ============================================================================
// Trigger Helpers
// ============================================================================

/**
 * Fire workflow triggers based on goal analytics
 */
export async function fireAnalyticsTriggers(
  goalId: string,
  workspaceId: string,
  analytics: { riskScore: number; progressVelocity: number; updateFrequency: number }
): Promise<void> {
  // GOAL_AT_RISK
  if (analytics.riskScore > 60) {
    await evaluateWorkflowRules({
      goalId,
      workspaceId,
      trigger: 'GOAL_AT_RISK',
      data: { riskScore: analytics.riskScore },
    })
  }

  // GOAL_PROGRESS_STALLED
  if (analytics.progressVelocity <= 0 && analytics.updateFrequency < 0.5) {
    await evaluateWorkflowRules({
      goalId,
      workspaceId,
      trigger: 'GOAL_PROGRESS_STALLED',
      data: {
        velocity: analytics.progressVelocity,
        updateFrequency: analytics.updateFrequency,
      },
    })
  }

  // DEADLINE_APPROACHING
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: { endDate: true, progress: true },
  })

  if (goal) {
    const daysToDeadline = (goal.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    if (daysToDeadline < 14 && goal.progress < 80) {
      await evaluateWorkflowRules({
        goalId,
        workspaceId,
        trigger: 'DEADLINE_APPROACHING',
        data: { daysToDeadline, progress: goal.progress },
      })
    }
  }
}
