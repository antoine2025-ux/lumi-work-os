/**
 * Policy Validator
 *
 * Pre-activation checks to ensure a policy is safe and executable.
 * Called before enabling a policy or running a test execution.
 */

import { ALL_TOOLS } from '../tool-schemas'
import { toolRegistry } from '../agent/tool-registry'
import type { AgentPlan } from '../agent/types'
import type { AgentRole } from '../agent/types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const ROLE_LEVEL: Record<AgentRole, number> = {
  VIEWER: 1,
  MEMBER: 2,
  ADMIN: 3,
  OWNER: 4,
}

/**
 * Validate a policy before activation.
 *
 * Checks:
 * - Content is non-empty and within size limits
 * - Compiled plan exists and has at least one step
 * - All referenced tools exist in the registry
 * - User has minimum role for every tool in the plan
 * - Action count does not exceed maxActions
 */
export function validatePolicy(params: {
  content: string
  compiledPlan: AgentPlan | null | undefined
  userRole: AgentRole
  maxActions: number
}): ValidationResult {
  const { content, compiledPlan, userRole, maxActions } = params
  const errors: string[] = []
  const warnings: string[] = []

  if (!content || content.trim().length === 0) {
    errors.push('Policy content is empty')
  }

  if (content && content.length > 10_000) {
    errors.push('Policy content exceeds 10,000 character limit')
  }

  if (!compiledPlan) {
    errors.push('Policy must be compiled before activation. Click "Compile" first.')
    return { valid: false, errors, warnings }
  }

  if (!compiledPlan.steps || compiledPlan.steps.length === 0) {
    errors.push('Compiled plan has no steps')
    return { valid: false, errors, warnings }
  }

  if (compiledPlan.steps.length > maxActions) {
    errors.push(
      `Plan has ${compiledPlan.steps.length} steps, exceeding the max of ${maxActions}`,
    )
  }

  const toolNames = new Set(ALL_TOOLS.map((t) => t.name))
  const userLevel = ROLE_LEVEL[userRole] ?? 0

  for (const step of compiledPlan.steps) {
    if (!toolNames.has(step.toolName)) {
      errors.push(`Step ${step.stepNumber}: Unknown tool "${step.toolName}"`)
      continue
    }

    const registeredTool = toolRegistry.get(step.toolName)
    if (registeredTool) {
      const requiredLevel = ROLE_LEVEL[registeredTool.permissions.minimumRole] ?? 0
      if (userLevel < requiredLevel) {
        errors.push(
          `Step ${step.stepNumber}: Tool "${step.toolName}" requires ${registeredTool.permissions.minimumRole} role, but you have ${userRole}`,
        )
      }
    }

    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        if (dep >= step.stepNumber) {
          warnings.push(
            `Step ${step.stepNumber}: Depends on step ${dep} which hasn't executed yet`,
          )
        }
        if (!compiledPlan.steps.some((s) => s.stepNumber === dep)) {
          errors.push(
            `Step ${step.stepNumber}: Depends on non-existent step ${dep}`,
          )
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
