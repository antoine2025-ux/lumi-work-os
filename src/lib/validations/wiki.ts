import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// Wiki page & workspace schemas
// ============================================================================

/** POST /api/wiki/pages */
export const WikiPageCreateSchema = z.object({
  title: nonEmptyString.max(255),
  content: z.string().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
  contentFormat: z.enum(['HTML', 'JSON', 'MARKDOWN']).optional(),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  permissionLevel: z.string().optional(),
  workspace_type: z.string().optional(),
  spaceId: z.string().optional(),
})

/** PUT /api/wiki/pages/[id] */
export const WikiPageUpdateSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  content: z.string().optional(),
  contentJson: z.record(z.string(), z.unknown()).optional(),
  contentFormat: z.enum(['HTML', 'JSON', 'MARKDOWN']).optional(),
  parentId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  isPublished: z.boolean().optional(),
  permissionLevel: z.string().optional(),
})

/** POST /api/wiki/workspaces */
export const WikiWorkspaceCreateSchema = z.object({
  name: nonEmptyString.max(255),
  description: z.string().trim().optional(),
  type: z
    .string()
    .optional()
    .refine((val) => val !== 'personal', {
      message: 'Personal Space is a reserved workspace type and cannot be created',
    }),
  color: z.string().optional(),
  icon: z.string().optional(),
  isPrivate: z.boolean().optional(),
  visibility: z.enum(['PERSONAL', 'PRIVATE', 'PUBLIC']).optional(),
  memberIds: z.array(z.string()).optional(),
})
