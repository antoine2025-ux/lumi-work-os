// Models that require workspace scoping
// All models listed here have a direct workspaceId column in the database.
// The scoping middleware injects workspaceId into where/create clauses.
export const WORKSPACE_SCOPED_MODELS = [
  // Core workspace models
  'Project',
  'Task',
  'Epic',
  'Milestone',
  'WikiPage',
  'WikiChunk',
  'ChatSession',
  'FeatureFlag',
  'Integration',
  'Migration',
  'Workflow',
  'WorkflowInstance',
  'OnboardingTemplate',
  'OnboardingPlan',
  'OrgPosition',
  'ProjectTemplate',
  'TaskTemplate',
  'Activity',
  'ContextItem',
  'ContextEmbedding',
  'ContextSummary',
  'Goal',
  'GoalTemplate',
  'PerformanceReview',
  'PerformanceCycle',
  'ReviewQuestion',
  'ReviewResponse',
  'OneOnOneTemplate',
  'OneOnOneMeeting',
  'OneOnOneSeries',
  'OneOnOneTalkingPoint',
  'OneOnOneActionItem',
  'GoalWorkflowRule',
  // Task children (workspaceId added via migration)
  'Subtask',
  'TaskComment',
  'TaskHistory',
  'CustomFieldVal',
  // Project children
  'ProjectMember',
  'ProjectWatcher',
  'ProjectAssignee',
  'ProjectPersonLink',
  'ProjectDocumentation',
  'ProjectAccountability',
  'ProjectDailySummary',
  'CustomFieldDef',
  // WikiPage children
  'WikiVersion',
  'WikiComment',
  'WikiEmbed',
  'WikiAttachment',
  'WikiPagePermission',
  'WikiFavorite',
  'wiki_ai_interactions',
  'wiki_page_views',
  // Goal children
  'Objective',
  'GoalComment',
  'GoalUpdate',
  'ProjectGoalLink',
  'GoalStakeholder',
  'GoalApproval',
  'GoalProgressUpdate',
  'GoalAnalytics',
  'GoalRecommendation',
  'GoalCheckIn',
  // Goal grandchildren
  'KeyResult',
  'KeyResultUpdate',
  // Other parent chains
  'ChatMessage',
  'OnboardingTask',
  'onboarding_task_assignments',
  'TaskTemplateItem',
  'WorkflowAssignment',
  'RoleCardSkill',
  'RoleCard',
  'Skill',
  'PersonSkill',
  // Decision domain children
  'DecisionAuthority',
  'DecisionEscalationStep',
  // Capacity planning
  'ProjectAllocation',
  // Unified spaces
  'Space',
  'SpaceMember',
] as const

// Context for workspace scoping
// IMPORTANT: Use globalThis to store workspace context so it survives
// module cache clearing in development mode (see db.ts lines 95-102).
// Module-level variables get reset when require.cache is cleared,
// causing setWorkspaceContext and getWorkspaceContext to use different instances.
const _global = globalThis as unknown as { __workspaceContextId: string | null }
if (_global.__workspaceContextId === undefined) {
  _global.__workspaceContextId = null
}
const isProduction = process.env.NODE_ENV === 'production'

/**
 * Set the current workspace context for scoping
 */
export function setWorkspaceContext(workspaceId: string | null): void {
  _global.__workspaceContextId = workspaceId
}

/**
 * Get the current workspace context
 */
export function getWorkspaceContext(): string | null {
  return _global.__workspaceContextId
}

/**
 * Clear the workspace context
 */
export function clearWorkspaceContext(): void {
  _global.__workspaceContextId = null
}

/**
 * Prisma middleware to enforce workspace scoping
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const scopingMiddleware = async (params: any, next: (params: any) => Promise<unknown>) => {
  const { model, action, args } = params
  const currentWorkspaceId = getWorkspaceContext()

  // Skip middleware for non-workspace-scoped models
  if (!model || !(WORKSPACE_SCOPED_MODELS as readonly string[]).includes(model)) {
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
        args.data.forEach((item: Record<string, unknown>) => {
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
            args.data.forEach((item: Record<string, unknown>) => {
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
  const previousContext = getWorkspaceContext()
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
    throw new Error(`Hardcoded workspace ID not allowed: ${workspaceId}`)
  }

  return workspaceId
}
