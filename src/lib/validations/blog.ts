import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// Blog Schemas (Phase 8)
// ============================================================================

/** POST /api/blog/admin/posts */
export const BlogPostCreateSchema = z.object({
  title: nonEmptyString.max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  excerpt: nonEmptyString.max(500),
  content: nonEmptyString.max(100000),
  category: z.enum(['PRODUCT', 'ENGINEERING', 'COMPANY', 'CUSTOMER_STORIES']),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  publishedAt: z.string().datetime().optional().nullable(),
  featuredImage: z.string().url().max(1000).optional().nullable(),
  tags: z.array(z.string().max(50)).optional(),
})

/** PUT /api/blog/admin/posts/[id] */
export const BlogPostUpdateSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  slug: z.string().max(300).optional(),
  content: z.string().max(100000).optional(),
  excerpt: z.string().max(1000).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  category: z.enum(['NEWS', 'PRODUCT', 'CONTEXTUAL_AI', 'LOOPWELL']).optional(),
})
