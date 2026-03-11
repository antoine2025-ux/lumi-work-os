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
import { prisma, prismaUnscoped } from '@/lib/db'
import { IntegrationType } from '@prisma/client'
import { isGmailConnected } from './context-sources/gmail'
import { searchGmailForContext } from './context-sources/gmail-search'
import { loadCalendarEvents } from './context-sources/calendar'
import { createCalendarEvent } from '@/lib/integrations/calendar-events'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/server/authOptions'
import { isSlackAvailable } from './slack-helper'
import { searchSlackMessages } from './context-sources/slack-search'
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware'
import { searchSimilarContextItems } from './embedding-service'
import { ContextType } from './context-types'
import { PrismaContextEngine } from './context-engine'
import { buildWorkloadAnalysis } from './workload-analysis'
import { toolRegistry } from './agent/tool-registry'
import { executeAction } from './actions/executor'
import { formatActionForUser } from './format-action'
import type { AgentContext } from './agent/types'
import type { LoopbrainClientAction } from './orchestrator-types'
import { streamDraftToPage } from './services/draft-page'
import { enrichAgentContext, LoopbrainPermissionError, hasToolRole } from './permissions'
import { getAccessibleProjectIds, assertProjectMembership } from './permissions/resource-acl'
import { getAccessiblePersonIds } from './permissions/hierarchy'
import { filterPersonData } from './permissions/context-filter'

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
      throw new Error(
        `Model "${LOOPBRAIN_MODEL}" is not supported by provider ${provider.name}. ` +
        `Check LOOPBRAIN_MODEL env var.`
      )
    }
    throw error
  }
}

// Read tool execution — real Prisma implementations
async function executeReadTool(
  toolCall: { id: string; name: string; arguments: Record<string, unknown> },
  workspaceId: string,
  userId: string,
  agentCtx?: AgentContext,
): Promise<unknown> {
  setWorkspaceContext(workspaceId)

  switch (toolCall.name) {
    // ---- external OAuth tools ----
    case 'searchEmail': {
      try {
        const args = toolCall.arguments as { query?: string }
        if (!args.query) return { error: 'query is required' }

        const connected = await isGmailConnected(userId, workspaceId)
        if (!connected) {
          return {
            error:
              'Gmail is not connected for this workspace. Ask the user to connect Gmail in Settings > Integrations.',
          }
        }

        const result = await searchGmailForContext(userId, workspaceId, args.query)
        return {
          emails: result.threads.slice(0, 10).map((t) => ({
            id: t.id,
            threadId: t.threadId,
            subject: t.subject,
            from: t.from,
            date: t.date.toISOString(),
            snippet: (t.snippet || t.bodyPreview).slice(0, 200),
          })),
        }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'getCalendarEvents': {
      try {
        const args = toolCall.arguments as { startDate?: string; endDate?: string }
        const start = args.startDate ? new Date(args.startDate) : new Date()
        const end = args.endDate
          ? new Date(args.endDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        // Check if user has Google account with refresh token
        const account = await prismaUnscoped.account.findFirst({
          where: { userId, provider: 'google' },
          select: { 
            refresh_token: true,
            scope: true,
          },
        })

        let hasRefreshToken = !!account?.refresh_token

        // If refresh_token is null in DB, try JWT session as fallback
        if (!hasRefreshToken) {
          try {
            const session = await getServerSession(authOptions)
            if (session?.refreshToken) {
              hasRefreshToken = true
            }
          } catch (_err: unknown) {
            // JWT session fallback is best-effort
          }
        }

        if (!hasRefreshToken) {
          return {
            error:
              'Google Calendar is not connected. Please sign in with Google to access your calendar.',
          }
        }

        // Check if account has calendar scope (scope is persisted in DB even when refresh_token is null)
        const hasCalendarScope = account?.scope?.includes('calendar')
        if (account && !hasCalendarScope) {
          return {
            error:
              'Google Calendar access not granted. Please sign out and sign in again to grant calendar permissions.',
          }
        }

        // loadCalendarEvents checks Account table and handles token refresh
        const events = await loadCalendarEvents(workspaceId, userId, start, end)

        // Return events (limit to 20 for token efficiency)
        return {
          events: events.slice(0, 20).map((e) => ({
            id: e.id,
            title: e.title,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime.toISOString(),
            isAllDay: e.isAllDay,
            status: e.status,
          })),
        }
      } catch (err: unknown) {
        return {
          error: `Calendar error: ${err instanceof Error ? err.message : String(err)}`,
        }
      }
    }

    case 'searchSlackMessages': {
      try {
        const args = toolCall.arguments as { query?: string }
        if (!args.query) return { error: 'query is required' }

        const slackConnected = await isSlackAvailable(workspaceId)
        if (!slackConnected) {
          return {
            error:
              'Slack is not connected to this workspace. An admin can connect it in Settings > Integrations.',
          }
        }

        const result = await searchSlackMessages(workspaceId, args.query)
        return {
          messages: result.messages.slice(0, 20).map((m) => ({
            channelName: m.channelName,
            userName: m.userName,
            text: m.text.slice(0, 500),
            timestamp: m.timestamp,
            threadTs: m.threadTs,
          })),
        }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    // ---- real Prisma implementations ----

    case 'listProjects': {
      try {
        const args = toolCall.arguments as { status?: string }
        const statusVal =
          args.status && args.status !== 'ALL'
            ? (args.status as 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED')
            : undefined

        // Non-admins only see projects they have access to
        const projectFilter: Record<string, unknown> = {
          workspaceId, isArchived: false, ...(statusVal ? { status: statusVal } : {}),
        }
        if (agentCtx && !hasToolRole(agentCtx, 'ADMIN')) {
          const accessibleIds = await getAccessibleProjectIds(agentCtx)
          projectFilter.id = { in: accessibleIds }
        }

        const projects = await prisma.project.findMany({
          where: projectFilter,
          select: { id: true, name: true, status: true, description: true },
          orderBy: { updatedAt: 'desc' },
          take: 20,
        })
        return { projects }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'listPeople': {
      try {
        const args = toolCall.arguments as { teamId?: string; departmentId?: string }

        if (args.teamId || args.departmentId) {
          // Filter via org positions when team/dept filter present
          const positions = await prisma.orgPosition.findMany({
            where: {
              workspaceId,
              isActive: true,
              userId: { not: null },
              ...(args.teamId ? { teamId: args.teamId } : {}),
              ...(args.departmentId ? { team: { departmentId: args.departmentId } } : {}),
            },
            select: {
              userId: true,
              title: true,
              team: { select: { name: true, department: { select: { name: true } } } },
              user: { select: { name: true, email: true } },
            },
            take: 50,
          })
          const people = positions
            .filter((p): p is typeof p & { userId: string; user: NonNullable<typeof p.user> } =>
              p.userId !== null && p.user !== null
            )
            .map((p) => ({
              id: p.userId,
              name: p.user.name,
              email: p.user.email,
              title: p.title,
              teamName: p.team?.name ?? null,
              departmentName: p.team?.department?.name ?? null,
            }))
          return { people }
        }

        // No filter — all workspace members with their org position data
        const members = await prisma.workspaceMember.findMany({
          where: { workspaceId },
          select: {
            userId: true,
            role: true,
            user: { select: { name: true, email: true } },
          },
          take: 50,
        })
        const userIds = members.map((m) => m.userId)
        const positions = await prisma.orgPosition.findMany({
          where: { workspaceId, userId: { in: userIds }, isActive: true },
          select: {
            userId: true,
            title: true,
            team: { select: { name: true, department: { select: { name: true } } } },
          },
        })
        const posMap = new Map(positions.map((p) => [p.userId, p]))
        const people = members.map((m) => {
          const pos = posMap.get(m.userId)
          return {
            id: m.userId,
            name: m.user.name,
            email: m.user.email,
            workspaceRole: m.role,
            title: pos?.title ?? null,
            teamName: pos?.team?.name ?? null,
            departmentName: pos?.team?.department?.name ?? null,
          }
        })
        return { people }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'getPersonProfile': {
      try {
        const args = toolCall.arguments as { personId?: string }
        if (!args.personId) return { error: 'personId is required' }

        const [member, position, projectMemberships] = await Promise.all([
          prisma.workspaceMember.findFirst({
            where: { workspaceId, userId: args.personId },
            select: {
              userId: true,
              role: true,
              user: { select: { name: true, email: true } },
            },
          }),
          prisma.orgPosition.findFirst({
            where: { workspaceId, userId: args.personId, isActive: true },
            select: {
              title: true,
              level: true,
              team: { select: { name: true, department: { select: { name: true } } } },
              parent: { select: { title: true, user: { select: { name: true } } } },
            },
          }),
          prisma.projectMember.findMany({
            where: { workspaceId, userId: args.personId },
            select: {
              role: true,
              project: { select: { id: true, name: true, status: true } },
            },
            take: 10,
          }),
        ])

        if (!member) return { error: `Person ${args.personId} not found in workspace` }

        const profile: Record<string, unknown> = {
          id: args.personId,
          userId: args.personId,
          name: member.user.name,
          email: member.user.email,
          workspaceRole: member.role,
          title: position?.title ?? null,
          level: position?.level ?? null,
          team: position?.team?.name ?? null,
          department: position?.team?.department?.name ?? null,
          manager: position?.parent?.user?.name ?? position?.parent?.title ?? null,
          projects: projectMemberships.map((pm) => ({
            id: pm.project.id,
            name: pm.project.name,
            status: pm.project.status,
            role: pm.role,
          })),
        }

        // Apply hierarchy-based field filtering
        if (agentCtx) {
          return await filterPersonData(profile, agentCtx)
        }
        return profile
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'searchWiki': {
      try {
        const args = toolCall.arguments as { query?: string; limit?: number }
        if (!args.query) return { error: 'query is required' }
        const limit = Math.min((args.limit as number) ?? 5, 10)

        // Try semantic search via embedding service first
        try {
          const semanticResults = await searchSimilarContextItems({
            workspaceId,
            query: args.query,
            type: ContextType.PAGE,
            limit,
          })
          if (semanticResults.length > 0) {
            const pageIds = semanticResults.map((r) => r.contextId)
            const pages = await prisma.wikiPage.findMany({
              where: { workspaceId, id: { in: pageIds } },
              select: { id: true, title: true, slug: true },
            })
            const pageMap = new Map(pages.map((p) => [p.id, p]))
            return {
              pages: semanticResults.map((r) => ({
                pageId: r.contextId,
                title: pageMap.get(r.contextId)?.title ?? r.title,
                slug: pageMap.get(r.contextId)?.slug,
                score: r.score,
              })),
            }
          }
        } catch {
          // fall through to keyword search
        }

        // Fallback: title keyword search
        const pages = await prisma.wikiPage.findMany({
          where: {
            workspaceId,
            isPublished: true,
            title: { contains: args.query, mode: 'insensitive' },
          },
          select: { id: true, title: true, slug: true },
          take: limit,
        })
        return {
          pages: pages.map((p) => ({ pageId: p.id, title: p.title, slug: p.slug, score: 1 })),
        }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'queryOrg': {
      try {
        const engine = new PrismaContextEngine()
        const ctx = await engine.getOrgContext(workspaceId)
        if (!ctx) return { message: 'No org data found for this workspace' }
        return {
          teams: (ctx.teams ?? []).map((t) => ({
            id: t.id,
            name: t.name,
            department: t.department,
            memberCount: t.memberCount,
          })),
          departments: (ctx.departments ?? []).map((d) => ({
            id: d.id,
            name: d.name,
            teamCount: d.teamCount,
          })),
          roles: (ctx.roles ?? []).slice(0, 50).map((r) => ({
            id: r.id,
            title: r.title,
            teamName: r.teamName ?? null,
            department: r.department ?? null,
            userName: r.userName ?? null,
          })),
        }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'getCapacity': {
      try {
        const args = toolCall.arguments as { personId?: string; teamId?: string }

        if (args.personId) {
          const snapshot = await buildWorkloadAnalysis(workspaceId, args.personId)
          return {
            personId: snapshot.personId,
            name: snapshot.personName,
            assessment: snapshot.summary.assessment,
            utilizationPct: Math.round(snapshot.capacityComparison.utilizationPct * 100),
            hasCapacity: snapshot.capacityComparison.hasCapacity,
            headroomHours: Math.round(snapshot.capacityComparison.headroomHours),
            contractedHours: snapshot.capacityComparison.contractedHours,
            taskCount: snapshot.taskLoad.totalCount,
            overdueCount: snapshot.taskLoad.overdue.count,
            primaryConcern: snapshot.summary.primaryConcern,
            projects: snapshot.projectLoad.slice(0, 5).map((p) => ({
              projectId: p.projectId,
              name: p.projectName,
              allocationPct: p.allocationPct,
              taskCount: p.taskCount,
            })),
          }
        }

        // Workspace-wide: lightweight capacity summary per member
        // Non-admins only see capacity for people in their hierarchy
        let memberFilter: Record<string, unknown> = { workspaceId }
        if (agentCtx && !hasToolRole(agentCtx, 'ADMIN')) {
          const accessibleIds = await getAccessiblePersonIds(agentCtx)
          memberFilter = { workspaceId, userId: { in: accessibleIds } }
        }

        const members = await prisma.workspaceMember.findMany({
          where: memberFilter,
          select: { userId: true, user: { select: { name: true } } },
          take: 20,
        })
        const summaries = await Promise.all(
          members.map(async (m) => {
            try {
              const s = await buildWorkloadAnalysis(workspaceId, m.userId, {
                includeNextWeek: false,
                includeWorkRequests: false,
              })
              return {
                personId: m.userId,
                name: m.user.name,
                assessment: s.summary.assessment,
                utilizationPct: Math.round(s.capacityComparison.utilizationPct * 100),
                hasCapacity: s.capacityComparison.hasCapacity,
              }
            } catch {
              return {
                personId: m.userId,
                name: m.user.name,
                assessment: 'UNKNOWN',
                utilizationPct: 0,
                hasCapacity: null,
              }
            }
          })
        )
        return { members: summaries }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'getProjectHealth': {
      try {
        const args = toolCall.arguments as { projectId?: string }
        if (!args.projectId) return { error: 'projectId is required' }

        // Verify project access for non-admins
        if (agentCtx && !hasToolRole(agentCtx, 'ADMIN')) {
          try {
            await assertProjectMembership(agentCtx, args.projectId)
          } catch {
            return { error: 'You do not have access to this project' }
          }
        }

        const [project, tasks] = await Promise.all([
          prisma.project.findFirst({
            where: { id: args.projectId, workspaceId },
            select: { id: true, name: true, status: true, updatedAt: true },
          }),
          prisma.task.findMany({
            where: { projectId: args.projectId, workspaceId },
            select: { id: true, title: true, status: true, priority: true, dueDate: true },
            take: 200,
          }),
        ])

        if (!project) return { error: `Project ${args.projectId} not found` }

        const now = new Date()
        const total = tasks.length
        const done = tasks.filter((t) => t.status === 'DONE').length
        const blocked = tasks.filter((t) => t.status === 'BLOCKED').length
        const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length
        const overdue = tasks.filter(
          (t) => t.dueDate && t.dueDate < now && t.status !== 'DONE'
        ).length
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const isStalled = project.updatedAt < sevenDaysAgo && inProgress === 0
        const rawHealth = 100 - blocked * 15 - overdue * 8 - (isStalled ? 20 : 0)

        return {
          projectId: project.id,
          name: project.name,
          status: project.status,
          healthScore: Math.max(0, Math.min(100, rawHealth)),
          completionRate,
          taskSummary: { total, done, blocked, inProgress, overdue },
          isStalled,
          blockers: tasks
            .filter((t) => t.status === 'BLOCKED')
            .slice(0, 5)
            .map((t) => ({ id: t.id, title: t.title })),
        }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'listTasksByAssignee': {
      try {
        const tool = toolRegistry.get('listTasksByAssignee')
        if (!tool) return { error: 'listTasksByAssignee tool not found in registry' }
        const ctx = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' as const }
        const result = await tool.execute(toolCall.arguments, ctx)
        return result.success
          ? result.data ?? { message: result.humanReadable }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'readWikiPage': {
      try {
        const tool = toolRegistry.get('readWikiPage')
        if (!tool) return { error: 'readWikiPage tool not found in registry' }
        const ctx = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' as const }
        const result = await tool.execute(toolCall.arguments, ctx)
        return result.success
          ? result.data ?? { message: result.humanReadable }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'searchDriveFiles': {
      try {
        const tool = toolRegistry.get('searchDriveFiles')
        if (!tool) return { error: 'searchDriveFiles tool not found' }
        const ctx = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' as const }
        const result = await tool.execute(toolCall.arguments, ctx)
        return result.success
          ? result.data ?? { message: result.humanReadable }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'readDriveDocument': {
      try {
        const tool = toolRegistry.get('readDriveDocument')
        if (!tool) return { error: 'readDriveDocument tool not found' }
        const ctx = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' as const }
        const result = await tool.execute(toolCall.arguments, ctx)
        return result.success
          ? result.data ?? { message: result.humanReadable }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    default:
      return { error: `Unknown tool: ${toolCall.name}` }
  }
}

// Write tool execution — calls real implementations from tool-registry and executor
async function executeWriteTool(
  toolCall: ToolCallRecord,
  workspaceId: string,
  userId: string,
  agentCtx?: AgentContext,
): Promise<unknown> {
  setWorkspaceContext(workspaceId)
  const context: AgentContext = agentCtx ?? { workspaceId, userId, workspaceSlug: '', userRole: 'MEMBER' }
  const args = toolCall.arguments

  switch (toolCall.name) {
    case 'createTask': {
      try {
        const tool = toolRegistry.get('createTask')
        if (!tool) return { error: 'createTask tool not registered' }
        const result = await tool.execute(args, context)
        return result.success
          ? { id: result.data?.id, title: result.data?.title, projectId: result.data?.projectId }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'assignTask': {
      try {
        const tool = toolRegistry.get('assignTask')
        if (!tool) return { error: 'assignTask tool not registered' }
        const result = await tool.execute(args, context)
        return result.success
          ? { taskId: result.data?.taskId, assigneeId: result.data?.assigneeId }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'createCalendarEvent': {
      // Bypass the tool registry and call the integration directly — same token
      // resolution path as the read tool (prismaUnscoped.account.findFirst).
      // The LLM sends { title, startTime, endTime } (per tool-schemas.ts); we map
      // them to the integration's { summary, startDateTime, endDateTime } shape.
      try {
        const { title, startTime, endTime, description, attendees, location, timeZone } = args as {
          title?: string
          startTime?: string
          endTime?: string
          description?: string
          attendees?: string[]
          location?: string
          timeZone?: string
        }
        if (!title || !startTime || !endTime) {
          return { error: 'createCalendarEvent requires title, startTime, and endTime' }
        }
        const result = await createCalendarEvent({
          userId,
          workspaceId,
          summary: title,
          startDateTime: startTime,
          endDateTime: endTime,
          description,
          attendees,
          location,
          timeZone,
        })
        return result.success
          ? { eventId: result.eventId, htmlLink: result.htmlLink }
          : { error: result.userMessage ?? result.error }
      } catch (err: unknown) {
        console.error('[WriteToolExec] createCalendarEvent threw:', err)
        return { error: String(err) }
      }
    }

    case 'sendEmail': {
      try {
        const { to, subject, body } = args as { to?: string; subject?: string; body?: string }
        const tool = toolRegistry.get('sendEmail')
        if (!tool) return { error: 'sendEmail tool not registered' }
        const result = await tool.execute({ to, subject, body }, context)
        return result.success
          ? { messageId: result.data?.messageId, threadId: result.data?.threadId }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'createWikiPage': {
      try {
        const { title, content } = args as { title?: string; content?: string }
        const tool = toolRegistry.get('createWikiPage')
        if (!tool) return { error: 'createWikiPage tool not registered' }
        const result = await tool.execute({ title, content }, context)
        return result.success
          ? { id: result.data?.id, slug: result.data?.slug, title: result.data?.title }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'draftWikiPage': {
      try {
        const tool = toolRegistry.get('draftWikiPage')
        if (!tool) return { error: 'draftWikiPage tool not registered' }
        const result = await tool.execute(args, context)
        if (!result.success) return { error: result.error ?? result.humanReadable }

        const data = result.data ?? {}

        // Fire-and-forget: stream LLM content into the page via Hocuspocus.
        // The HTTP response returns immediately so the client can navigate.
        const draftTask = data._draftTask as
          | { pageId: string; topic: string; outline?: string[] }
          | undefined
        if (draftTask) {
          void streamDraftToPage({
            pageId: draftTask.pageId,
            workspaceId,
            topic: draftTask.topic,
            outline: draftTask.outline,
            userId,
          })
        }

        return {
          id: data.id,
          slug: data.slug,
          title: data.title,
          clientAction: data._clientAction,
        }
      } catch (err: unknown) {
        console.error('[Agent Loop] draftWikiPage: error', err)
        return { error: String(err) }
      }
    }

    case 'createTimeOff': {
      try {
        const { startDate, endDate, reason, type } = args as {
          startDate?: string
          endDate?: string
          reason?: string
          type?: string
        }
        const result = await executeAction({
          action: {
            type: 'timeoff.create',
            userId,
            startDate: (startDate ?? '').slice(0, 10), // Ensure YYYY-MM-DD
            endDate: (endDate ?? '').slice(0, 10),
            timeOffType: (type ?? 'vacation').toLowerCase(),
            notes: reason,
          },
          workspaceId,
          userId,
        })
        return result.ok
          ? { id: result.result?.entityId, message: result.result?.message }
          : { error: result.error?.message }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'assignToProject': {
      try {
        const { personId, projectId, role } = args as {
          personId?: string
          projectId?: string
          role?: string
        }
        // Use addPersonToProject from tool-registry — takes userId + projectId directly
        const tool = toolRegistry.get('addPersonToProject')
        if (!tool) return { error: 'addPersonToProject tool not registered' }
        const result = await tool.execute(
          { userId: personId, projectId, role: role ?? 'MEMBER' },
          context
        )
        return result.success
          ? { personId, projectId, membershipId: result.data?.membershipId }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'assignManager': {
      try {
        const { personId, managerId } = args as { personId?: string; managerId?: string }
        const result = await executeAction({
          action: {
            type: 'org.assign_manager',
            reportId: personId ?? '',
            managerId: managerId ?? '',
          },
          workspaceId,
          userId,
        })
        return result.ok
          ? { personId, managerId, message: result.result?.message }
          : { error: result.error?.message }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'createPerson': {
      try {
        const { name, email, title, teamId } = args as {
          name?: string
          email?: string
          title?: string
          teamId?: string
        }
        const result = await executeAction({
          action: {
            type: 'org.create_person',
            fullName: name ?? '',
            email,
            title,
            teamId,
          },
          workspaceId,
          userId,
        })
        return result.ok
          ? { id: result.result?.entityId, name, message: result.result?.message }
          : { error: result.error?.message }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'bulkReassignTasks': {
      try {
        const tool = toolRegistry.get('bulkReassignTasks')
        if (!tool) return { error: 'bulkReassignTasks tool not found in registry' }
        const result = await tool.execute(args, context)
        return result.success
          ? result.data ?? { message: result.humanReadable }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    case 'removeProjectMember': {
      try {
        const tool = toolRegistry.get('removeProjectMember')
        if (!tool) return { error: 'removeProjectMember tool not found in registry' }
        const result = await tool.execute(args, context)
        return result.success
          ? result.data ?? { message: result.humanReadable }
          : { error: result.error ?? result.humanReadable }
      } catch (err: unknown) {
        return { error: String(err) }
      }
    }

    default:
      return { error: `Unknown write tool: ${toolCall.name}` }
  }
}
