/**
 * Loopbrain Client
 * 
 * Client-side helper for calling the Loopbrain Orchestrator API.
 * Provides typed functions for all Loopbrain modes (spaces, org, dashboard).
 */

import type {
  LoopbrainResponse,
  LoopbrainMode
} from './orchestrator-types'
import { getProjectSlackHints } from '@/lib/client-state/project-slack-hints'

/**
 * Parameters for Loopbrain assistant call (generic, supports all modes)
 */
export interface LoopbrainAssistantParams {
  /** Operating mode */
  mode: LoopbrainMode
  /** User's query/question */
  query: string
  /** Page ID (for Spaces mode) */
  pageId?: string
  /** Project ID (for Spaces mode) */
  projectId?: string
  /** Task ID (for Spaces mode) */
  taskId?: string
  /** Role ID (for Org mode) */
  roleId?: string
  /** Team ID (for Org mode) */
  teamId?: string
  /** Whether to use semantic search (default: true) */
  useSemanticSearch?: boolean
  /** Maximum number of context items to retrieve (default: 10) */
  maxContextItems?: number
  /** Slack channel hints from project (sent in request body, not persisted) */
  slackChannelHints?: string[]
}

/**
 * Parameters for Spaces assistant Loopbrain call (backward compatibility)
 */
export interface SpacesAssistantParams {
  /** User's query/question */
  query: string
  /** Page ID (for wiki pages) */
  pageId?: string
  /** Project ID (for project pages) */
  projectId?: string
  /** Task ID (for task pages) */
  taskId?: string
  /** Whether to use semantic search (default: true) */
  useSemanticSearch?: boolean
  /** Maximum number of context items to retrieve (default: 10) */
  maxContextItems?: number
}

/**
 * Call Loopbrain assistant (generic, supports all modes)
 * 
 * @param params - Loopbrain assistant parameters
 * @returns Loopbrain response with answer, context, and suggestions
 * @throws Error if API call fails or returns non-2xx status
 */
export async function callLoopbrainAssistant(
  params: LoopbrainAssistantParams
): Promise<LoopbrainResponse> {
  const {
    mode,
    query,
    pageId,
    projectId,
    taskId,
    roleId,
    teamId,
    useSemanticSearch = true,
    maxContextItems = 10
  } = params

  // Validate query
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Query is required and must be a non-empty string')
  }

  // Validate mode
  if (!mode || !['spaces', 'org', 'dashboard'].includes(mode)) {
    throw new Error('Mode must be one of: spaces, org, dashboard')
  }

  // Client-side routing fix: ensure projectId triggers spaces mode
  // This is a safety measure in addition to server-side override
  let finalMode = mode
  if (projectId || pageId || taskId) {
    finalMode = 'spaces'
  }

  // Read client-side metadata (e.g., project Slack channel hints from localStorage)
  const clientMetadata: Record<string, unknown> = {}
  if (projectId) {
    const hints = getProjectSlackHints(projectId)
    if (hints.length > 0) {
      clientMetadata.projectSlackHints = hints
    }
  }

  // Use slackChannelHints from params if provided, otherwise fallback to localStorage
  const finalSlackChannelHints = params.slackChannelHints || 
    (projectId ? getProjectSlackHints(projectId) : undefined)

  const payload = {
    mode: finalMode,
    query: query.trim(),
    pageId,
    projectId,
    taskId,
    roleId,
    teamId,
    useSemanticSearch,
    maxContextItems,
    ...(Object.keys(clientMetadata).length > 0 && { clientMetadata }),
    ...(finalSlackChannelHints && finalSlackChannelHints.length > 0 && { slackChannelHints: finalSlackChannelHints })
  }

  try {
    const response = await fetch('/api/loopbrain/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
      // Note: workspaceId and userId are NOT sent - backend derives from auth
    })

    if (!response.ok) {
      // Try to extract error message from response
      let errorMessage = 'Loopbrain couldn\'t answer right now. Please try again.'
      try {
        const errorData = await response.json()
        if (errorData.error && typeof errorData.error === 'string') {
          // Use backend error message if available
          errorMessage = errorData.error
        }
      } catch (parseError) {
        // If response isn't JSON, use status text
        errorMessage = `Request failed: ${response.status} ${response.statusText}`
      }

      // Log full error for debugging (not shown to user)
      console.error('Loopbrain API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage
      })

      throw new Error(errorMessage)
    }

    // Parse and validate response
    const data = await response.json()

    // Type assertion - backend should return LoopbrainResponse
    return data as LoopbrainResponse
  } catch (error) {
    // Re-throw with user-friendly message
    if (error instanceof Error) {
      // If it's already a user-friendly error, re-throw as-is
      if (error.message.includes('Loopbrain') || error.message.includes('Request failed')) {
        throw error
      }
      // Otherwise, wrap in user-friendly message
      console.error('Loopbrain client error:', error)
      throw new Error('Loopbrain couldn\'t answer right now. Please try again.')
    }
    throw new Error('Loopbrain couldn\'t answer right now. Please try again.')
  }
}

/**
 * Call Loopbrain assistant in Spaces mode (backward compatibility wrapper)
 * 
 * @param params - Spaces assistant parameters
 * @returns Loopbrain response with answer, context, and suggestions
 * @throws Error if API call fails or returns non-2xx status
 */
export async function callSpacesLoopbrainAssistant(
  params: SpacesAssistantParams
): Promise<LoopbrainResponse> {
  return callLoopbrainAssistant({
    mode: 'spaces',
    ...params
  })
}

