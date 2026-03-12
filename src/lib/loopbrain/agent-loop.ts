import {
  loadSession,
  appendMessage,
  appendMessages,
  storePendingPlan,
  clearPendingPlan,
  formatMessagesForProvider,
  type LoopbrainMessage,
  type ToolCallRecord,
  type PendingPlan,
} from './session-store'
import { getToolDefinitionsForRole, isWriteTool } from './tool-schemas'
import { getProvider, type ToolCallChatMessage, type ToolDefinition, type ToolCallResponse } from '@/lib/ai/providers'
import { toolRegistry } from './agent/tool-registry'
import { formatActionForUser } from './format-action'
import type { AgentContext } from './agent/types'
import type { LoopbrainClientAction } from './orchestrator-types'
import { enrichAgentContext } from './permissions'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import * as Sentry from '@sentry/nextjs'

const MAX_TOOL_ITERATIONS = 10
const LOOPBRAIN_MODEL = process.env.LOOPBRAIN_MODEL || 'claude-sonnet-4-6'

export interface AgentLoopParams {
  workspaceId: string
  userId: string
  conversationId: string
  userMessage: string
  userRole: 'VIEWER' | 'MEMBER' | 'ADMIN' | 'OWNER'
  userContext: {
    name: string
    email: string
    timezone: string
    workspaceName: string
  }
}

export interface AgentLoopResult {
  response: string
  toolCallsMade: ToolCallRecord[]
  pendingPlan?: PendingPlan
  conversationId: string
  /** Client-side navigation action to execute after rendering the response */
  clientAction?: LoopbrainClientAction
}

export interface ExecutionProgressEvent {
  type: 'progress' | 'complete' | 'error'
  stepIndex?: number
  status?: 'executing' | 'success' | 'error'
  description?: string
  error?: string
  result?: unknown
  summary?: string
  /** Client-side navigation action extracted from tool results (sent on 'complete' event) */
  clientAction?: LoopbrainClientAction
}

export async function runAgentLoop(params: AgentLoopParams): Promise<AgentLoopResult> {
  const { workspaceId, userId, conversationId: incomingConversationId, userMessage, userRole, userContext } = params

  // Enrich agent context with role and org person ID (one DB query)
  const agentCtx = await enrichAgentContext(workspaceId, userId, userRole)

  // 1. Load session (workspaceId is verified inside — cross-workspace IDs get a fresh session)
  const session = await loadSession(workspaceId, userId, incomingConversationId)
  // Use the session's effective conversationId (may differ if incomingConversationId belonged to
  // another workspace and was rejected, ensuring no cross-workspace conversation leakage).
  const conversationId = session.conversationId

  // 2. Check if this is a confirmation of a pending plan
  if (session.pendingPlan && isAffirmative(userMessage)) {
    return await executePendingPlan(session, { ...params, conversationId }, agentCtx)
  }

  // Clear any stale pending plan on new message
  if (session.pendingPlan) {
    await clearPendingPlan(conversationId)
  }

  // 3. Append user message to session
  await appendMessage(conversationId, {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  })

  // 4. Build system prompt and get role-filtered tools
  const systemPrompt = buildSystemPrompt(userContext)
  const tools = getToolDefinitionsForRole(userRole)

  // 5. Agent loop
  const allToolCalls: ToolCallRecord[] = []
  let iterations = 0

  // Reload session messages (now includes the new user message)
  let currentSession = await loadSession(workspaceId, userId, conversationId)
  let messages = formatMessagesForProvider(currentSession.messages)

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++

    // 6. Call LLM with tools
    const llmResponse = await callLLMWithTools(systemPrompt, messages, tools)

    // 7. No tool calls — final response
    if (!llmResponse.toolCalls || llmResponse.toolCalls.length === 0) {
      await appendMessage(conversationId, {
        role: 'assistant',
        content: llmResponse.content,
        timestamp: new Date().toISOString(),
      })

      return {
        response: llmResponse.content,
        toolCallsMade: allToolCalls,
        conversationId,
      }
    }

    // 8. Separate read and write tool calls
    const readCalls = llmResponse.toolCalls.filter((tc) => !isWriteTool(tc.name))
    const writeCalls = llmResponse.toolCalls.filter((tc) => isWriteTool(tc.name))

    // 9. Write calls present — intercept with confirmation gate
    if (writeCalls.length > 0) {
      // If there are read calls in the same turn, store them as a valid
      // assistant{tool_calls} + tool{results} pair BEFORE the write proposal.
      // Storing all tool_calls (read + write) then only read results would leave
      // the write tool_call_ids without matching tool messages, which OpenAI rejects.
      if (readCalls.length > 0) {
        const assistantReadMsg: LoopbrainMessage = {
          role: 'assistant',
          content: llmResponse.content || '',
          toolCalls: readCalls.map((tc) => ({ id: tc.id, name: tc.name, arguments: tc.arguments })),
          timestamp: new Date().toISOString(),
        }
        await appendMessage(conversationId, assistantReadMsg)

        const readResults: LoopbrainMessage[] = []
        for (const readCall of readCalls) {
          const result = await executeReadTool(readCall, workspaceId, userId, agentCtx)
          readResults.push({
            role: 'tool',
            content: JSON.stringify(result),
            toolResults: [{ toolCallId: readCall.id, name: readCall.name, result }],
            timestamp: new Date().toISOString(),
          })
        }
        await appendMessages(conversationId, readResults)
      }

      // Store a text-only assistant message proposing the write actions.
      // No tool_calls here — the write calls are held in the pending plan, not in
      // history, so the next user message ("yes") creates a valid sequence.
      const confirmationText = llmResponse.content || buildConfirmationMessage(writeCalls)
      await appendMessage(conversationId, {
        role: 'assistant',
        content: confirmationText,
        timestamp: new Date().toISOString(),
      })

      // Store write calls as pending plan requiring confirmation
      const plan: PendingPlan = {
        toolCalls: writeCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        })),
        originalAssistantMessage: llmResponse.content || '',
        createdAt: new Date().toISOString(),
      }
      await storePendingPlan(conversationId, plan)

      return {
        response: confirmationText,
        toolCallsMade: allToolCalls,
        pendingPlan: plan,
        conversationId,
      }
    }

    // 10. All read tools — execute immediately and loop
    const assistantMsg: LoopbrainMessage = {
      role: 'assistant',
      content: llmResponse.content || '',
      toolCalls: llmResponse.toolCalls.map((tc) => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.arguments,
      })),
      timestamp: new Date().toISOString(),
    }
    await appendMessage(conversationId, assistantMsg)

    const toolResults: LoopbrainMessage[] = []
    for (const toolCall of llmResponse.toolCalls) {
      allToolCalls.push({
        id: toolCall.id,
        name: toolCall.name,
        arguments: toolCall.arguments,
      })

      const result = await executeReadTool(toolCall, workspaceId, userId, agentCtx)
      toolResults.push({
        role: 'tool',
        content: JSON.stringify(result),
        toolResults: [{ toolCallId: toolCall.id, name: toolCall.name, result }],
        timestamp: new Date().toISOString(),
      })
    }
    await appendMessages(conversationId, toolResults)

    // Reload messages for next iteration
    currentSession = await loadSession(workspaceId, userId, conversationId)
    messages = formatMessagesForProvider(currentSession.messages)
  }

  // Circuit breaker: max iterations reached
  const fallback =
    'I was working on your request but hit the maximum number of steps. Here is what I found so far.'
  await appendMessage(conversationId, {
    role: 'assistant',
    content: fallback,
    timestamp: new Date().toISOString(),
  })

  return {
    response: fallback,
    toolCallsMade: allToolCalls,
    conversationId,
  }
}

// --- Helper functions ---

function buildSystemPrompt(userContext: {
  name: string
  email: string
  timezone: string
  workspaceName: string
}): string {
  const now = new Date().toISOString()
  return `You are Loopbrain, the AI assistant for ${userContext.workspaceName}. You help team members with organizational questions, project management, email, calendar, and documentation.

Current date and time: ${now}
User: ${userContext.name} (${userContext.email})
Timezone: ${userContext.timezone}

IMPORTANT RULES:
- Use tools to look up information rather than guessing. When the user asks about emails, calendar, projects, people, or documents, call the appropriate tool.
- When the user asks to search Drive, find meeting notes, or read a Drive document, use searchDriveFiles then readDriveDocument. You have full access to their Google Drive.
- For write operations (creating tasks, events, sending emails), always explain what you plan to do BEFORE calling the tool. The user will need to confirm.
- Be concise and actionable. This is a workplace tool, not a general chatbot.
- If a tool returns an error, explain what went wrong and suggest alternatives.
- When referring to people, use their names (from tool results), not IDs.
- Format responses in markdown for readability.`
}

function isAffirmative(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  const affirmatives = [
    'yes',
    'yeah',
    'yep',
    'sure',
    'ok',
    'okay',
    'confirm',
    'do it',
    'go ahead',
    'proceed',
    'yes please',
    'approved',
    'lgtm',
    'sounds good',
    'yes, do it',
    'yes, please',
    'go for it',
    'please do',
  ]
  return affirmatives.includes(normalized) || normalized.startsWith('yes')
}

async function executePendingPlan(
  session: { id: string; messages: LoopbrainMessage[]; pendingPlan: PendingPlan | null },
  params: AgentLoopParams,
  agentCtx: AgentContext,
): Promise<AgentLoopResult> {
  if (!session.pendingPlan) throw new Error('No pending plan')

  // Append user confirmation
  await appendMessage(params.conversationId, {
    role: 'user',
    content: params.userMessage,
    timestamp: new Date().toISOString(),
  })

  // Reconstruct a synthetic assistant{tool_calls} message so the tool-result
  // messages that follow have valid back-references (OpenAI requires each
  // tool_call_id in a tool message to match a preceding assistant tool_calls entry).
  await appendMessage(params.conversationId, {
    role: 'assistant',
    content: '',
    toolCalls: session.pendingPlan.toolCalls.map((tc) => ({
      id: tc.id,
      name: tc.name,
      arguments: tc.arguments,
    })),
    timestamp: new Date().toISOString(),
  })

  // Execute each write tool
  const results: LoopbrainMessage[] = []
  let clientAction: LoopbrainClientAction | undefined
  for (const toolCall of session.pendingPlan.toolCalls) {
    const result = await executeWriteTool(toolCall, params.workspaceId, params.userId, agentCtx)
    const isError = typeof result === 'object' && result !== null && 'error' in result

    // Extract clientAction from tool results (e.g. draftWikiPage redirect)
    if (!isError && typeof result === 'object' && result !== null && 'clientAction' in result) {
      const ca = (result as Record<string, unknown>).clientAction
      if (ca && typeof ca === 'object' && 'type' in ca && 'url' in ca) {
        clientAction = ca as LoopbrainClientAction
      }
    }

    results.push({
      role: 'tool',
      content: JSON.stringify(result),
      toolResults: [{ toolCallId: toolCall.id, name: toolCall.name, result, isError }],
      timestamp: new Date().toISOString(),
    })
  }
  await appendMessages(params.conversationId, results)

  // Clear the pending plan
  await clearPendingPlan(params.conversationId)

  // Call LLM one more time to summarize what was done (no tools — just summarize)
  const updatedSession = await loadSession(
    params.workspaceId,
    params.userId,
    params.conversationId
  )
  const messages = formatMessagesForProvider(updatedSession.messages)
  const systemPrompt = buildSystemPrompt(params.userContext)

  const finalResponse = await callLLMWithTools(systemPrompt, messages, [])
  await appendMessage(params.conversationId, {
    role: 'assistant',
    content: finalResponse.content,
    timestamp: new Date().toISOString(),
  })

  return {
    response: finalResponse.content,
    toolCallsMade: session.pendingPlan.toolCalls,
    conversationId: params.conversationId,
    clientAction,
  }
}

/**
 * Execute a pending plan with progress callbacks for streaming UI.
 * Stops on first error without persisting. Only persists when all steps succeed.
 */
export async function executePlanWithProgress(
  session: { id: string; conversationId: string; messages: LoopbrainMessage[]; pendingPlan: PendingPlan },
  params: AgentLoopParams,
  onEvent: (event: ExecutionProgressEvent) => void | Promise<void>
): Promise<{
  success: boolean
  response?: string
  failedStepIndex?: number
  error?: string
}> {
  const { conversationId } = params
  const toolCalls = session.pendingPlan.toolCalls
  const results: LoopbrainMessage[] = []
  let clientAction: LoopbrainClientAction | undefined

  // Enrich context for permission checks during tool execution
  const agentCtx = await enrichAgentContext(params.workspaceId, params.userId, params.userRole)

  for (let i = 0; i < toolCalls.length; i++) {
    const toolCall = toolCalls[i]
    const description = formatActionForUser(toolCall.name, toolCall.arguments)

    await onEvent({
      type: 'progress',
      stepIndex: i,
      status: 'executing',
      description,
    })

    const result = await executeWriteTool(toolCall, params.workspaceId, params.userId, agentCtx)
    const isError = typeof result === 'object' && result !== null && 'error' in result

    if (isError) {
      const errorMsg = (result as { error?: string }).error ?? 'Unknown error'
      await onEvent({
        type: 'progress',
        stepIndex: i,
        status: 'error',
        description,
        error: errorMsg,
      })
      await onEvent({ type: 'error', stepIndex: i, error: errorMsg })
      return { success: false, failedStepIndex: i, error: errorMsg }
    }

    // Extract clientAction from tool results (e.g. draftWikiPage returns a redirect)
    if (!clientAction && !isError && typeof result === 'object' && result !== null && 'clientAction' in result) {
      const ca = (result as Record<string, unknown>).clientAction
      if (ca && typeof ca === 'object' && 'type' in ca && 'url' in ca) {
        clientAction = ca as LoopbrainClientAction
      }
    }

    results.push({
      role: 'tool',
      content: JSON.stringify(result),
      toolResults: [{ toolCallId: toolCall.id, name: toolCall.name, result }],
      timestamp: new Date().toISOString(),
    })
    await onEvent({
      type: 'progress',
      stepIndex: i,
      status: 'success',
      description,
      result,
    })
  }

  // All succeeded — persist to session
  await appendMessage(conversationId, {
    role: 'user',
    content: params.userMessage,
    timestamp: new Date().toISOString(),
  })
  await appendMessage(conversationId, {
    role: 'assistant',
    content: '',
    toolCalls: toolCalls.map((tc) => ({ id: tc.id, name: tc.name, arguments: tc.arguments })),
    timestamp: new Date().toISOString(),
  })
  await appendMessages(conversationId, results)
  await clearPendingPlan(conversationId)

  const updatedSession = await loadSession(
    params.workspaceId,
    params.userId,
    conversationId
  )
  const messages = formatMessagesForProvider(updatedSession.messages)
  const systemPrompt = buildSystemPrompt(params.userContext)
  const finalResponse = await callLLMWithTools(systemPrompt, messages, [])
  await appendMessage(conversationId, {
    role: 'assistant',
    content: finalResponse.content,
    timestamp: new Date().toISOString(),
  })

  await onEvent({ type: 'complete', summary: finalResponse.content, clientAction })
  return {
    success: true,
    response: finalResponse.content,
  }
}

function buildConfirmationMessage(writeCalls: ToolCallRecord[]): string {
  const actions = writeCalls
    .map((tc) => `- **${tc.name}**: ${JSON.stringify(tc.arguments)}`)
    .join('\n')
  return `I'd like to perform the following actions:\n\n${actions}\n\nShall I proceed?`
}

async function callLLMWithTools(
  systemPrompt: string,
  messages: ToolCallChatMessage[],
  tools: ToolDefinition[]
): Promise<ToolCallResponse> {
  const provider = getProvider(LOOPBRAIN_MODEL)
  if (!provider.generateWithTools) {
    throw new Error(`Provider ${provider.name} does not support tool calling`)
  }

  try {
    const response = await provider.generateWithTools({
      model: LOOPBRAIN_MODEL,
      systemPrompt,
      messages,
      tools,
      temperature: 0.7,
      maxTokens: 4000,
    })

    return response
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('invalid model') || msg.includes('not found')) {
      const modelError = new Error(
        `Model "${LOOPBRAIN_MODEL}" is not supported by provider ${provider.name}. ` +
        `Check LOOPBRAIN_MODEL env var.`
      )
      Sentry.captureException(modelError, {
        tags: { component: 'loopbrain', errorType: 'invalid_model' },
        extra: { model: LOOPBRAIN_MODEL, provider: provider.name },
      })
      throw modelError
    }
    // Capture LLM API failures
    Sentry.captureException(error, {
      tags: { component: 'loopbrain', errorType: 'llm_api_failure' },
      extra: { model: LOOPBRAIN_MODEL, provider: provider.name },
    })
    throw error
  }
}

// Read tool execution — auto-dispatch from registry
async function executeReadTool(
  toolCall: { id: string; name: string; arguments: Record<string, unknown> },
  workspaceId: string,
  userId: string,
  agentCtx?: AgentContext,
): Promise<unknown> {
  setWorkspaceContext(workspaceId)
  const tool = toolRegistry.get(toolCall.name)
  if (!tool) return { error: `Unknown tool: ${toolCall.name}` }
  const ctx: AgentContext = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' }
  try {
    const result = await tool.execute(toolCall.arguments, ctx)
    return result.success
      ? result.data ?? { message: result.humanReadable }
      : { error: result.error ?? result.humanReadable }
  } catch (err: unknown) {
    // Capture tool execution failures
    Sentry.captureException(err, {
      tags: { component: 'loopbrain', errorType: 'tool_execution_failure' },
      extra: { toolName: toolCall.name, toolArgs: toolCall.arguments },
    })
    return { error: String(err) }
  }
}

// Write tool execution — auto-dispatch from registry
async function executeWriteTool(
  toolCall: ToolCallRecord,
  workspaceId: string,
  userId: string,
  agentCtx?: AgentContext,
): Promise<unknown> {
  setWorkspaceContext(workspaceId)
  const tool = toolRegistry.get(toolCall.name)
  if (!tool) return { error: `Unknown write tool: ${toolCall.name}` }
  const context: AgentContext = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' }
  try {
    const result = await tool.execute(toolCall.arguments, context)
    return result.success
      ? result.data ?? { message: result.humanReadable }
      : { error: result.error ?? result.humanReadable }
  } catch (err: unknown) {
    // Capture write tool execution failures
    Sentry.captureException(err, {
      tags: { component: 'loopbrain', errorType: 'write_tool_failure' },
      extra: { toolName: toolCall.name, toolArgs: toolCall.arguments },
    })
    return { error: String(err) }
  }
}
