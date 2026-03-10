import { z } from 'zod'
import { emailString, nonEmptyString } from './common'

// ============================================================================
// Admin User Management schemas
// ============================================================================

/** POST /api/admin/invite */
export const AdminInviteUserSchema = z.object({
  email: emailString,
  role: z.enum(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']).optional().default('MEMBER'),
  redirectTo: z.string().url().optional(),
})

/** POST /api/admin/users */
export const AdminCreateUserSchema = z.object({
  email: emailString,
  name: nonEmptyString.max(255),
  role: z.enum(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']).optional().default('MEMBER'),
  workspaceId: z.string().optional(),
  bio: z.string().max(2000).optional(),
  skills: z.array(z.string()).optional().default([]),
  currentGoals: z.array(z.string()).optional().default([]),
  interests: z.array(z.string()).optional().default([]),
  timezone: z.string().max(100).optional(),
  location: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  linkedinUrl: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
  personalWebsite: z.string().url().optional(),
})

/** PUT /api/admin/users/[id] */
export const AdminUpdateUserSchema = z.object({
  name: z.string().max(255).optional(),
  email: emailString.optional(),
  role: z.enum(['VIEWER', 'MEMBER', 'ADMIN', 'OWNER']).optional(),
  department: z.string().max(255).optional(),
  positionId: z.string().optional(),
  isActive: z.boolean().optional(),
  createOrgPosition: z.boolean().optional(),
  orgPositionTitle: z.string().max(200).optional(),
  orgPositionLevel: z.number().int().min(1).max(10).optional(),
  orgPositionParentId: z.string().nullable().optional(),
  workspaceId: z.string().optional(),
})

// ============================================================================
// Org Invitation schemas
// ============================================================================

/** POST /api/org/invitations/respond */
export const OrgInvitationRespondSchema = z.object({
  token: nonEmptyString,
  decision: z.enum(['ACCEPT', 'DECLINE']),
})

/** POST /api/org/invitations/resend */
export const OrgInvitationIdSchema = z.object({
  id: z.string().uuid(),
})

// ============================================================================
// Blog Admin schemas
// ============================================================================

/** POST /api/blog/admin/login */
export const BlogAdminLoginSchema = z.object({
  password: nonEmptyString.min(8),
})
