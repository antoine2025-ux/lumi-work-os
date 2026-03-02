import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

// Message types for the session
export interface LoopbrainMessage {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: ToolCallRecord[]
  toolResults?: ToolResultRecord[]
  timestamp: string // ISO string
}

export interface ToolCallRecord {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolResultRecord {
  toolCallId: string
  name: string
  result: unknown
  isError?: boolean
}

export interface PendingPlan {
  toolCalls: ToolCallRecord[]
  originalAssistantMessage: string
  createdAt: string
}

// Load or create a session
export async function loadSession(
  workspaceId: string,
  userId: string,
  conversationId: string
): Promise<{ id: string; conversationId: string; messages: LoopbrainMessage[]; pendingPlan: PendingPlan | null }> {
  // Guard against cross-workspace leakage: if this conversationId already exists
  // but belongs to a different workspace, start a fresh session with a new ID.
  const existing = await prisma.loopbrainSession.findUnique({
    where: { conversationId },
    select: { workspaceId: true },
  })

  const effectiveConversationId =
    existing && existing.workspaceId !== workspaceId ? crypto.randomUUID() : conversationId

  const session = await prisma.loopbrainSession.upsert({
    where: { conversationId: effectiveConversationId },
    create: {
      workspaceId,
      userId,
      conversationId: effectiveConversationId,
      messages: [],
    },
    update: {}, // Don't update on conflict — just load
  })

  // Check pending plan TTL
  let pendingPlan: PendingPlan | null = (session.pendingPlan as unknown as PendingPlan | null) ?? null
  if (pendingPlan && session.pendingPlanExpiresAt && new Date() > session.pendingPlanExpiresAt) {
    pendingPlan = null
    await prisma.loopbrainSession.update({
      where: { id: session.id },
      data: { pendingPlan: Prisma.JsonNull, pendingPlanExpiresAt: null },
    })
  }

  return {
    id: session.id,
    conversationId: session.conversationId,
    messages: (session.messages as unknown as LoopbrainMessage[]) || [],
    pendingPlan,
  }
}

// Append a message to the session
export async function appendMessage(
  conversationId: string,
  message: LoopbrainMessage
): Promise<void> {
  const session = await prisma.loopbrainSession.findUnique({
    where: { conversationId },
    select: { messages: true },
  })
  if (!session) throw new Error(`Session not found: ${conversationId}`)

  const messages = (session.messages as unknown as LoopbrainMessage[]) || []
  messages.push(message)

  await prisma.loopbrainSession.update({
    where: { conversationId },
    data: { messages: messages as unknown as Prisma.InputJsonValue },
  })
}

// Append multiple messages at once (for tool call + result pairs)
export async function appendMessages(
  conversationId: string,
  newMessages: LoopbrainMessage[]
): Promise<void> {
  const session = await prisma.loopbrainSession.findUnique({
    where: { conversationId },
    select: { messages: true },
  })
  if (!session) throw new Error(`Session not found: ${conversationId}`)

  const messages = (session.messages as unknown as LoopbrainMessage[]) || []
  messages.push(...newMessages)

  await prisma.loopbrainSession.update({
    where: { conversationId },
    data: { messages: messages as unknown as Prisma.InputJsonValue },
  })
}

// Store a pending plan (write tools awaiting confirmation)
export async function storePendingPlan(
  conversationId: string,
  plan: PendingPlan
): Promise<void> {
  const TEN_MINUTES = 10 * 60 * 1000
  await prisma.loopbrainSession.update({
    where: { conversationId },
    data: {
      pendingPlan: plan as unknown as Prisma.InputJsonValue,
      pendingPlanExpiresAt: new Date(Date.now() + TEN_MINUTES),
    },
  })
}

// Clear pending plan (after execution or rejection)
export async function clearPendingPlan(conversationId: string): Promise<void> {
  await prisma.loopbrainSession.update({
    where: { conversationId },
    data: { pendingPlan: Prisma.JsonNull, pendingPlanExpiresAt: null },
  })
}

// Get all messages formatted for OpenAI API
export function formatMessagesForLLM(
  messages: LoopbrainMessage[]
): Array<{
  role: string
  content: string | null
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  tool_call_id?: string
}> {
  return messages.map((msg) => {
    if (msg.role === 'tool' && msg.toolResults?.[0]) {
      return {
        role: 'tool' as const,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        tool_call_id: msg.toolResults[0].toolCallId,
      }
    }
    if (msg.role === 'assistant' && msg.toolCalls?.length) {
      return {
        role: 'assistant' as const,
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      }
    }
    return {
      role: msg.role,
      content: msg.content,
    }
  })
}
