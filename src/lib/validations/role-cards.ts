import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// Role Cards Schemas (Phase 8)
// ============================================================================

/** POST /api/role-cards */
export const RoleCardCreateSchema = z.object({
  positionId: z.string().uuid(),
  roleName: nonEmptyString.max(200),
  jobFamily: z.string().max(100).optional(),
  roleDescription: nonEmptyString.max(5000),
  responsibilities: z.array(z.string().max(500)).optional().default([]),
})
