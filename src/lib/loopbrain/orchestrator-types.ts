/**
 * Loopbrain Orchestrator Types
 * 
 * Type definitions for the Loopbrain Orchestrator - the central "Virtual COO" brain
 * that coordinates context retrieval, semantic search, and LLM calls.
 */

import { ContextObject, ContextType } from './context-types'
import { ContextObject as UnifiedContextObject } from '@/lib/context/context-types'

/**
 * Loopbrain operating modes
 * 
 * - spaces: Workspace/Spaces mode - focuses on projects, pages, tasks
 * - org: Organization mode - focuses on teams, roles, hierarchy
 * - dashboard: Dashboard mode - focuses on workspace overview and activity
 */
export type LoopbrainMode = 'spaces' | 'org' | 'dashboard'

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
  /** Role ID (for Org mode) */
  roleId?: string
  /** Team ID (for Org mode) */
  teamId?: string
  
  // Optional flags
  /** Whether to use semantic search for RAG augmentation */
  useSemanticSearch?: boolean
  /** Maximum number of context items to retrieve via semantic search */
  maxContextItems?: number
  /** Explicit flag to send response to Slack (set by UI action buttons) */
  sendToSlack?: boolean
  /** Slack channel to send to (if sendToSlack is true) */
  slackChannel?: string
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
  /** Optional metadata (model, tokens, etc.) */
  metadata?: {
    model?: string
    tokens?: {
      prompt?: number
      completion?: number
      total?: number
    }
    retrievedCount?: number
  }
}


