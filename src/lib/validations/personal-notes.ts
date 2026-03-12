import { z } from 'zod'

// ============================================================================
// Personal Note schemas
// ============================================================================

/** POST /api/personal-notes */
export const PersonalNoteCreateSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().max(50000).optional(),
})

/** PUT /api/personal-notes/[id] */
export const PersonalNoteUpdateSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().max(50000).optional(),
  pinned: z.boolean().optional(),
})
