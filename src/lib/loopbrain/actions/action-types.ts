/**
 * Loopbrain Action Types
 * 
 * Structured action types that Loopbrain can propose and the UI can execute.
 * All actions are validated with Zod schemas and require explicit user confirmation.
 */

import { z } from 'zod'

/**
 * Task assignment action
 */
export const TaskAssignActionSchema = z.object({
  type: z.literal('task.assign'),
  taskId: z.string().min(1),
  assigneeId: z.string().min(1),
})

/**
 * Time off creation action
 */
export const TimeOffCreateActionSchema = z.object({
  type: z.literal('timeoff.create'),
  userId: z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date string YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date string YYYY-MM-DD
  timeOffType: z.string().optional().default('vacation'), // vacation, sick, personal, other
  notes: z.string().optional(),
})

/**
 * Capacity request action
 */
export const CapacityRequestActionSchema = z.object({
  type: z.literal('capacity.request'),
  teamId: z.string().min(1),
  durationDays: z.number().int().positive().max(365), // Max 1 year
  roleHint: z.string().optional(), // Optional role title hint
  notes: z.string().min(1), // Required notes describing the request
})

/**
 * Org: assign a person (OrgPosition) to a project
 */
export const OrgAssignToProjectActionSchema = z.object({
  type: z.literal('org.assign_to_project'),
  personId: z.string().min(1), // OrgPosition ID
  projectId: z.string().min(1),
  allocationPercent: z.number().min(0.1).max(1.0).default(0.25),
})

/**
 * Org: approve or deny a pending leave request
 */
export const OrgApproveLeaveActionSchema = z.object({
  type: z.literal('org.approve_leave'),
  leaveRequestId: z.string().min(1),
  action: z.enum(['approve', 'deny']),
  denialReason: z.string().optional(), // required when action === 'deny'
})

/**
 * Org: update a person's weekly capacity contract
 */
export const OrgUpdateCapacityActionSchema = z.object({
  type: z.literal('org.update_capacity'),
  personId: z.string().min(1), // User ID
  weeklyCapacityHours: z.number().min(1).max(80),
})

/**
 * Org: assign a manager to a person via PersonManagerLink
 */
export const OrgAssignManagerActionSchema = z.object({
  type: z.literal('org.assign_manager'),
  managerId: z.string().min(1),
  reportId: z.string().min(1),
})

/**
 * Org: create a new person in the organization
 */
export const OrgCreatePersonActionSchema = z.object({
  type: z.literal('org.create_person'),
  fullName: z.string().min(1),
  email: z.string().email().optional(),
  title: z.string().optional(),
  teamId: z.string().optional(),
})

/**
 * Union of all action types
 */
export const LoopbrainActionSchema = z.discriminatedUnion('type', [
  TaskAssignActionSchema,
  TimeOffCreateActionSchema,
  CapacityRequestActionSchema,
  OrgAssignToProjectActionSchema,
  OrgApproveLeaveActionSchema,
  OrgUpdateCapacityActionSchema,
  OrgAssignManagerActionSchema,
  OrgCreatePersonActionSchema,
])

/**
 * TypeScript type for actions
 */
export type LoopbrainAction = z.infer<typeof LoopbrainActionSchema>

/**
 * Action result schema
 */
export const LoopbrainActionResultSchema = z.object({
  ok: z.boolean(),
  result: z.object({
    actionType: z.string(),
    entityId: z.string().optional(), // ID of created/updated entity
    message: z.string().optional(), // Human-readable success message
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
  requestId: z.string().optional(),
})

/**
 * TypeScript type for action results
 */
export type LoopbrainActionResult = z.infer<typeof LoopbrainActionResultSchema>

