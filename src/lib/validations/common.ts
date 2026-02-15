import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared primitives for Zod validation schemas
// ---------------------------------------------------------------------------

/** A non-empty trimmed string (min 1 char after trim). */
export const nonEmptyString = z.string().trim().min(1)

/** A string that is optional OR null – coerced to `string | null | undefined`. */
export const optionalNullableString = z.string().optional().nullable()

/** A string validated as an email address. */
export const emailString = z.string().trim().email()

/**
 * A date-like string.  Accepts ISO-8601 datetime strings and YYYY-MM-DD.
 * Does NOT transform – the route decides how to persist.
 */
export const dateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid date string' }
)

/**
 * Optional date string – same rules as `dateString` but allows undefined.
 */
export const optionalDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date string' })
  .optional()

// ---------------------------------------------------------------------------
// Pagination / sorting (for GET query-param validation – lower priority)
// ---------------------------------------------------------------------------

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const SortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})
