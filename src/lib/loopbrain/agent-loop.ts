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
import { generatePlan, formatPlanForUser } from './agent/planner'
import * as Sentry from '@sentry/nextjs'
import { logger } from '@/lib/logger'

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

      // Use the planner to generate a COMPLETE multi-step plan instead of
      // storing only the tool calls from this single LLM turn. The planner
      // supports $stepN.data.field references so it can plan dependent steps
      // (e.g. createProject + createTask using $step1.data.id) upfront.
      const conversationHistory = currentSession.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')

      logger.info('Agent loop: invoking planner for complete write plan', {
        workspaceId,
        nativeWriteCalls: writeCalls.length,
        userMessage,
      })

      console.log('[DEBUG-PLANNER] Calling generatePlan with writeCalls:', writeCalls.length, 'userMessage:', userMessage.slice(0, 100))
      const plannerResult = await generatePlan({
        message: userMessage,
        registry: toolRegistry,
        context: agentCtx,
        contextSnippet: '',
        conversationContext: conversationHistory || undefined,
      })

      // If planner returned a plan with steps, use it; otherwise fall back
      // to the native tool calls from this turn
      let planToolCalls: ToolCallRecord[]
      let confirmationText: string

      if (
        plannerResult.mode === 'plan' &&
        plannerResult.plan &&
        plannerResult.plan.steps.length > 0
      ) {
        planToolCalls = plannerResult.plan.steps.map((step) => ({
          id: `planner-step-${step.stepNumber}`,
          name: step.toolName,
          arguments: step.parameters,
        }))
        confirmationText = formatPlanForUser(plannerResult.plan, plannerResult.insights)

        logger.info('Agent loop: planner produced complete plan', {
          workspaceId,
          stepCount: plannerResult.plan.steps.length,
          toolNames: plannerResult.plan.steps.map((s) => s.toolName),
        })
        console.log('[DEBUG-PLANNER] Plan produced:', plannerResult.plan.steps.length, 'steps:', plannerResult.plan.steps.map(s => s.toolName))
      } else {
        // Planner didn't produce a plan — fall back to native tool calls
        console.log('[DEBUG-PLANNER] Fallback to native calls. plannerResult.mode:', plannerResult.mode, 'plan steps:', plannerResult.plan?.steps?.length ?? 0)
        planToolCalls = writeCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        }))
        confirmationText = llmResponse.content || buildConfirmationMessage(writeCalls)

        logger.info('Agent loop: planner fallback to native tool calls', {
          workspaceId,
          plannerMode: plannerResult.mode,
        })
      }

      // Store a text-only assistant message proposing the write actions.
      // No tool_calls here — the write calls are held in the pending plan, not in
      // history, so the next user message ("yes") creates a valid sequence.
      await appendMessage(conversationId, {
        role: 'assistant',
        content: confirmationText,
        timestamp: new Date().toISOString(),
      })

      // Store complete plan as pending plan requiring confirmation
      const plan: PendingPlan = {
        toolCalls: planToolCalls,
        originalAssistantMessage: confirmationText,
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

/**
 * Resolve "$stepN.data.field" references in tool arguments.
 * Maps step index (0-based) to step number (1-based) for $step1, $step2, etc.
 * 
 * Examples:
 *   - "$step1.data.id" → stepResults.get(1).data.id
 *   - "$step2.data.projects[0].id" → stepResults.get(2).data.projects[0].id
 */
function resolveStepReferences(
  args: Record<string, unknown>,
  stepResults: Map<number, unknown>,
  currentStepIndex: number
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.startsWith('$step')) {
      const resolvedValue = resolveStepRef(value, stepResults)
      console.log(`[ExecuteStream] Resolved reference: ${value} → ${JSON.stringify(resolvedValue)}`)
      resolved[key] = resolvedValue
    } else {
      resolved[key] = value
    }
  }

  return resolved
}

function resolveStepRef(ref: string, stepResults: Map<number, unknown>): unknown {
  // Parse "$step<N>.data.<path>" or "$step<N>.id" (direct field access)
  const match = ref.match(/^\$step(\d+)\.(.+)$/)
  if (!match) {
    console.warn(`[ExecuteStream] Invalid step reference format: ${ref}`)
    return ref
  }

  const stepNum = parseInt(match[1], 10)
  const path = match[2]

  const result = stepResults.get(stepNum)
  if (!result) {
    console.warn(`[ExecuteStream] Step ${stepNum} result not found for reference: ${ref}`)
    return ref // return unresolved
  }

  // Walk the path (supports "data.id", "data.projects[0].id")
  const parts = path.split('.')
  let current: unknown = result

  for (const part of parts) {
    if (current === null || current === undefined) {
      console.warn(`[ExecuteStream] Path not found in step ${stepNum} result:`, { ref, part, current })
      return undefined
    }

    // Check for array index, e.g. "projects[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)]$/)
    if (arrayMatch) {
      current = (current as Record<string, unknown>)[arrayMatch[1]]
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2], 10)]
      } else {
        console.warn(`[ExecuteStream] Expected array for reference:`, { ref, part })
        return undefined
      }
    } else {
      current = (current as Record<string, unknown>)[part]
    }
  }

  // Fallback: if path started with "data." and resolved to undefined, try without "data." wrapper
  // This handles cases where the LLM might reference $step1.id instead of $step1.data.id
  if (current === undefined && parts[0] === 'data' && parts.length > 1) {
    console.log(`[ExecuteStream] Path with 'data.' resolved to undefined, trying without wrapper for: ${ref}`)
    let fallback: unknown = result
    for (const part of parts.slice(1)) {
      if (fallback === null || fallback === undefined) break
      
      const arrayMatch = part.match(/^(\w+)\[(\d+)]$/)
      if (arrayMatch) {
        fallback = (fallback as Record<string, unknown>)[arrayMatch[1]]
        if (Array.isArray(fallback)) {
          fallback = fallback[parseInt(arrayMatch[2], 10)]
        } else {
          fallback = undefined
          break
        }
      } else {
        fallback = (fallback as Record<string, unknown>)[part]
      }
    }
    if (fallback !== undefined) {
      console.log(`[ExecuteStream] Fallback resolution succeeded: ${ref} → ${JSON.stringify(fallback)}`)
      return fallback
    }
  }

  return current
}

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
- **When creating projects or wiki pages, always confirm which space the user wants before proceeding.** If they specify a space name, use listSpaces to find the matching space ID. If they don't specify, ask them or use listSpaces to show available options.
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
  const stepResults = new Map<number, unknown>() // Map step index → tool result data
  let clientAction: LoopbrainClientAction | undefined

  console.log('[ExecuteStream] Plan received:', {
    conversationId,
    stepCount: toolCalls.length,
    toolNames: toolCalls.map((tc) => tc.name),
    steps: toolCalls.map((tc, i) => ({
      index: i,
      name: tc.name,
      arguments: tc.arguments,
    })),
  })
  logger.info('[ExecuteStream] executePlanWithProgress entry', {
    conversationId,
    stepCount: toolCalls.length,
    toolNames: toolCalls.map((tc) => tc.name),
  })

  // Enrich context for permission checks during tool execution
  let agentCtx: AgentContext
  try {
    agentCtx = await enrichAgentContext(params.workspaceId, params.userId, params.userRole)
    console.log('[ExecuteStream] enrichAgentContext done:', { personId: agentCtx.personId })
    logger.info('[ExecuteStream] enrichAgentContext done', { personId: agentCtx.personId })
  } catch (err: unknown) {
    console.error('[ExecuteStream] enrichAgentContext failed:', err)
    logger.error('[ExecuteStream] enrichAgentContext failed', { err })
    throw err
  }

  for (let i = 0; i < toolCalls.length; i++) {
    const toolCall = toolCalls[i]
    
    // Resolve step references ($step1.data.id → actual value from step 1)
    const resolvedArguments = resolveStepReferences(toolCall.arguments, stepResults, i)
    
    const description = formatActionForUser(toolCall.name, resolvedArguments)

    console.log(`[ExecuteStream] Step ${i+1}/${toolCalls.length}: ${toolCall.name}`, {
      originalArgs: toolCall.arguments,
      resolvedArgs: resolvedArguments,
      argumentsType: typeof resolvedArguments,
    })
    logger.info('[ExecuteStream] Executing step', {
      stepIndex: i,
      toolName: toolCall.name,
      arguments: resolvedArguments,
      argumentsType: typeof resolvedArguments,
    })

    await onEvent({
      type: 'progress',
      stepIndex: i,
      status: 'executing',
      description,
    })

    let result: unknown
    try {
      // Execute with resolved arguments
      result = await executeWriteTool(
        { ...toolCall, arguments: resolvedArguments }, 
        params.workspaceId, 
        params.userId, 
        agentCtx
      )
      
      console.log(`[ExecuteStream] Step ${i+1} result:`, {
        stepIndex: i,
        toolName: toolCall.name,
        hasError: typeof result === 'object' && result !== null && 'error' in result,
        resultPreview: JSON.stringify(result).slice(0, 500),
        fullResult: result,
      })
      logger.info('[ExecuteStream] Step result', {
        stepIndex: i,
        toolName: toolCall.name,
        hasError: typeof result === 'object' && result !== null && 'error' in result,
        result,
      })
      
      // Store result for subsequent steps to reference
      // Wrap in { data: ... } so $stepN.data.field references work correctly
      // (executeWriteTool already unwraps result.data, so we re-wrap it here)
      stepResults.set(i + 1, { data: result, success: true })
      
    } catch (err: unknown) {
      console.error(`[ExecuteStream] Step ${i+1} threw exception:`, {
        stepIndex: i,
        toolName: toolCall.name,
        error: err,
        stack: err instanceof Error ? err.stack : undefined,
      })
      logger.error('[ExecuteStream] executeWriteTool threw', {
        stepIndex: i,
        toolName: toolCall.name,
        err,
      })
      throw err
    }
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
  console.log('[ExecuteStream] All steps complete. Persisting to session...')
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

  console.log('[ExecuteStream] Execution complete:', {
    success: true,
    stepsExecuted: toolCalls.length,
    responsePreview: finalResponse.content.slice(0, 200),
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

  // Normalize arguments: tools expect an object; DB/LLM may store/return a JSON string
  let args: Record<string, unknown>
  const raw = toolCall.arguments
  if (typeof raw === 'string') {
    try {
      args = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return { error: `Invalid tool arguments: expected JSON object, got string` }
    }
  } else if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    args = {}
  } else {
    args = raw as Record<string, unknown>
  }

  try {
    const result = await tool.execute(args, context)
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
