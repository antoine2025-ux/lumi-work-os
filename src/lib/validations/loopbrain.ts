import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// Loopbrain Chat & Orchestrator schemas
// ============================================================================

/** POST /api/loopbrain/chat */
export const LoopbrainChatSchema = z.object({
  mode: z.enum(['spaces', 'org', 'dashboard']).optional(),
  query: nonEmptyString.max(10000),
  projectId: z.string().optional(),
  pageId: z.string().optional(),
  taskId: z.string().optional(),
  epicId: z.string().optional(),
  roleId: z.string().optional(),
  teamId: z.string().optional(),
  personId: z.string().optional(),
  useSemanticSearch: z.boolean().optional(),
  maxContextItems: z.number().int().min(1).max(100).optional(),
  sendToSlack: z.boolean().optional(),
  slackChannel: z.string().optional(),
  clientMetadata: z.record(z.string(), z.unknown()).optional(),
  slackChannelHints: z.array(z.string()).optional(),
  pendingPlan: z.record(z.string(), z.unknown()).optional(),
  conversationContext: z.string().optional(),
  pendingClarification: z.record(z.string(), z.unknown()).optional(),
  pendingAdvisory: z.record(z.string(), z.unknown()).optional(),
  pendingMeetingExtraction: z.record(z.string(), z.unknown()).optional(),
  conversationId: z.string().uuid().optional(),
})

/** POST /api/loopbrain/execute-stream */
export const LoopbrainExecuteStreamSchema = z.object({
  conversationId: z.string().uuid(),
})

/** POST /api/loopbrain/feedback */
export const LoopbrainFeedbackSchema = z.object({
  messageId: z.string().max(100).optional(),
  rating: z.enum(['up', 'down']),
  signal: z.enum(['too_long', 'too_short', 'wrong_tone', 'good']).optional(),
  comment: z.string().max(500).optional(),
})

/** POST /api/loopbrain/search */
export const LoopbrainSearchSchema = z.object({
  query: nonEmptyString.max(500),
  type: z.enum(['workspace', 'page', 'project', 'task', 'org', 'activity', 'unified']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

// ============================================================================
// Loopbrain Org schemas
// ============================================================================

/** POST /api/loopbrain/org/ask */
export const LoopbrainOrgAskSchema = z.object({
  question: nonEmptyString.max(5000),
  limit: z.number().int().min(1).max(1000).optional(),
})

/** POST /api/loopbrain/org/q3 */
export const LoopbrainOrgQ3Schema = z.object({
  projectId: nonEmptyString,
})

/** POST /api/loopbrain/org/q4 */
export const LoopbrainOrgQ4Schema = z.object({
  projectId: nonEmptyString,
  timeframe: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    durationWeeks: z.number().min(1).optional(),
  }),
})

/** POST /api/loopbrain/org/qna */
export const LoopbrainOrgQnaSchema = z.object({
  question: nonEmptyString.max(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/** POST /api/loopbrain/org/prompt-compose */
export const LoopbrainOrgPromptComposeSchema = z.object({
  question: nonEmptyString.max(5000),
  includeContext: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/** POST /api/loopbrain/org/qa/run/[id] */
export const LoopbrainOrgQaRunSchema = z.object({
  force: z.boolean().optional(),
})

// ============================================================================
// Loopbrain Entity Graph & Insights schemas
// ============================================================================

/** POST /api/loopbrain/entity-graph */
export const LoopbrainEntityGraphRebuildSchema = z.object({
  force: z.boolean().optional(),
})

/** POST /api/loopbrain/insights */
export const LoopbrainInsightsTriggerSchema = z.object({
  force: z.boolean().optional(),
  categories: z.array(z.enum([
    'CAPACITY',
    'WORKLOAD',
    'CALENDAR',
    'PROJECT',
    'ORG_HEALTH',
    'OWNERSHIP',
    'DECISION',
    'DEPENDENCY',
    'SKILL_GAP',
    'PROCESS',
    'COMMUNICATION',
    'ONBOARDING',
    'DAILY_BRIEFING',
    'MEETING_PREP',
  ])).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  maxInsights: z.number().int().min(1).max(1000).optional(),
  store: z.boolean().optional(),
})

// ============================================================================
// Loopbrain Project Health schemas
// ============================================================================

/** POST /api/loopbrain/project-health */
export const LoopbrainProjectHealthSchema = z.object({
  projectIds: z.array(z.string()).optional(),
  includeHistory: z.boolean().optional(),
  velocityWeeks: z.number().int().min(1).max(52).optional(),
})

// ============================================================================
// Policy schemas
// ============================================================================

/** POST /api/policies/[id]/compile */
export const PolicyCompileSchema = z.object({
  force: z.boolean().optional(),
})

/** POST /api/policies/[id]/test */
export const PolicyTestSchema = z.object({
  testCases: z.array(z.record(z.string(), z.unknown())).optional(),
})
