import { z } from 'zod'

// ============================================================================
// Task-related schemas that are NOT already in src/lib/pm/schemas.ts
//
// Note: TaskCreateSchema, TaskPatchSchema, TaskPutSchema already live in
// @/lib/pm/schemas and should be used directly from there.  This file covers
// the remaining gaps: dependencies and subtasks.
// ============================================================================

/** POST /api/tasks/[id]/dependencies */
export const TaskDependencySchema = z.object({
  dependsOn: z.array(z.string()).default([]),
  blocks: z.array(z.string()).default([]),
  action: z.enum(['set', 'add', 'remove']).default('set'),
})

/** POST /api/tasks/[id]/subtasks */
export const SubtaskCreateSchema = z.object({
  subtasks: z
    .array(
      z.object({
        title: z.string().min(1, 'Subtask title is required').max(255),
        description: z.string().optional(),
        assigneeId: z.string().optional(),
        dueDate: z.string().optional(),
      })
    )
    .min(1, 'At least one subtask is required'),
})

/** POST /api/tasks/[id]/wiki-links */
export const TaskWikiLinkCreateSchema = z.object({
  wikiPageId: z.string().min(1, 'Wiki page ID is required'),
})

export type TaskWikiLinkCreate = z.infer<typeof TaskWikiLinkCreateSchema>

// ============================================================================
// Task Template schemas (Phase 5)
// ============================================================================

/** POST /api/task-templates */
export const TaskTemplateCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.enum(['SOFTWARE_DEVELOPMENT', 'MARKETING_CAMPAIGN', 'EVENT_PLANNING', 'PRODUCT_LAUNCH', 'GENERAL']).default('GENERAL'),
  isPublic: z.boolean().default(false),
  tasks: z.array(z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    points: z.number().min(0).max(100).nullable().optional(),
    tags: z.array(z.string().max(50)).optional(),
  })).optional(),
})

/** PUT /api/task-templates/[id] */
export const TaskTemplateUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(['SOFTWARE_DEVELOPMENT', 'MARKETING_CAMPAIGN', 'EVENT_PLANNING', 'PRODUCT_LAUNCH', 'GENERAL']).optional(),
  isPublic: z.boolean().optional(),
  metadata: z.any().optional(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(255),
    description: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    estimatedDuration: z.any().optional(),
    assigneeRole: z.any().optional(),
    tags: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
  })).optional(),
})

/** POST /api/task-templates/[id]/apply */
export const TaskTemplateApplySchema = z.object({
  projectId: z.string().uuid(),
  taskCount: z.number().int().min(1).default(1),
})
