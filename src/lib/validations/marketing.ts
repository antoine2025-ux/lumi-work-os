import { z } from 'zod'
import { emailString } from './common'

// ============================================================================
// Newsletter & Waitlist Schemas (Phase 8)
// ============================================================================

/** POST /api/newsletter/subscribe */
export const NewsletterSubscribeSchema = z.object({
  email: emailString,
  name: z.string().max(100).optional(),
  companyName: z.string().max(200).optional(),
})

/** POST /api/waitlist/subscribe */
export const WaitlistSubscribeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: emailString,
  linkedin: z.string().url('Invalid LinkedIn URL').max(500).optional(),
  company: z.string().max(200).optional(),
})
