import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// Responsibility System Schemas (Phase 8)
// ============================================================================

/** POST /api/org/responsibility/profiles */
export const ResponsibilityProfileCreateSchema = z.object({
  roleType: nonEmptyString.max(100),
  minSeniority: z.string().max(50).optional(),
  maxSeniority: z.string().max(50).optional(),
  primaryTagIds: z.array(z.string()).optional(),
  allowedTagIds: z.array(z.string()).optional(),
  forbiddenTagIds: z.array(z.string()).optional(),
})

/** POST /api/org/responsibility/tags */
export const ResponsibilityTagCreateSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[A-Z_]+$/, 'Key must be uppercase with underscores'),
  label: nonEmptyString.max(200),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
})
