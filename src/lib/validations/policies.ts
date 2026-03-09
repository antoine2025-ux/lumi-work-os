import { z } from 'zod'
import { nonEmptyString } from './common'

// ---------------------------------------------------------------------------
// Schedule configuration (discriminated union by type)
// ---------------------------------------------------------------------------

export const ScheduleConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('DAILY'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
    timezone: z.string().default('UTC'),
  }),
  z.object({
    type: z.literal('WEEKLY'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
    dayOfWeek: z.number().int().min(0).max(6),
    timezone: z.string().default('UTC'),
  }),
  z.object({
    type: z.literal('MONTHLY'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format'),
    dayOfMonth: z.number().int().min(1).max(28),
    timezone: z.string().default('UTC'),
  }),
  z.object({
    type: z.literal('CRON'),
    expression: z.string().min(1),
    timezone: z.string().default('UTC'),
  }),
])

export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>

// ---------------------------------------------------------------------------
// Trigger configuration (discriminated union by type)
// ---------------------------------------------------------------------------

export const TriggerConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('EMAIL_KEYWORD'),
    keywords: z.array(z.string().min(1)).min(1).max(10),
    fromFilter: z.string().optional(),
  }),
  z.object({
    type: z.literal('TASK_STATUS_CHANGE'),
    fromStatus: z.string().optional(),
    toStatus: z.string(),
    projectId: z.string().optional(),
  }),
])

export type TriggerConfig = z.infer<typeof TriggerConfigSchema>

// ---------------------------------------------------------------------------
// Policy CRUD schemas
// ---------------------------------------------------------------------------

export const PolicyCreateSchema = z.object({
  name: nonEmptyString.max(255),
  description: z.string().max(1000).optional(),
  content: nonEmptyString.max(10000),
  triggerType: z.enum(['SCHEDULE', 'EMAIL_KEYWORD', 'TASK_STATUS_CHANGE']),
  scheduleType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CRON']).optional(),
  scheduleConfig: ScheduleConfigSchema.optional(),
  triggerConfig: TriggerConfigSchema.optional(),
  maxActions: z.number().int().min(1).max(100).default(50),
  tokenBudget: z.number().int().min(1000).max(200000).default(50000),
})

export type PolicyCreateInput = z.infer<typeof PolicyCreateSchema>

export const PolicyUpdateSchema = PolicyCreateSchema.partial().extend({
  enabled: z.boolean().optional(),
})

export type PolicyUpdateInput = z.infer<typeof PolicyUpdateSchema>

export const PolicyFeedbackSchema = z.object({
  feedback: z.enum(['thumbs_up', 'thumbs_down']),
})
