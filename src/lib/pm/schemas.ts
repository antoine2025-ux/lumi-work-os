import { z } from 'zod'

// Project schemas
export const ProjectCreateSchema = z.object({
  workspaceId: z.string().min(1, 'Workspace ID is required'),
  name: z.string().min(1, 'Project name is required').max(255, 'Project name too long'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  startDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    // Handle both YYYY-MM-DD and ISO datetime formats
    if (val.includes('T')) return val
    return `${val}T00:00:00.000Z`
  }),
  endDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    // Handle both YYYY-MM-DD and ISO datetime formats
    if (val.includes('T')) return val
    return `${val}T23:59:59.999Z`
  }),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  department: z.string().max(100).optional(),
  team: z.string().max(100).optional(),
  wikiPageId: z.string().optional(),
  ownerId: z.string().optional(),
  projectSpaceId: z.string().optional().nullable(), // Legacy support
  visibility: z.enum(['PUBLIC', 'TARGETED']).optional(), // New: simplified visibility
  memberUserIds: z.array(z.string()).optional(), // New: members for TARGETED projects
  dailySummaryEnabled: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
)

export const ProjectUpdateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255, 'Project name too long').optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  department: z.string().max(100).optional(),
  team: z.string().max(100).optional(),
  wikiPageId: z.string().optional(),
  ownerId: z.string().optional(),
  visibility: z.enum(['PUBLIC', 'TARGETED']).optional(), // New: simplified visibility
  memberUserIds: z.array(z.string()).optional(), // New: members for TARGETED projects
  dailySummaryEnabled: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
)

// Task schemas
// Note: workspaceId is not included in the schema because it is always derived from
// the authenticated session (auth.workspaceId) on the server for security.
export const TaskCreateSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(1, 'Task title is required').max(255, 'Task title too long'),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    // Handle different date formats
    if (val.includes('T')) return val // Already ISO datetime
    if (val.includes('.')) {
      // Handle DD.MM.YYYY format
      const parts = val.split('.')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59.999Z`
      }
    }
    if (val.includes('-')) {
      // Handle YYYY-MM-DD format
      return `${val}T23:59:59.999Z`
    }
    return val
  }),
  tags: z.array(z.string().max(50)).default([]),
  epicId: z.string().optional(),
  milestoneId: z.string().optional(),
  points: z.number().int().min(0).max(100).optional(),
  dependsOn: z.array(z.string()).default([]),
  blocks: z.array(z.string()).default([]),
  subtasks: z.array(z.object({
    title: z.string().min(1, 'Subtask title is required'),
    description: z.string().optional(),
    assigneeId: z.string().optional(),
    dueDate: z.string().optional()
  })).optional().default([])
})

export const TaskPatchSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255, 'Task title too long').optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional().transform((val) => {
    if (!val) return undefined
    // Handle different date formats
    if (val.includes('T')) return val // Already ISO datetime
    if (val.includes('.')) {
      // Handle DD.MM.YYYY format
      const parts = val.split('.')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59.999Z`
      }
    }
    if (val.includes('-')) {
      // Handle YYYY-MM-DD format
      return `${val}T23:59:59.999Z`
    }
    return val
  }),
  tags: z.array(z.string().max(50)).optional(),
  epicId: z.string().optional(),
  milestoneId: z.string().optional(),
  points: z.number().int().min(0).max(100).optional(),
  dependsOn: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  completedAt: z.string().optional().transform((val) => {
    if (!val) return undefined
    // Handle different date formats
    if (val.includes('T')) return val // Already ISO datetime
    if (val.includes('.')) {
      // Handle DD.MM.YYYY format
      const parts = val.split('.')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T23:59:59.999Z`
      }
    }
    if (val.includes('-')) {
      // Handle YYYY-MM-DD format
      return `${val}T23:59:59.999Z`
    }
    return val
  })
}).refine(
  (data) => Object.keys(data).length > 0,
  {
    message: 'At least one field must be provided for update',
    path: ['body']
  }
)

export const TaskPutSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255, 'Task title too long').optional(),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().max(50)).optional(),
  epicId: z.string().nullable().optional(),
  milestoneId: z.string().nullable().optional(),
  points: z.number().int().min(0).max(100).nullable().optional(),
  dependsOn: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  completedAt: z.string().datetime().nullable().optional()
})

// Custom Field schemas
export const CustomFieldDefCreateSchema = z.object({
  key: z.string().min(1, 'Field key is required').max(50, 'Field key too long').regex(/^[a-zA-Z0-9_]+$/, 'Field key must contain only letters, numbers, and underscores'),
  label: z.string().min(1, 'Field label is required').max(100, 'Field label too long'),
  type: z.enum(['text', 'number', 'select', 'date', 'boolean']),
  options: z.array(z.string()).optional()
}).refine(
  (data) => {
    if (data.type === 'select' && (!data.options || data.options.length === 0)) {
      return false
    }
    return true
  },
  {
    message: 'Select fields must have options',
    path: ['options']
  }
)

export const CustomFieldDefUpdateSchema = z.object({
  label: z.string().min(1, 'Field label is required').max(100, 'Field label too long').optional(),
  type: z.enum(['text', 'number', 'select', 'date', 'boolean']).optional(),
  options: z.array(z.string()).optional()
}).refine(
  (data) => {
    if (data.type === 'select' && (!data.options || data.options.length === 0)) {
      return false
    }
    return true
  },
  {
    message: 'Select fields must have options',
    path: ['options']
  }
)

export const CustomFieldValUpdateSchema = z.object({
  values: z.array(z.object({
    fieldId: z.string(),
    value: z.any()
  }))
})

// Comment schemas
export const CommentCreateSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(2000, 'Comment too long'),
  mentions: z.array(z.string()).optional().default([])
})

// Daily Summary schemas
export const DailySummaryGenerateSchema = z.object({
  date: z.string().datetime().optional()
})

export const DailySummarySettingsSchema = z.object({
  dailySummaryEnabled: z.boolean()
})

// Epic schemas
export const CreateEpicSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  order: z.number().int().min(0).default(0)
})

export const UpdateEpicSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  order: z.number().int().min(0).optional()
})

// Milestone schemas
export const CreateMilestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
)

export const UpdateMilestoneSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate)
    }
    return true
  },
  {
    message: 'End date must be after start date',
    path: ['endDate']
  }
)

// Task update schemas for epic/milestone assignment
export const AssignTaskToEpicSchema = z.object({
  epicId: z.string().optional() // null to unassign
})

export const AssignTaskToMilestoneSchema = z.object({
  milestoneId: z.string().optional() // null to unassign
})

export const UpdateTaskPointsSchema = z.object({
  points: z.number().int().min(0).max(100).optional()
})

// Type exports
export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>
export type TaskCreateInput = z.infer<typeof TaskCreateSchema>
export type TaskPatchInput = z.infer<typeof TaskPatchSchema>
export type TaskPutInput = z.infer<typeof TaskPutSchema>
export type CustomFieldDefCreateInput = z.infer<typeof CustomFieldDefCreateSchema>
export type CustomFieldDefUpdateInput = z.infer<typeof CustomFieldDefUpdateSchema>
export type CustomFieldValUpdateInput = z.infer<typeof CustomFieldValUpdateSchema>
export type CommentCreateInput = z.infer<typeof CommentCreateSchema>
export type DailySummaryGenerateInput = z.infer<typeof DailySummaryGenerateSchema>
export type DailySummarySettingsInput = z.infer<typeof DailySummarySettingsSchema>
export type CreateEpicInput = z.infer<typeof CreateEpicSchema>
export type UpdateEpicInput = z.infer<typeof UpdateEpicSchema>
export type CreateMilestoneInput = z.infer<typeof CreateMilestoneSchema>
export type UpdateMilestoneInput = z.infer<typeof UpdateMilestoneSchema>
export type AssignTaskToEpicInput = z.infer<typeof AssignTaskToEpicSchema>
export type AssignTaskToMilestoneInput = z.infer<typeof AssignTaskToMilestoneSchema>
export type UpdateTaskPointsInput = z.infer<typeof UpdateTaskPointsSchema>