import { z } from 'zod'

// ---------------------------------------------------------------------------
// Project ↔ Person link validation schemas
// ---------------------------------------------------------------------------

export const PROJECT_PERSON_ROLES = ['OWNER', 'CONTRIBUTOR', 'REVIEWER', 'STAKEHOLDER'] as const
export type ProjectPersonRole = (typeof PROJECT_PERSON_ROLES)[number]

export const ProjectPersonCreateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(PROJECT_PERSON_ROLES),
  orgPositionId: z.string().min(1).optional(),
  allocatedHours: z.number().min(0).max(168).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).strict()

export const ProjectPersonUpdateSchema = z.object({
  role: z.enum(PROJECT_PERSON_ROLES).optional(),
  orgPositionId: z.string().min(1).nullable().optional(),
  allocatedHours: z.number().min(0).max(168).nullable().optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
}).strict()

export type ProjectPersonCreate = z.infer<typeof ProjectPersonCreateSchema>
export type ProjectPersonUpdate = z.infer<typeof ProjectPersonUpdateSchema>
