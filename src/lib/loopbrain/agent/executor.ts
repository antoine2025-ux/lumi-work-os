/**
 * Loopbrain Agent Executor
 *
 * Executes an approved AgentPlan step-by-step:
 * 1. Resolves inter-step dependencies ("$step1.data.id")
 * 2. Validates parameters against the tool's Zod schema
 * 3. Calls the tool's execute function
 * 4. Records results and stops on first failure
 */

import { ToolRegistry } from './tool-registry'
import { logger } from '@/lib/logger'
import type { AgentContext, AgentPlan, PlannedStep, ToolResult, ExecutionResult, LoopbrainTool } from './types'
import { assertToolRole, LoopbrainPermissionError } from '../permissions'
import { assertProjectMembership, assertSpaceMembership } from '../permissions/resource-acl'
import { assertHierarchyAccess } from '../permissions/hierarchy'

// ---------------------------------------------------------------------------
// Dependency resolution
// ---------------------------------------------------------------------------

/**
 * Resolve "$stepN.data.field" references in parameters using results from
 * previously executed steps.
 *
 * Convention:
 *   "$step1.data.id"  → results[0].data.id
 *   "$step2.data.projects[0].id" → results[1].data.projects[0].id
 */
function resolveReferences(
  params: Record<string, unknown>,
  stepResults: Map<number, ToolResult>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.startsWith('$step')) {
      resolved[key] = resolveRef(value, stepResults)
    } else {
      resolved[key] = value
    }
  }

  return resolved
}

function resolveRef(ref: string, stepResults: Map<number, ToolResult>): unknown {
  // Parse "$step<N>.data.<path>"
  const match = ref.match(/^\$step(\d+)\.(.+)$/)
  if (!match) return ref

  const stepNum = parseInt(match[1], 10)
  const path = match[2]

  const result = stepResults.get(stepNum)
  if (!result || !result.success) {
    logger.warn('Agent executor: reference to failed/missing step', { ref, stepNum })
    return ref // return unresolved — will likely fail validation
  }

  // Walk the path (supports "data.id", "data.projects[0].id")
  const parts = path.split('.')
  let current: unknown = result

  for (const part of parts) {
    if (current === null || current === undefined) return undefined

    // Check for array index, e.g. "projects[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)]$/)
    if (arrayMatch) {
      current = (current as Record<string, unknown>)[arrayMatch[1]]
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2], 10)]
      } else {
        return undefined
      }
    } else {
      current = (current as Record<string, unknown>)[part]
    }
  }

  return current
}

// ---------------------------------------------------------------------------
// Permission enforcement
// ---------------------------------------------------------------------------

/**
 * Run permission checks declared by the tool before execution.
 * Extracts resource IDs from resolved params to check project/space membership.
 */
async function enforceToolPermissions(
  tool: LoopbrainTool,
  params: Record<string, unknown>,
  context: AgentContext,
): Promise<void> {
  const { permissions } = tool
  if (!permissions) return

  // 1. RBAC role check
  assertToolRole(context, permissions.minimumRole)

  // 2. Resource-level checks
  if (permissions.resourceChecks) {
    for (const check of permissions.resourceChecks) {
      switch (check) {
        case 'projectMembership': {
          const projectId = (params.projectId as string) ?? undefined
          if (projectId) {
            await assertProjectMembership(context, projectId)
          }
          break
        }
        case 'spaceMembership': {
          const spaceId = (params.spaceId as string) ?? undefined
          if (spaceId) {
            await assertSpaceMembership(context, spaceId)
          }
          break
        }
      }
    }
  }

  // 3. Hierarchy check
  if (permissions.hierarchyCheck) {
    const targetPersonId =
      (params.targetPersonId as string) ??
      (params.personId as string) ??
      (params.assigneeId as string) ??
      undefined
    if (targetPersonId) {
      await assertHierarchyAccess(context, targetPersonId)
    }
  }
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

export async function executeAgentPlan(
  plan: AgentPlan,
  context: AgentContext,
  registry: ToolRegistry
): Promise<ExecutionResult> {
  const completed: PlannedStep[] = []
  const results: ToolResult[] = []
  const stepResults = new Map<number, ToolResult>()

  for (const step of plan.steps) {
    logger.info('Agent executor: running step', {
      stepNumber: step.stepNumber,
      toolName: step.toolName,
      description: step.description,
      workspaceId: context.workspaceId,
    })

    const tool = registry.get(step.toolName)
    if (!tool) {
      const error = `Unknown tool: ${step.toolName}`
      logger.error('Agent executor: tool not found', { toolName: step.toolName })
      return {
        completed,
        failed: { step, error },
        summary: buildSummary(completed, results, { step, error }),
        results,
      }
    }

    // Check dependencies are met
    if (step.dependsOn && step.dependsOn.length > 0) {
      for (const depNum of step.dependsOn) {
        const depResult = stepResults.get(depNum)
        if (!depResult || !depResult.success) {
          const error = `Dependency step ${depNum} has not completed successfully`
          return {
            completed,
            failed: { step, error },
            summary: buildSummary(completed, results, { step, error }),
            results,
          }
        }
      }
    }

    // Resolve inter-step references
    const resolvedParams = resolveReferences(step.parameters, stepResults)

    // Permission check before execution
    try {
      await enforceToolPermissions(tool, resolvedParams, context)
    } catch (err) {
      if (err instanceof LoopbrainPermissionError) {
        const error = `Permission denied: ${err.message}`
        logger.warn('Agent executor: permission denied', {
          stepNumber: step.stepNumber,
          toolName: step.toolName,
          code: err.code,
          error,
        })
        return {
          completed,
          failed: { step, error },
          summary: buildSummary(completed, results, { step, error }),
          results,
        }
      }
      throw err
    }

    // Execute
    let result: ToolResult
    try {
      result = await tool.execute(resolvedParams, context)
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      logger.error('Agent executor: tool threw', {
        stepNumber: step.stepNumber,
        toolName: step.toolName,
        error,
      })
      result = { success: false, error, humanReadable: `Error: ${error}` }
    }

    stepResults.set(step.stepNumber, result)
    results.push(result)

    if (!result.success) {
      return {
        completed,
        failed: { step, error: result.error ?? 'Unknown error' },
        summary: buildSummary(completed, results, { step, error: result.error ?? 'Unknown error' }),
        results,
      }
    }

    completed.push(step)
    logger.info('Agent executor: step completed', {
      stepNumber: step.stepNumber,
      toolName: step.toolName,
      humanReadable: result.humanReadable,
    })
  }

  return {
    completed,
    summary: buildSummary(completed, results),
    results,
  }
}

// ---------------------------------------------------------------------------
// Summary builder
// ---------------------------------------------------------------------------

function buildSummary(
  completed: PlannedStep[],
  results: ToolResult[],
  failure?: { step: PlannedStep; error: string }
): string {
  const lines: string[] = []

  for (let i = 0; i < completed.length; i++) {
    const r = results[i]
    lines.push(`✓ ${r?.humanReadable ?? completed[i].description}`)
  }

  if (failure) {
    lines.push(`✗ Step ${failure.step.stepNumber} failed: ${failure.error}`)
  }

  if (lines.length === 0) {
    return 'No steps were executed.'
  }

  return lines.join('\n')
}
