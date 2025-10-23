import { Prisma } from '@prisma/client'
import { isDevBypassAllowed } from '@/lib/unified-auth'

// Models that require workspace scoping
const WORKSPACE_SCOPED_MODELS = [
  'Project',
  'Task',
  'Epic',
  'Milestone',
  'WikiPage',
  'WikiChunk',
  'WikiEmbed',
  'WikiAttachment',
  'WikiComment',
  'WikiVersion',
  'WikiPagePermission',
  'WikiFavorite',
  'ChatSession',
  'ChatMessage',
  'FeatureFlag',
  'Integration',
  'Migration',
  'Workflow',
  'WorkflowInstance',
  'OnboardingTemplate',
  'OnboardingPlan',
  'OnboardingTask',
  'OrgPosition',
  'ProjectTemplate',
  'TaskTemplate',
  'TaskTemplateItem',
  'Activity',
  'CustomFieldDef',
  'CustomFieldVal',
  'TaskHistory',
  'ProjectDailySummary',
  'ProjectMember',
  'ProjectWatcher',
  'ProjectAssignee',
  'Subtask',
  'TaskComment'
] as const

// Context for workspace scoping
let currentWorkspaceId: string | null = null
let isProduction = process.env.NODE_ENV === 'production'

/**
 * Set the current workspace context for scoping
 */
export function setWorkspaceContext(workspaceId: string | null): void {
  currentWorkspaceId = workspaceId
}

/**
 * Get the current workspace context
 */
export function getWorkspaceContext(): string | null {
  return currentWorkspaceId
}

/**
 * Clear the workspace context
 */
export function clearWorkspaceContext(): void {
  currentWorkspaceId = null
}

/**
 * Prisma middleware to enforce workspace scoping
 */
export const scopingMiddleware: Prisma.Middleware = async (params, next) => {
  const { model, action, args } = params

  // Skip middleware for non-workspace-scoped models
  if (!model || !WORKSPACE_SCOPED_MODELS.includes(model as any)) {
    return next(params)
  }

  // Skip middleware for certain actions that don't need scoping
  if (action === 'findFirst' && args?.where?.id) {
    // Allow finding by ID without workspace context (for lookups)
    return next(params)
  }

  // In production, enforce workspace scoping
  if (isProduction) {
    if (!currentWorkspaceId) {
      throw new Error(`Production error: No workspace context set for ${action} on ${model}`)
    }

    // Add workspaceId to where clause for scoped operations
    if (action === 'findMany' || action === 'findFirst' || action === 'count') {
      if (!args.where) {
        args.where = {}
      }
      
      // Only add workspaceId if it's not already specified
      if (!args.where.workspaceId) {
        args.where.workspaceId = currentWorkspaceId
      }
    }

    // For create operations, ensure workspaceId is set
    if (action === 'create' || action === 'createMany') {
      if (!args.data) {
        throw new Error(`Production error: No data provided for ${action} on ${model}`)
      }

      if (Array.isArray(args.data)) {
        // Handle createMany
        args.data.forEach((item: any) => {
          if (!item.workspaceId) {
            item.workspaceId = currentWorkspaceId
          }
        })
      } else {
        // Handle create
        if (!args.data.workspaceId) {
          args.data.workspaceId = currentWorkspaceId
        }
      }
    }

    // For update operations, ensure workspaceId is in where clause
    if (action === 'update' || action === 'updateMany' || action === 'delete' || action === 'deleteMany') {
      if (!args.where) {
        throw new Error(`Production error: No where clause provided for ${action} on ${model}`)
      }

      // Only add workspaceId if it's not already specified
      if (!args.where.workspaceId) {
        args.where.workspaceId = currentWorkspaceId
      }
    }
  } else {
    // In development, log warnings but don't enforce
    if (!currentWorkspaceId) {
      console.warn(`Dev warning: No workspace context set for ${action} on ${model}`)
    } else {
      // Still add workspaceId in development for consistency
      if (action === 'findMany' || action === 'findFirst' || action === 'count') {
        if (!args.where) {
          args.where = {}
        }
        
        if (!args.where.workspaceId) {
          args.where.workspaceId = currentWorkspaceId
        }
      }

      if (action === 'create' || action === 'createMany') {
        if (args.data) {
          if (Array.isArray(args.data)) {
            args.data.forEach((item: any) => {
              if (!item.workspaceId) {
                item.workspaceId = currentWorkspaceId
              }
            })
          } else {
            if (!args.data.workspaceId) {
              args.data.workspaceId = currentWorkspaceId
            }
          }
        }
      }

      if (action === 'update' || action === 'updateMany' || action === 'delete' || action === 'deleteMany') {
        if (!args.where) {
          args.where = {}
        }

        if (!args.where.workspaceId) {
          args.where.workspaceId = currentWorkspaceId
        }
      }
    }
  }

  return next(params)
}

/**
 * Helper to run a Prisma operation with workspace context
 */
export async function withWorkspaceContext<T>(
  workspaceId: string,
  operation: () => Promise<T>
): Promise<T> {
  const previousContext = currentWorkspaceId
  setWorkspaceContext(workspaceId)
  
  try {
    return await operation()
  } finally {
    setWorkspaceContext(previousContext)
  }
}

/**
 * Validate that a workspaceId is provided and not a hardcoded dev value
 */
export function validateWorkspaceId(workspaceId: string | null | undefined): string {
  if (!workspaceId) {
    throw new Error('Workspace ID is required')
  }

  // Check for hardcoded dev values
  const hardcodedValues = [
    'dev-workspace',
    'test-workspace',
    'default-workspace'
  ]

  if (hardcodedValues.includes(workspaceId)) {
    if (isDevBypassAllowed()) {
      console.warn(`Dev bypass: Using hardcoded workspace ID ${workspaceId}`)
    } else {
      throw new Error(`Production error: Hardcoded workspace ID not allowed: ${workspaceId}`)
    }
  }

  return workspaceId
}
