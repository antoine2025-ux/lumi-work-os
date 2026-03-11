/**
 * Loopbrain Client
 * 
 * Client-side helper for calling the Loopbrain Orchestrator API.
 * Provides typed functions for all Loopbrain modes (spaces, org, dashboard).
 */

import type {
  LoopbrainResponse,
  LoopbrainMode,
  ExtractedTask,
  LoopbrainClientAction,
} from './orchestrator-types'

/**
 * Extended response type that includes agent-loop fields not present on the
 * base orchestrator response (e.g. conversationId from the session store).
 */
export type LoopbrainClientResponse = LoopbrainResponse & {
  conversationId?: string
}
import type { AgentPlan, ClarificationContext, AdvisoryContext } from './agent/types'
import { getProjectSlackHints } from '@/lib/client-state/project-slack-hints'

export interface ExecutionStreamEvent {
  type: 'progress' | 'complete' | 'error'
  stepIndex?: number
  status?: 'executing' | 'success' | 'error'
  description?: string
  error?: string
  result?: unknown
  summary?: string
  /** Client-side navigation action (present on 'complete' events) */
  clientAction?: LoopbrainClientAction
}

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
  /** Person ID (for Org mode) */
  personId?: string
  /** Whether to use semantic search (default: true) */
  useSemanticSearch?: boolean
  /** Maximum number of context items to retrieve (default: 10) */
  maxContextItems?: number
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
  /** Confirmed extracted tasks from MeetingTaskReview for server-side bulk creation */
  pendingMeetingExtraction?: { tasks: ExtractedTask[] }
  /** Agent-loop conversation ID — sent back on follow-up turns to resume history */
  conversationId?: string
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
  /** Confirmed extracted tasks from MeetingTaskReview for server-side bulk creation */
  pendingMeetingExtraction?: { tasks: ExtractedTask[] }
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
): Promise<LoopbrainClientResponse> {
  const {
    mode,
    query,
    pageId,
    projectId,
    taskId,
    roleId,
    teamId,
    personId,
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
    personId,
    useSemanticSearch,
    maxContextItems,
    ...(Object.keys(clientMetadata).length > 0 && { clientMetadata }),
    ...(finalSlackChannelHints && finalSlackChannelHints.length > 0 && { slackChannelHints: finalSlackChannelHints }),
    ...(params.pendingPlan && { pendingPlan: params.pendingPlan }),
    ...(params.conversationContext && { conversationContext: params.conversationContext }),
    ...(params.pendingClarification && { pendingClarification: params.pendingClarification }),
    ...(params.pendingAdvisory && { pendingAdvisory: params.pendingAdvisory }),
    ...(params.pendingMeetingExtraction && { pendingMeetingExtraction: params.pendingMeetingExtraction }),
    ...(params.conversationId && { conversationId: params.conversationId }),
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
      } catch (_parseError) {
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

    // Type assertion - backend should return LoopbrainResponse (agent loop may add conversationId)
    return data as LoopbrainClientResponse
  } catch (error: unknown) {
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
 * Execute a pending plan via streaming API.
 * Streams progress events as each step completes.
 */
export async function executeLoopbrainPlanStream(
  params: { conversationId: string },
  callbacks: {
    onProgress: (event: ExecutionStreamEvent) => void
    onComplete: (summary: string, clientAction?: LoopbrainClientAction) => void
    onError: (error: string) => void
  }
): Promise<void> {
  const res = await fetch('/api/loopbrain/execute-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: params.conversationId }),
  })

  if (!res.ok) {
    let msg = 'Execution failed'
    try {
      const data = await res.json()
      if (data?.error) msg = data.error
    } catch {
      // ignore
    }
    callbacks.onError(msg)
    throw new Error(msg)
  }

  const reader = res.body?.getReader()
  if (!reader) {
    callbacks.onError('No response body')
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''
      for (const chunk of lines) {
        const dataMatch = chunk.match(/^data:\s*(.+)$/m)
        if (!dataMatch) continue
        try {
          const event = JSON.parse(dataMatch[1].trim()) as ExecutionStreamEvent
          callbacks.onProgress(event)
          if (event.type === 'complete' && event.summary) {
            callbacks.onComplete(event.summary, event.clientAction)
          }
          if (event.type === 'error' && event.error) {
            callbacks.onError(event.error)
          }
        } catch (_e) {
          // skip malformed events
        }
      }
    }
    if (buffer) {
      const dataMatch = buffer.match(/^data:\s*(.+)$/m)
      if (dataMatch) {
        try {
          const event = JSON.parse(dataMatch[1].trim()) as ExecutionStreamEvent
          callbacks.onProgress(event)
          if (event.type === 'complete' && event.summary) {
            callbacks.onComplete(event.summary, event.clientAction)
          }
          if (event.type === 'error' && event.error) {
            callbacks.onError(event.error)
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock()
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
): Promise<LoopbrainClientResponse> {
  return callLoopbrainAssistant({
    mode: 'spaces',
    ...params
  })
}

/**
 * Call Loopbrain assistant in Org mode
 * 
 * @param params - Loopbrain assistant parameters (without mode)
 * @returns Loopbrain response with answer, context, and suggestions
 * @throws Error if API call fails or returns non-2xx status
 */
export async function callOrgLoopbrainAssistant(
  params: Omit<LoopbrainAssistantParams, 'mode'>
): Promise<LoopbrainClientResponse> {
  return callLoopbrainAssistant({ mode: 'org', ...params })
}

