import { z } from 'zod'

// ============================================================================
// Embed URL schema (shared across all embed routes)
// ============================================================================

/** 
 * POST /api/embeds/link-card
 * POST /api/embeds/github
 * POST /api/embeds/airtable
 * POST /api/embeds/figma
 * POST /api/embeds/generic
 * POST /api/embeds/miro
 * POST /api/embeds/drawio
 * POST /api/embeds/asana
 */
export const EmbedUrlSchema = z.object({
  url: z.string().url().max(2000),
})
