/**
 * Loopbrain Orchestrator Types
 * 
 * Type definitions for the Loopbrain Orchestrator - the central "Virtual COO" brain
 * that coordinates context retrieval, semantic search, and LLM calls.
 */

import { ContextObject, ContextType } from './context-types'
import { ContextObject as UnifiedContextObject } from '@/lib/context/context-types'
import type { AgentPlan, ClarifyingQuestion, ClarificationContext, AdvisoryContext, AdvisoryResponse } from './agent/types'
import type { OrgQuestionContext } from './org-question-types'

/**
 * Loopbrain operating modes
 * 
 * - spaces: Workspace/Spaces mode - focuses on projects, pages, tasks
 * - org: Organization mode - focuses on teams, roles, hierarchy
 * - dashboard: Dashboard mode - focuses on workspace overview and activity
 */
export type LoopbrainMode = 'spaces' | 'org' | 'dashboard' | 'goals'

/**
 * Loopbrain request parameters
 */
export interface LoopbrainRequest {
  /** Workspace ID (from auth, never from client) */
  workspaceId: string
  /** User ID (from auth) */
  userId: string
  /** Operating mode */
  mode: LoopbrainMode
  /** User's query/question */
  query: string
  
  // Context anchors - optional depending on mode
  /** Project ID (for Spaces mode) */
  projectId?: string
  /** Page ID (for Spaces mode) */
  pageId?: string
  /** Task ID (for Spaces mode) */
  taskId?: string
  /** Epic ID (for Spaces mode) */
  epicId?: string
  /** Role ID (for Org mode) */
  roleId?: string
  /** Team ID (for Org mode) */
  teamId?: string
  /** Person ID (for Org mode) */
  personId?: string
  
  // Optional flags
  /** Whether to use semantic search for RAG augmentation */
  useSemanticSearch?: boolean
  /** Maximum number of context items to retrieve via semantic search */
  maxContextItems?: number
  /** Explicit flag to send response to Slack (set by UI action buttons) */
  sendToSlack?: boolean
  /** Slack channel to send to (if sendToSlack is true) */
  slackChannel?: string
  /** Client-side metadata (e.g., project Slack channel hints from localStorage) */
  clientMetadata?: Record<string, unknown>
  /** Slack channel hints from project (sent in request body, not persisted) */
  slackChannelHints?: string[]
  /** Pending agent plan from previous turn (for confirmation flow) */
  pendingPlan?: AgentPlan
  /** Conversation context from previous turns (for clarification follow-ups) */
  conversationContext?: string
  /** Pending clarification context from previous turn (answer routing) */
  pendingClarification?: ClarificationContext
  /** Pending advisory context from previous turn (advisory→execution transition) */
  pendingAdvisory?: AdvisoryContext
  /** Optional request ID (passed from API route for tracing) */
  requestId?: string
}

/**
 * Retrieved item from semantic search
 */
export interface RetrievedItem {
  contextItemId: string
  contextId: string
  type: ContextType
  title: string
  score?: number
}

/**
 * Context summary for Loopbrain response
 */
export interface LoopbrainContextSummary {
  /** Primary context object (the main entity being queried) */
  primaryContext?: ContextObject
  /** Related context objects (if any) */
  relatedContext?: ContextObject[]
  /** Items retrieved via semantic search */
  retrievedItems?: RetrievedItem[]
  /** Structured ContextObjects (unified format) for workspace entities */
  structuredContext?: UnifiedContextObject[]
  /** Personal space documents (wiki pages) for the current user */
  personalDocs?: UnifiedContextObject[]
  /** Organization people (users with their roles/positions) */
  orgPeople?: UnifiedContextObject[]
  /** Org question context (set during org mode query processing) */
  orgQuestion?: OrgQuestionContext
  /** Org health signals (set during org mode query processing) */
  orgHealth?: Record<string, unknown>
  /** Epics for the current project (if projectId is present) */
  projectEpics?: UnifiedContextObject[]
  /** Tasks for the current project (if projectId is present) */
  projectTasks?: UnifiedContextObject[]
  /** User task summary for task-intent precision guard */
  userTaskSummary?: string
  /** Unified action items (tasks + todos) for structured prompt rendering */
  userActionItems?: Array<{
    id: string
    source: string
    title: string
    status: string
    priority: string | null
    dueDate: string | null
    isOverdue: boolean
    projectName: string | null
  }>
  /** Slack context from project channels (Tier B - non-persistent) */
  slackContext?: Array<{
    channel: string
    channelId?: string
    relevance: 'high' | 'medium' | 'low'
    summary: string
    messages: Array<{
      user: string
      userId?: string
      text: string
      ts: string
      threadTs?: string
      replies?: number
    }>
    messageCount: number
  }>
}

/**
 * Suggestion action for follow-up actions
 */
export interface LoopbrainSuggestion {
  /** Human-readable label */
  label: string
  /** Action identifier */
  action: string
  /** Optional payload/data for the action */
  payload?: Record<string, unknown>
}

/**
 * Loopbrain response
 */
export interface LoopbrainResponse {
  /** Operating mode used */
  mode: LoopbrainMode
  /** Workspace ID */
  workspaceId: string
  /** User ID */
  userId: string
  /** Original query */
  query: string
  /** Context summary */
  context: LoopbrainContextSummary
  /** LLM-generated answer (markdown) */
  answer: string
  /** Suggested follow-up actions */
  suggestions: LoopbrainSuggestion[]
  /** Open loops the system is tracking for this user (World Model v0) */
  openLoops?: {
    id: string
    type: string
    title: string
    detail: string | null
    entityType: string
    entityId: string
  }[]
  /** Pending agent plan awaiting user confirmation (agentic execution layer) */
  pendingPlan?: AgentPlan
  /** True when the agent is asking clarifying questions before building a plan */
  pendingClarification?: boolean
  /** Clarifying questions from the agent planner (when pendingClarification is true) */
  clarifyingQuestions?: ClarifyingQuestion[]
  /** Round-trip context for the frontend to send back with clarification answers */
  clarificationContext?: ClarificationContext
  /** Advisory response from brainstorming mode */
  advisory?: AdvisoryResponse
  /** Round-trip context for advisory→execution transition */
  advisoryContext?: AdvisoryContext
  /** Awareness observations and proactive suggestions from the planner */
  insights?: string[]
  /** Optional metadata (model, tokens, etc.) */
  metadata?: {
    model?: string
    tokens?: {
      prompt?: number
      completion?: number
      total?: number
    }
    retrievedCount?: number
    routing?: {
      contextType: string
      confidence: number
      itemCount: number
      usedFallback: boolean
      wantsOrg?: boolean
      hasOrgContext?: boolean
      inOrgMode?: boolean
      requestedMode?: string
    }
  }
}


