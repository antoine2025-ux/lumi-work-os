import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// Internal API Schemas (Phase 8)
// ============================================================================

/** POST /api/internal/loopbrain/run */
export const LoopbrainEngineRunSchema = z.object({
  engineKey: nonEmptyString.max(100),
  workspaceId: z.string().uuid().optional(),
  workspaceIds: z.array(z.string().uuid()).optional(),
})
