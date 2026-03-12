/**
 * Policy Executor
 *
 * Runs a compiled policy plan autonomously, logging each action and enforcing
 * safety limits (timeout, max actions, circuit breaker).
 *
 * Reuses the existing executeAgentPlan() and enrichAgentContext() infrastructure.
 */

import { prismaUnscoped } from '@/lib/db'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { logger } from '@/lib/logger'
import { emitToWorkspace } from '@/lib/socket/emit'
import { executeAgentPlan } from '../agent/executor'
import { toolRegistry } from '../agent/tool-registry'
import { enrichAgentContext } from '../permissions'
import { getMemberRole } from '../context/getMemberRole'
import { computeNextRunAt } from './scheduler'
import type { AgentPlan, ExecutionResult } from '../agent/types'
import type { LoopbrainPolicy } from '@prisma/client'
import { Prisma } from '@prisma/client'
import type { ScheduleConfig } from '@/lib/validations/policies'

const MAX_CONSECUTIVE_FAILURES = 3

export interface PolicyExecutionResult {
  executionId: string
  status: 'SUCCESS' | 'FAILURE' | 'PARTIAL' | 'TIMEOUT'
  actionsCount: number
  durationMs: number
  result: ExecutionResult | null
  error?: string
}

/**
 * Execute a policy run end-to-end:
 * 1. Create PolicyExecution record (RUNNING)
 * 2. Resolve the policy owner's current permissions
 * 3. Run the compiled plan via executeAgentPlan()
 * 4. Log each action to PolicyActionLog
 * 5. Update execution status, circuit breaker, and next run time
 */
export async function executePolicyRun(
  policy: LoopbrainPolicy,
  triggerSource: string,
): Promise<PolicyExecutionResult> {
  const startTime = Date.now()

  const execution = await prismaUnscoped.policyExecution.create({
    data: {
      policyId: policy.id,
      workspaceId: policy.workspaceId,
      userId: policy.userId,
      triggerSource,
      status: 'RUNNING',
    },
  })

  try {
    const memberExists = await prismaUnscoped.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: policy.workspaceId,
          userId: policy.userId,
        },
      },
      select: { id: true },
    })

    if (!memberExists) {
      return await failExecution(execution.id, policy, startTime, 'Policy owner is no longer a workspace member')
    }

    const userRole = await getMemberRole(policy.workspaceId, policy.userId)
    const agentCtx = await enrichAgentContext(
      policy.workspaceId,
      policy.userId,
      userRole,
    )

    setWorkspaceContext(policy.workspaceId)

    const compiledPlan = policy.compiledPlan as AgentPlan | null
    if (!compiledPlan || !compiledPlan.steps || compiledPlan.steps.length === 0) {
      return await failExecution(execution.id, policy, startTime, 'No compiled plan available')
    }

    const executionPromise = executeAgentPlan(compiledPlan, agentCtx, toolRegistry)

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), policy.maxDurationMs)
    })

    const planResult = await Promise.race([executionPromise, timeoutPromise])

    if (planResult === null) {
      return await failExecution(execution.id, policy, startTime, 'Policy execution timed out', 'TIMEOUT')
    }

    const durationMs = Date.now() - startTime
    const actionsCount = planResult.completed.length

    await logActions(execution.id, planResult)

    const status = planResult.failed ? 'FAILURE' : 'SUCCESS'

    await prismaUnscoped.policyExecution.update({
      where: { id: execution.id },
      data: {
        status,
        completedAt: new Date(),
        durationMs,
        actionsCount,
        result: {
          summary: planResult.summary,
          completedSteps: planResult.completed.length,
          failedStep: planResult.failed
            ? { stepNumber: planResult.failed.step.stepNumber, error: planResult.failed.error }
            : null,
        },
        errorMessage: planResult.failed?.error ?? null,
      },
    })

    if (status === 'SUCCESS') {
      await prismaUnscoped.loopbrainPolicy.update({
        where: { id: policy.id },
        data: { consecutiveFailures: 0 },
      })
    } else {
      await incrementFailures(policy)
    }

    await updateNextRunAt(policy)

    emitToWorkspace(policy.workspaceId, 'policy.execution.completed', {
      policyId: policy.id,
      policyName: policy.name,
      executionId: execution.id,
      status,
      actionsCount,
      summary: planResult.summary,
      userId: policy.userId,
    })

    return {
      executionId: execution.id,
      status: status as 'SUCCESS' | 'FAILURE',
      actionsCount,
      durationMs,
      result: planResult,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[PolicyExecutor] Unexpected error', {
      policyId: policy.id,
      executionId: execution.id,
      error: message,
    })
    return await failExecution(execution.id, policy, startTime, message)
  }
}

async function failExecution(
  executionId: string,
  policy: LoopbrainPolicy,
  startTime: number,
  errorMessage: string,
  status: 'FAILURE' | 'TIMEOUT' = 'FAILURE',
): Promise<PolicyExecutionResult> {
  const durationMs = Date.now() - startTime

  await prismaUnscoped.policyExecution.update({
    where: { id: executionId },
    data: {
      status,
      completedAt: new Date(),
      durationMs,
      errorMessage,
    },
  })

  await incrementFailures(policy)
  await updateNextRunAt(policy)

  return {
    executionId,
    status,
    actionsCount: 0,
    durationMs,
    result: null,
    error: errorMessage,
  }
}

async function incrementFailures(policy: LoopbrainPolicy): Promise<void> {
  const newCount = policy.consecutiveFailures + 1

  const updateData: Record<string, unknown> = {
    consecutiveFailures: newCount,
  }

  if (newCount >= MAX_CONSECUTIVE_FAILURES) {
    updateData.enabled = false
    updateData.disabledReason = `Auto-disabled after ${MAX_CONSECUTIVE_FAILURES} consecutive failures`
    logger.warn('[PolicyExecutor] Circuit breaker triggered', {
      policyId: policy.id,
      consecutiveFailures: newCount,
    })
  }

  await prismaUnscoped.loopbrainPolicy.update({
    where: { id: policy.id },
    data: updateData,
  })
}

async function updateNextRunAt(policy: LoopbrainPolicy): Promise<void> {
  if (policy.triggerType !== 'SCHEDULE' || !policy.scheduleConfig || !policy.scheduleType) {
    return
  }

  const config = policy.scheduleConfig as ScheduleConfig
  const nextRun = computeNextRunAt(config)

  if (nextRun) {
    await prismaUnscoped.loopbrainPolicy.update({
      where: { id: policy.id },
      data: { nextRunAt: nextRun },
    })
  }
}

async function logActions(
  executionId: string,
  result: ExecutionResult,
): Promise<void> {
  const logs: Prisma.PolicyActionLogCreateManyInput[] = result.completed.map((step, i) => ({
    executionId,
    stepNumber: step.stepNumber,
    toolName: step.toolName,
    params: step.parameters as Prisma.InputJsonValue,
    success: true,
    result: (result.results[i]?.data ?? Prisma.JsonNull) as Prisma.InputJsonValue,
    errorMessage: null,
    durationMs: null,
  }))

  if (result.failed) {
    logs.push({
      executionId,
      stepNumber: result.failed.step.stepNumber,
      toolName: result.failed.step.toolName,
      params: result.failed.step.parameters as Prisma.InputJsonValue,
      success: false,
      result: Prisma.JsonNull,
      errorMessage: result.failed.error,
      durationMs: null,
    })
  }

  if (logs.length > 0) {
    await prismaUnscoped.policyActionLog.createMany({ data: logs })
  }
}
