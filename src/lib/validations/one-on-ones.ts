import { z } from 'zod'
import { nonEmptyString } from './common'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const SeriesFrequency = z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY'])
export type SeriesFrequency = z.infer<typeof SeriesFrequency>

export const MeetingStatusEnum = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED',
])
export type MeetingStatusEnum = z.infer<typeof MeetingStatusEnum>

export const TalkingPointSource = z.enum([
  'GOAL',
  'REVIEW',
  'ACTION_ITEM',
  'MANUAL',
])
export type TalkingPointSource = z.infer<typeof TalkingPointSource>

export const ActionItemStatus = z.enum(['OPEN', 'DONE', 'CANCELLED'])
export type ActionItemStatus = z.infer<typeof ActionItemStatus>

// ---------------------------------------------------------------------------
// Series
// ---------------------------------------------------------------------------

export const CreateSeriesSchema = z
  .object({
    employeeId: nonEmptyString,
    frequency: SeriesFrequency,
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    duration: z.number().int().min(15).max(120).optional(),
  })
  .strict()

export const UpdateSeriesSchema = z
  .object({
    frequency: SeriesFrequency.optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
    duration: z.number().int().min(15).max(120).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export const CreateMeetingSchema = z
  .object({
    seriesId: nonEmptyString.optional(),
    employeeId: nonEmptyString,
    managerId: nonEmptyString,
    scheduledAt: z.coerce.date(),
    calendarEventId: z.string().optional(),
    createCalendarEvent: z.boolean().optional().default(false),
  })
  .strict()

export const UpdateMeetingSchema = z
  .object({
    status: MeetingStatusEnum.optional(),
    managerNotes: z.string().optional().nullable(),
    employeeNotes: z.string().optional().nullable(),
    sharedNotes: z.string().optional().nullable(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Talking Points
// ---------------------------------------------------------------------------

export const CreateTalkingPointSchema = z
  .object({
    content: nonEmptyString,
    source: TalkingPointSource.optional(),
    sourceId: z.string().optional(),
  })
  .strict()

export const UpdateTalkingPointSchema = z
  .object({
    content: nonEmptyString.optional(),
    isDiscussed: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Action Items
// ---------------------------------------------------------------------------

export const CreateActionItemSchema = z
  .object({
    content: nonEmptyString,
    assigneeId: nonEmptyString,
    dueDate: z.coerce.date().optional().nullable(),
  })
  .strict()

export const UpdateActionItemSchema = z
  .object({
    content: nonEmptyString.optional(),
    status: ActionItemStatus.optional(),
    dueDate: z.coerce.date().optional().nullable(),
  })
  .strict()
