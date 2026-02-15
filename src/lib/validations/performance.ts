import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums (mirroring Prisma enums for Zod validation)
// ---------------------------------------------------------------------------

export const CycleStatusEnum = z.enum(['SETUP', 'ACTIVE', 'CLOSED', 'FINALIZED'])
export const CycleReviewTypeEnum = z.enum(['SELF_ONLY', 'MANAGER_ONLY', 'COMBINED'])
export const ReviewerRoleEnum = z.enum(['SELF', 'MANAGER'])
export const QuestionTypeEnum = z.enum(['RATING_ONLY', 'TEXT_ONLY', 'RATING_AND_TEXT'])
export const ReviewStatusEnum = z.enum([
  'DRAFT',
  'IN_PROGRESS',
  'SUBMITTED',
  'IN_REVIEW',
  'PENDING_APPROVAL',
  'FINALIZED',
  'COMPLETED',
])

// ---------------------------------------------------------------------------
// Question schemas
// ---------------------------------------------------------------------------

export const CreateQuestionSchema = z.object({
  text: z.string().trim().min(1, 'Question text is required'),
  description: z.string().trim().optional(),
  type: QuestionTypeEnum.default('RATING_AND_TEXT'),
  sortOrder: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
})

// ---------------------------------------------------------------------------
// Cycle schemas
// ---------------------------------------------------------------------------

export const CreateCycleSchema = z.object({
  name: z.string().trim().min(1, 'Cycle name is required').max(200),
  description: z.string().trim().optional(),
  reviewType: CycleReviewTypeEnum.default('COMBINED'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  questions: z.array(CreateQuestionSchema).min(1, 'At least one question is required'),
}).refine(
  (data) => data.endDate > data.startDate,
  { message: 'End date must be after start date', path: ['endDate'] }
).refine(
  (data) => data.dueDate >= data.endDate,
  { message: 'Due date must be on or after end date', path: ['dueDate'] }
)

export const UpdateCycleSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  status: CycleStatusEnum.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
})

// ---------------------------------------------------------------------------
// Review schemas
// ---------------------------------------------------------------------------

export const CreateReviewSchema = z.object({
  employeeId: z.string().min(1),
  managerId: z.string().min(1),
  period: z.string().min(1),
  cycleId: z.string().optional(),
  reviewerRole: ReviewerRoleEnum.default('MANAGER'),
  goalIds: z.array(z.string()).optional().default([]),
})

export const UpdateReviewSchema = z.object({
  status: ReviewStatusEnum.optional(),
  goalScores: z.record(z.string(), z.number().min(0).max(100)).optional(),
  overallScore: z.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  nextGoals: z.string().optional(),
  goalIds: z.array(z.string()).optional(),
  acknowledgedAt: z.coerce.date().optional(),
})

// ---------------------------------------------------------------------------
// Response schemas (for auto-save)
// ---------------------------------------------------------------------------

export const SaveResponseSchema = z.object({
  questionId: z.string().min(1),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  text: z.string().nullable().optional(),
})

export const BulkSaveResponsesSchema = z.object({
  responses: z.array(SaveResponseSchema).min(1),
})

// ---------------------------------------------------------------------------
// Launch cycle schema
// ---------------------------------------------------------------------------

export const LaunchCycleSchema = z.object({
  participantIds: z.array(z.string().min(1)).min(1, 'At least one participant is required'),
})

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type CreateCycleInput = z.infer<typeof CreateCycleSchema>
export type UpdateCycleInput = z.infer<typeof UpdateCycleSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
export type UpdateReviewInput = z.infer<typeof UpdateReviewSchema>
export type SaveResponseInput = z.infer<typeof SaveResponseSchema>
export type BulkSaveResponsesInput = z.infer<typeof BulkSaveResponsesSchema>
export type LaunchCycleInput = z.infer<typeof LaunchCycleSchema>
