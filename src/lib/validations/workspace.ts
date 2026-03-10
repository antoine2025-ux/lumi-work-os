import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// Workspace Management schemas
// ============================================================================

/** POST /api/workspace/create */
export const CreateWorkspaceSchema = z.object({
  name: nonEmptyString.max(100),
  slug: nonEmptyString.max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
  teamSize: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
})

/** POST /api/workspaces */
export const CreateWorkspaceAltSchema = z.object({
  name: nonEmptyString.max(100),
  slug: nonEmptyString.max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().max(500).optional(),
})

/** PUT /api/workspaces/[workspaceId] */
export const UpdateWorkspaceSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  logo: z.string().url().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
})

// ============================================================================
// Migration schemas
// ============================================================================

/** POST /api/migrations */
export const StartMigrationSchema = z.object({
  platform: z.enum(['slite', 'clickup', 'SLITE', 'CLICKUP']),
  apiKey: nonEmptyString,
  workspaceId: z.string().uuid(),
  additionalConfig: z.object({
    teamId: z.string().optional(),
  }).optional(),
})

/** POST /api/migrations/import */
export const ImportMigrationSchema = z.object({
  sessionId: z.string().uuid(),
  itemIds: z.array(z.string()).min(1),
})

// ============================================================================
// Workspace Onboarding schemas
// ============================================================================

/** POST /api/workspace-onboarding */
export const WorkspaceOnboardingSchema = z.object({
  templateId: z.string().optional(),
  customName: z.string().max(100).optional(),
  customDescription: z.string().max(500).optional(),
  inviteMembers: z.array(z.string().email()).optional(),
  enableFeatures: z.array(z.string()).optional(),
})
