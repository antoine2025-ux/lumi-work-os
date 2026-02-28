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
