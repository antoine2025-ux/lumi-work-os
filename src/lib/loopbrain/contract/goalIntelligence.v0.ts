/**
 * Goal Intelligence v0 — Goal Analytics & Agent Action Contract
 *
 * Machine contract for Loopbrain reasoning about goal health, risk,
 * recommendations, and available agent actions. Integrates with
 * Goal, GoalAnalytics, GoalRecommendation, and workflow models.
 *
 * Invariants:
 * - All percentages for confidence/impact are 0.0–1.0 (not 0–100)
 * - Risk scores are 0–100
 * - Velocity is progress points per week
 * - Actions are executable via their API endpoints
 * - Evidence values are shallow, JSON-serializable primitives
 *
 * Evidence paths for Loopbrain reasoning:
 * - analytics.riskScore
 * - analytics.progressVelocity
 * - analytics.projectedCompletion
 * - analytics.updateFrequency
 * - recommendations.{type}.count
 * - riskFactors.{factor}.severity
 * - possibleActions.{action}.confidence
 *
 * @example
 * ```typescript
 * const snapshot: GoalIntelligenceSnapshotV0 = {
 *   schemaVersion: "v0",
 *   generatedAt: new Date().toISOString(),
 *   workspaceId: "ws_123",
 *   goalId: "goal_456",
 *   goalTitle: "Launch Q1 Revenue Target",
 *   analytics: {
 *     riskScore: 72,
 *     progressVelocity: 2.3,
 *     projectedCompletion: "2026-04-15T00:00:00Z",
 *     updateFrequency: 0.8,
 *     stakeholderEngagement: 45,
 *   },
 *   riskFactors: [
 *     { factor: "high_risk_score", severity: "CRITICAL", detail: "Risk score is 72%" },
 *   ],
 *   recommendations: [
 *     { type: "PROGRESS_AT_RISK", priority: "HIGH", confidence: 0.85, impact: 0.8 },
 *   ],
 *   possibleActions: [
 *     { action: "reallocate_resources", confidence: 0.82, impact: 0.7, ... },
 *   ],
 * };
 * ```
 */

// =============================================================================
// Risk Factor Types
// =============================================================================

/**
 * Types of goal risk factors detected by Loopbrain.
 * Append-only; meanings must never change.
 */
export const GOAL_RISK_FACTOR_V0 = [
  'high_risk_score',
  'elevated_risk',
  'stalled_progress',
  'low_engagement',
  'goal_conflicts',
  'deadline_approaching',
  'resource_contention',
  'alignment_drift',
] as const

export type GoalRiskFactor = (typeof GOAL_RISK_FACTOR_V0)[number]

// =============================================================================
// Severity Scale
// =============================================================================

export const GOAL_RISK_SEVERITY_V0 = [
  'info',
  'warning',
  'critical',
] as const

export type GoalRiskSeverity = (typeof GOAL_RISK_SEVERITY_V0)[number]

// =============================================================================
// Recommendation Types
// =============================================================================

export const GOAL_RECOMMENDATION_TYPE_V0 = [
  'PROGRESS_AT_RISK',
  'RESOURCE_REALLOCATION',
  'TIMELINE_ADJUSTMENT',
  'STAKEHOLDER_ENGAGEMENT',
  'PROJECT_PRIORITIZATION',
] as const

export type GoalRecommendationTypeV0 = (typeof GOAL_RECOMMENDATION_TYPE_V0)[number]

// =============================================================================
// Agent Action Types
// =============================================================================

export const GOAL_AGENT_ACTION_V0 = [
  'update_progress',
  'reallocate_resources',
  'escalate_to_stakeholder',
  'adjust_timeline',
] as const

export type GoalAgentAction = (typeof GOAL_AGENT_ACTION_V0)[number]

// =============================================================================
// Analytics Snapshot
// =============================================================================

export interface GoalAnalyticsV0 {
  /** 0–100, higher = more risk of missing goal */
  riskScore: number
  /** Progress points gained per week */
  progressVelocity: number
  /** ISO-8601 datetime, null if unable to project */
  projectedCompletion: string | null
  /** Updates per week over last 30 days */
  updateFrequency: number
  /** 0–100, engagement based on stakeholders, check-ins, activity */
  stakeholderEngagement: number
  /** 0–100, task completion rate across linked projects, null if no projects */
  teamProductivity: number | null
  /** 0–100, how well project contributions match expectations, null if no projects */
  projectAlignment: number | null
}

// =============================================================================
// Risk Factor
// =============================================================================

export interface GoalRiskFactorV0 {
  factor: GoalRiskFactor
  severity: GoalRiskSeverity
  /** Human-readable detail string for Loopbrain citation */
  detail: string
}

// =============================================================================
// Recommendation
// =============================================================================

export interface GoalRecommendationV0 {
  id: string
  type: GoalRecommendationTypeV0
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  title: string
  description: string
  /** Can this recommendation be executed automatically? */
  automatable: boolean
  /** 0.0–1.0, how confident the system is */
  confidence: number
  /** 0.0–1.0, expected impact if implemented */
  impact: number
}

// =============================================================================
// Agent Action
// =============================================================================

export interface GoalAgentActionV0 {
  action: GoalAgentAction
  /** 0.0–1.0, how confident the system is this action will help */
  confidence: number
  /** 0.0–1.0, expected impact of this action */
  impact: number
  /** Human-readable description */
  description: string
  /** Full API endpoint for execution */
  apiEndpoint: string
  /** Required parameter names */
  requiredParams: string[]
}

// =============================================================================
// Goal Intelligence Snapshot
// =============================================================================

export interface GoalIntelligenceSnapshotV0 {
  schemaVersion: 'v0'
  generatedAt: string
  workspaceId: string
  goalId: string
  goalTitle: string
  goalLevel: string
  goalStatus: string
  goalProgress: number

  /** Computed analytics */
  analytics: GoalAnalyticsV0 | null

  /** Identified risk factors */
  riskFactors: GoalRiskFactorV0[]

  /** AI-generated recommendations */
  recommendations: GoalRecommendationV0[]

  /** Available agent actions */
  possibleActions: GoalAgentActionV0[]

  /** Number of stakeholders */
  stakeholderCount: number

  /** Number of linked projects */
  linkedProjectCount: number

  /** Number of child goals */
  childGoalCount: number

  /** Parent goal alignment score, null if no parent */
  parentAlignmentScore: number | null
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine the highest-severity risk factor.
 */
export function getHighestRisk(
  snapshot: GoalIntelligenceSnapshotV0
): GoalRiskFactorV0 | null {
  const severityOrder: GoalRiskSeverity[] = ['critical', 'warning', 'info']

  for (const severity of severityOrder) {
    const factor = snapshot.riskFactors.find(f => f.severity === severity)
    if (factor) return factor
  }

  return null
}

/**
 * Get the most impactful recommended action.
 */
export function getTopAction(
  snapshot: GoalIntelligenceSnapshotV0
): GoalAgentActionV0 | null {
  if (snapshot.possibleActions.length === 0) return null

  return [...snapshot.possibleActions].sort(
    (a, b) => (b.confidence * b.impact) - (a.confidence * a.impact)
  )[0]
}

/**
 * Check if this goal needs immediate attention.
 */
export function needsImmediateAttention(
  snapshot: GoalIntelligenceSnapshotV0
): boolean {
  if (!snapshot.analytics) return false

  return (
    snapshot.analytics.riskScore > 70 ||
    snapshot.riskFactors.some(f => f.severity === 'critical') ||
    snapshot.recommendations.some(r => r.priority === 'URGENT')
  )
}

/**
 * Get evidence values for Loopbrain answer envelope.
 * All values are shallow, JSON-serializable primitives.
 */
export function getEvidenceValues(
  snapshot: GoalIntelligenceSnapshotV0
): Record<string, string | number | boolean | null> {
  return {
    goalId: snapshot.goalId,
    goalTitle: snapshot.goalTitle,
    goalLevel: snapshot.goalLevel,
    goalStatus: snapshot.goalStatus,
    goalProgress: snapshot.goalProgress,
    riskScore: snapshot.analytics?.riskScore ?? null,
    progressVelocity: snapshot.analytics?.progressVelocity ?? null,
    projectedCompletion: snapshot.analytics?.projectedCompletion ?? null,
    updateFrequency: snapshot.analytics?.updateFrequency ?? null,
    stakeholderEngagement: snapshot.analytics?.stakeholderEngagement ?? null,
    riskFactorCount: snapshot.riskFactors.length,
    recommendationCount: snapshot.recommendations.length,
    actionCount: snapshot.possibleActions.length,
    needsAttention: needsImmediateAttention(snapshot),
    stakeholderCount: snapshot.stakeholderCount,
    linkedProjectCount: snapshot.linkedProjectCount,
    parentAlignmentScore: snapshot.parentAlignmentScore,
  }
}
