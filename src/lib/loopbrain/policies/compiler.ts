/**
 * Policy Compiler
 *
 * Translates markdown policy content into a structured AgentPlan using the LLM.
 * This happens at save/test time so execution is LLM-free (cheaper, faster).
 */

import { z } from 'zod'
import { callLoopbrainLLM } from '../orchestrator'
import { ALL_TOOLS } from '../tool-schemas'
import { logger } from '@/lib/logger'
import type { AgentPlan, PlannedStep } from '../agent/types'
import type { ToolDefinition } from '@/lib/ai/providers'
import { generateSuggestions } from './suggestion-generator'
import type { PolicySuggestion } from './types'

const COMPILE_MODEL = process.env.LOOPBRAIN_MODEL || 'claude-sonnet-4-6'

export interface CompileResult {
  success: boolean
  plan?: AgentPlan
  error?: string
  warnings?: string[]
  suggestions?: PolicySuggestion[]
  estimatedTokens?: number
}

const PlannedStepSchema = z.object({
  stepNumber: z.number(),
  toolName: z.string(),
  parameters: z.record(z.string(), z.unknown()),
  dependsOn: z.array(z.number()).optional(),
  description: z.string(),
})

const CompiledPlanSchema = z.object({
  reasoning: z.string(),
  steps: z.array(PlannedStepSchema).min(1),
  requiresConfirmation: z.literal(false),
  warnings: z.array(z.string()).optional(),
})

function buildCompilerSystemPrompt(toolDefs: ToolDefinition[]): string {
  const toolList = toolDefs
    .map((t) => `- **${t.name}**: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`)
    .join('\n\n')

  return `You are a policy compiler for Loopbrain, a workplace automation engine.

Your job: Convert a user-written policy (in markdown) into a structured execution plan (JSON).

The execution plan will run autonomously without human confirmation, so set requiresConfirmation to false.

## Available Tools

${toolList}

## Output Format

Return ONLY valid JSON (no markdown fences, no extra text):

{
  "reasoning": "Brief explanation of how you interpreted the policy",
  "steps": [
    {
      "stepNumber": 1,
      "toolName": "toolNameHere",
      "parameters": { "param1": "value1" },
      "dependsOn": [],
      "description": "Human-readable description of this step"
    }
  ],
  "requiresConfirmation": false,
  "warnings": ["Optional warnings about things the policy asks for that can't be done with available tools"]
}

## Platform Capabilities

Loopwell has built-in integrations for:
- **Email triggers**: Gmail push notifications via Google Cloud Pub/Sub. Policies with EMAIL_KEYWORD triggers fire automatically when matching emails arrive — no external services (Zapier, Google Apps Script, etc.) needed.
- **Scheduled triggers**: Cron-based scheduling (daily, weekly, monthly, custom cron).
- **Google Drive**: Search, read, create, and update documents.
- **Gmail**: Send, reply, search emails.
- **Google Calendar**: Create events.

Do NOT suggest external services or infrastructure setup for trigger conditions. The platform handles all triggering internally.

## Rules

1. Map each instruction in the policy to one or more tool calls.
2. Use $stepN.data.field references for inter-step dependencies (e.g., "$step1.data.id").
3. If the policy references data that must be fetched first, add read steps before write steps.
4. If an instruction cannot be mapped to any available tool, add it to the warnings array.
5. Keep step count reasonable (max 30 steps).
6. Parameters must match the tool's expected schema.
7. For date/time references like "last week", "this month", use relative date calculations from the current date.
8. Always set requiresConfirmation to false (policies run autonomously).
9. Do NOT generate warnings about trigger conditions, webhooks, or polling mechanisms — the platform handles these internally via push notifications and cron jobs.`
}

/**
 * Compile a markdown policy into a structured AgentPlan.
 *
 * @param content - The markdown policy content written by the user
 * @param toolDefinitions - Available tool definitions (filtered by role if needed)
 * @param context - Workspace/user context for the compilation
 */
export async function compilePolicy(
  content: string,
  toolDefinitions: ToolDefinition[],
  _context: { workspaceId: string; userId: string },
): Promise<CompileResult> {
  if (!content.trim()) {
    return { success: false, error: 'Policy content is empty' }
  }

  const systemPrompt = buildCompilerSystemPrompt(
    toolDefinitions.length > 0 ? toolDefinitions : ALL_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  )

  try {
    const response = await callLoopbrainLLM(
      `Compile this policy into an execution plan:\n\n${content}`,
      systemPrompt,
      { model: COMPILE_MODEL, maxTokens: 4096 },
    )

    const jsonText = extractJSON(response.content)
    if (!jsonText) {
      return { success: false, error: 'LLM did not return valid JSON' }
    }

    const parsed = JSON.parse(jsonText)
    const validated = CompiledPlanSchema.safeParse(parsed)

    if (!validated.success) {
      logger.warn('[PolicyCompiler] Zod validation failed', {
        errors: validated.error.issues,
      })
      return {
        success: false,
        error: `Invalid plan structure: ${validated.error.issues.map((i) => i.message).join(', ')}`,
      }
    }

    const plan = validated.data
    const validationWarnings = validateToolReferences(plan.steps, toolDefinitions)
    const allWarnings = [...(plan.warnings ?? []), ...validationWarnings]

    const agentPlan: AgentPlan = {
      reasoning: plan.reasoning,
      steps: plan.steps,
      requiresConfirmation: false,
    }

    let suggestions =
      allWarnings.length > 0 ? await generateSuggestions(content, allWarnings) : undefined
    if (suggestions?.length) {
      suggestions = suggestions.filter((s) => content.includes(s.currentText.trim()))
      suggestions.sort((a, b) => b.currentText.length - a.currentText.length)
      suggestions = suggestions.filter((s, i) =>
        !suggestions!.slice(0, i).some((longer) => longer.currentText.includes(s.currentText)),
      )
    }

    return {
      success: true,
      plan: agentPlan,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      suggestions,
      estimatedTokens: response.usage?.totalTokens,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[PolicyCompiler] Compilation failed', { error: message })
    return { success: false, error: `Compilation failed: ${message}` }
  }
}

function extractJSON(text: string): string | null {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
  if (fenceMatch) return fenceMatch[1].trim()

  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1)
  }

  return null
}

function validateToolReferences(
  steps: PlannedStep[],
  toolDefs: ToolDefinition[],
): string[] {
  const warnings: string[] = []
  const toolNames = new Set(
    toolDefs.length > 0
      ? toolDefs.map((t) => t.name)
      : ALL_TOOLS.map((t) => t.name),
  )

  for (const step of steps) {
    if (!toolNames.has(step.toolName)) {
      warnings.push(`Step ${step.stepNumber}: Unknown tool "${step.toolName}"`)
    }
  }

  return warnings
}
