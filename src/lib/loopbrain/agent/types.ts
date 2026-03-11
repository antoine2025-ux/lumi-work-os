/**
 * Loopbrain Agent Types
 *
 * Shared type definitions for the agentic execution layer:
 * tool registry, planner, and executor.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export type ToolCategory =
  | 'project'
  | 'task'
  | 'wiki'
  | 'org'
  | 'goal'
  | 'calendar'
  | 'todo'
  | 'email'
  | 'drive'
  | 'slack'

export interface ToolPermissions {
  minimumRole: AgentRole
  /** Resource-level checks to run before execution */
  resourceChecks?: ('projectMembership' | 'spaceMembership')[]
  /** If true, requires manager/admin access to the target person */
  hierarchyCheck?: boolean
}

export interface LoopbrainTool {
  name: string
  description: string
  category: ToolCategory
  parameters: z.ZodSchema
  requiresConfirmation: boolean
  permissions: ToolPermissions
  execute: (params: unknown, context: AgentContext) => Promise<ToolResult>
}

export type AgentRole = 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER'

export interface AgentContext {
  workspaceId: string
  userId: string
  workspaceSlug: string
  userRole: AgentRole
  /** Org person ID resolved from OrgPosition — undefined if user has no org position */
  personId?: string
}

export interface ToolResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
  humanReadable: string
}

// ---------------------------------------------------------------------------
// Planner types
// ---------------------------------------------------------------------------

export interface PlannedStep {
  stepNumber: number
  toolName: string
  parameters: Record<string, unknown>
  dependsOn?: number[]
  description: string
}

export interface AgentPlan {
  reasoning: string
  steps: PlannedStep[]
  requiresConfirmation: boolean
}

// ---------------------------------------------------------------------------
// Clarification types (dual-mode planner)
// ---------------------------------------------------------------------------

export interface ClarifyingQuestion {
  /** What field/aspect this question is about */
  field: string
  /** The user-facing question text */
  question: string
  /** Optional quick-pick suggestions */
  suggestions?: string[]
  /** If false, user can skip this question */
  required: boolean
}

/** Advisory suggestion — a structured item in the suggested plan/structure */
export interface AdvisorySuggestionItem {
  type: string
  name: string
  description?: string
  parent?: string
}

/** Advisory response from the planner — brainstorming that may lead to action */
export interface AdvisoryResponse {
  analysis: string
  suggestedStructure: {
    summary: string
    items: AdvisorySuggestionItem[]
  }
  followUpQuestion: string
}

/** Context round-tripped through the frontend for advisory follow-ups */
export interface AdvisoryContext {
  /** The user's original advisory message */
  originalMessage: string
  /** The suggested structure from the advisory response */
  suggestedStructure: AdvisoryResponse['suggestedStructure']
}

export interface PlannerResult {
  mode: 'plan' | 'clarify' | 'advisory'
  /** When mode === 'plan' */
  plan?: AgentPlan
  /** When mode === 'clarify' */
  questions?: ClarifyingQuestion[]
  /** Conversational preamble for clarify mode */
  preamble?: string
  /** When mode === 'advisory' */
  advisory?: AdvisoryResponse
  /** Awareness observations and proactive suggestions (all modes) */
  insights?: string[]
}

/** Context round-tripped through the frontend for clarification follow-ups */
export interface ClarificationContext {
  /** The user's original message that triggered clarification */
  originalMessage: string
  /** The question fields that were asked */
  questionsAsked: string[]
}

// ---------------------------------------------------------------------------
// Executor types
// ---------------------------------------------------------------------------

export interface ExecutionResult {
  completed: PlannedStep[]
  failed?: { step: PlannedStep; error: string }
  summary: string
  results: ToolResult[]
}

// ---------------------------------------------------------------------------
// Message intent classification
// ---------------------------------------------------------------------------

export type MessageIntent = 'QUESTION' | 'ACTION' | 'HYBRID' | 'ADVISORY'
