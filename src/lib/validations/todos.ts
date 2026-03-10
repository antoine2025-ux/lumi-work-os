import { z } from 'zod'

// ============================================================================
// Todo schemas
// ============================================================================

/** POST /api/todos */
export const TodoCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  note: z.string().max(5000).optional().nullable(),
  status: z.enum(['OPEN', 'DONE']).optional().default('OPEN'),
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  assignedToId: z.string().optional(),
  anchorType: z.enum(['NONE', 'PROJECT', 'TASK', 'PAGE']).optional().default('NONE'),
  anchorId: z.string().optional().nullable(),
})

/** PATCH /api/todos/[id] */
export const TodoUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  note: z.string().max(5000).optional().nullable(),
  status: z.enum(['OPEN', 'DONE']).optional(),
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().nullable(),
  assignedToId: z.string().optional(),
  anchorType: z.enum(['NONE', 'PROJECT', 'TASK', 'PAGE']).optional(),
  anchorId: z.string().optional().nullable(),
})
