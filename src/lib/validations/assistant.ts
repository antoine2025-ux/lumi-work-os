import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// AI Chat Sessions schemas
// ============================================================================

/** POST /api/ai/chat-sessions */
export const CreateChatSessionSchema = z.object({
  title: z.string().max(255).optional(),
  model: z.string().optional(),
  intent: z.enum(['doc_gen', 'project_creation', 'assist']).optional(),
})

/** PUT /api/ai/chat-sessions/[id] */
export const UpdateChatSessionSchema = z.object({
  title: z.string().max(255).optional(),
})

/** POST /api/ai/draft-page */
export const DraftPageSchema = z.object({
  pageId: nonEmptyString,
  prompt: nonEmptyString.max(10000),
  workspaceId: z.string().optional(),
})

/** POST /api/ai/chat/stream */
export const ChatStreamSchema = z.object({
  message: nonEmptyString.max(10000),
  sessionId: nonEmptyString,
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).optional(),
})

// ============================================================================
// Assistant schemas
// ============================================================================

/** POST /api/assistant */
export const AssistantCreateSessionSchema = z.object({
  intent: z.enum(['doc_gen', 'project_creation', 'assist']).optional(),
})

/** POST /api/assistant/message */
export const AssistantMessageSchema = z.object({
  message: nonEmptyString.max(10000),
  sessionId: nonEmptyString,
})

/** POST /api/assistant/stream */
export const AssistantStreamSchema = z.object({
  message: nonEmptyString.max(10000),
  sessionId: nonEmptyString,
})

/** POST /api/assistant/create-project */
export const AssistantCreateProjectSchema = z.object({
  sessionId: nonEmptyString,
  projectData: z.object({
    name: nonEmptyString.max(255),
    description: z.string().optional(),
    department: z.string().optional(),
    team: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    ownerId: z.string().optional(),
  }),
})

/** POST /api/assistant/generate-draft */
export const AssistantGenerateDraftSchema = z.object({
  sessionId: nonEmptyString,
  prompt: z.string().max(2000).optional(),
})

/** POST /api/assistant/sessions */
export const AssistantSessionsCreateSchema = z.object({
  title: z.string().max(255).optional(),
  intent: z.enum(['doc_gen', 'project_creation', 'assist']).optional(),
})

// ============================================================================
// Additional Assistant schemas (Phase 4)
// ============================================================================

/** POST /api/assistant/publish */
export const AssistantPublishSchema = z.object({
  sessionId: z.string().uuid(),
  settings: z.record(z.string(), z.unknown()),
})

/** PUT /api/assistant/session */
export const AssistantUpdateSessionAltSchema = z.object({
  sessionId: z.string().uuid(),
  draftBody: z.string().optional(),
  draftTitle: z.string().max(500).optional(),
  phase: z.string().optional(),
})

/** PUT /api/assistant/sessions/[id] */
export const AssistantSessionUpdateByIdSchema = z.object({
  title: z.string().max(255).optional(),
  draftTitle: z.string().max(500).optional(),
  draftBody: z.string().optional(),
  phase: z.string().optional(),
})

// ============================================================================
// Feature Flags schema (Phase 4)
// ============================================================================

/** POST /api/feature-flags */
export const FeatureFlagToggleSchema = z.object({
  key: nonEmptyString,
  enabled: z.boolean(),
})
