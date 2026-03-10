import { z } from 'zod'
import { nonEmptyString } from './common'

// ============================================================================
// Core Goal schemas
// ============================================================================

/** POST /api/goals */
export const CreateGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  level: z.enum(['COMPANY', 'DEPARTMENT', 'TEAM', 'INDIVIDUAL']),
  ownerId: z.string().optional(),
  parentId: z.string().optional(),
  period: z.enum(['QUARTERLY', 'ANNUAL', 'CUSTOM']),
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  quarter: z.string().optional(),
  objectives: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    weight: z.number().min(0).max(10).default(1),
    keyResults: z.array(z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      metricType: z.enum(['PERCENT', 'NUMBER', 'BOOLEAN', 'CURRENCY']),
      targetValue: z.number(),
      unit: z.string().optional(),
      dueDate: z.string().transform(str => new Date(str)).optional(),
    })).optional(),
  })).optional(),
})

/** PATCH /api/goals/[goalId] */
export const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  ownerId: z.string().optional(),
  startDate: z.string().transform(str => new Date(str)).optional(),
  endDate: z.string().transform(str => new Date(str)).optional(),
})

// ============================================================================
// Objective & Key Result schemas
// ============================================================================

/** POST /api/goals/[goalId]/objectives */
export const CreateObjectiveSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  weight: z.number().min(0).max(10).default(1),
  keyResults: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    metricType: z.enum(['PERCENT', 'NUMBER', 'BOOLEAN', 'CURRENCY']),
    currentValue: z.number().default(0),
    targetValue: z.number(),
    unit: z.string().optional(),
    dueDate: z.string().transform(str => new Date(str)).optional(),
  })).min(1, 'At least one key result is required'),
})

/** PATCH /api/goals/[goalId]/objectives */
export const UpdateObjectiveSchema = z.object({
  objectiveId: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  weight: z.number().min(0).max(10).optional(),
})

// ============================================================================
// Progress & Check-in schemas
// ============================================================================

/** POST /api/goals/[goalId]/progress */
export const UpdateProgressSchema = z.object({
  keyResultId: z.string(),
  newValue: z.number(),
  note: z.string().optional(),
})

/** POST /api/goals/[goalId]/check-ins */
export const CreateCheckInSchema = z.object({
  period: z.string(),
  progressUpdate: z.number().min(0).max(100).optional(),
  blockers: z.string().optional(),
  support: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

// ============================================================================
// Approval schemas
// ============================================================================

/** POST /api/goals/[goalId]/approvals */
export const RequestApprovalSchema = z.object({
  approverIds: z.array(z.string()).min(1),
  comment: z.string().optional(),
})

/** PATCH /api/goals/[goalId]/approvals */
export const UpdateApprovalSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  comment: z.string().optional(),
})

// ============================================================================
// Stakeholder schemas
// ============================================================================

/** POST /api/goals/[goalId]/stakeholders */
export const AddStakeholderSchema = z.object({
  userId: z.string(),
  role: z.enum(['OWNER', 'CONTRIBUTOR', 'VIEWER', 'REVIEWER']),
  canEdit: z.boolean().optional().default(false),
  canApprove: z.boolean().optional().default(false),
})

// ============================================================================
// Project Linking schemas
// ============================================================================

/** POST /api/goals/[goalId]/link-project */
export const LinkProjectSchema = z.object({
  projectId: z.string(),
  contributionType: z.enum(['REQUIRED', 'CONTRIBUTING', 'SUPPORTING']).default('CONTRIBUTING'),
  expectedImpact: z.number().min(0).max(100).default(50),
  autoUpdate: z.boolean().default(true),
  syncRules: z.record(z.string(), z.unknown()).nullable().optional(),
})

// ============================================================================
// Comment schema
// ============================================================================

/** POST /api/goals/[goalId]/comments */
export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
})

// ============================================================================
// Action schemas
// ============================================================================

/** POST /api/goals/[goalId]/actions/escalate-to-stakeholder */
export const EscalateGoalSchema = z.object({
  escalateTo: z.string(),
  reason: z.string().min(1),
})

/** POST /api/goals/[goalId]/actions/update-progress */
export const UpdateProgressActionSchema = z.object({
  newProgress: z.number().min(0).max(100),
  triggeredBy: z.enum(['manual_update', 'key_result_change', 'agent_action']),
  sourceId: z.string().optional(),
  confidence: z.number().min(0).max(1).optional().default(1.0),
})

/** POST /api/goals/[goalId]/actions/adjust-timeline */
export const AdjustTimelineSchema = z.object({
  newEndDate: z.string().transform((s) => new Date(s)),
  reason: z.string().optional(),
})

/** POST /api/goals/[goalId]/actions/reallocate-resources */
export const ReallocateResourcesSchema = z.object({
  fromProjectId: z.string(),
  toProjectId: z.string(),
  resourceCount: z.number().min(1),
})

// ============================================================================
// Recommendation schema
// ============================================================================

/** PATCH /api/goals/[goalId]/recommendations */
export const UpdateRecommendationSchema = z.object({
  status: z.enum(['ACKNOWLEDGED', 'IMPLEMENTING', 'COMPLETED', 'DISMISSED']),
  feedback: z.string().optional(),
})

// ============================================================================
// Workflow schema
// ============================================================================

/** POST /api/goals/workflows */
export const CreateWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: z.enum([
    'GOAL_PROGRESS_STALLED',
    'GOAL_AT_RISK',
    'PROJECT_COMPLETION',
    'DEADLINE_APPROACHING',
    'STAKEHOLDER_UPDATE_REQUIRED',
  ]),
  conditions: z.record(z.string(), z.unknown()).default({}),
  actions: z.array(z.object({
    type: z.enum(['notify_stakeholders', 'escalate_goal', 'adjust_timeline', 'reallocate_resources', 'update_status']),
    params: z.record(z.string(), z.unknown()),
  })).min(1),
})
