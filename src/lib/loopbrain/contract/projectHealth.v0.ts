/**
 * Project Health v0 — Project Health Metrics Contract
 *
 * Machine contract for Loopbrain reasoning about project velocity, risks,
 * resource health, and momentum. Integrates with Epic, Milestone, Task,
 * and ProjectAllocation models.
 *
 * Invariants:
 * - All percentages are 0.0–1.0 (not 0–100)
 * - Velocity metrics are per-week unless otherwise specified
 * - Risk severity follows standard LOW/MEDIUM/HIGH/CRITICAL scale
 * - Trend directions are relative to previous period
 *
 * Evidence paths for Loopbrain reasoning:
 * - velocity.completionRate
 * - velocity.throughput
 * - risks.{riskType}.count
 * - resourceHealth.utilizationPct
 * - momentum.trendDirection
 *
 * @example
 * ```typescript
 * const snapshot: ProjectHealthSnapshotV0 = {
 *   schemaVersion: "v0",
 *   generatedAt: new Date().toISOString(),
 *   workspaceId: "ws_123",
 *   projectId: "proj_456",
 *   projectName: "Platform Rebuild",
 *   velocity: {
 *     completionRate: 0.75,
 *     throughput: { tasksPerWeek: 12, pointsPerWeek: 34 },
 *     cycleTime: { avgDays: 3.2, p50Days: 2.5, p90Days: 7.0 },
 *   },
 *   progress: {
 *     tasks: { total: 100, completed: 75, inProgress: 15, blocked: 5, todo: 5 },
 *     epics: { total: 5, completed: 3, inProgress: 2 },
 *     milestones: { total: 3, completed: 1, upcoming: 2, overdue: 0 },
 *   },
 *   risks: [
 *     { id: "risk_1", riskType: "DEADLINE_AT_RISK", severity: "HIGH", ... },
 *   ],
 *   resourceHealth: { ... },
 *   momentum: { trendDirection: "IMPROVING", ... },
 *   blockers: [...],
 *   summary: { overallHealth: "GOOD", ... },
 * };
 * ```
 */

// =============================================================================
// Risk Type Enum
// =============================================================================

/**
 * Types of project risks detected by Loopbrain.
 * Append-only; meanings must never change.
 */
export const PROJECT_RISK_TYPE_V0 = [
  "DEADLINE_AT_RISK",
  "SCOPE_CREEP",
  "RESOURCE_SHORTAGE",
  "BLOCKED_TASKS",
  "DEPENDENCY_DELAY",
  "VELOCITY_DECLINE",
  "QUALITY_CONCERN",
  "STAKEHOLDER_MISALIGNMENT",
] as const;

export type ProjectRiskTypeV0 = (typeof PROJECT_RISK_TYPE_V0)[number];

// =============================================================================
// Severity Enum
// =============================================================================

/**
 * Risk severity levels.
 */
export const RISK_SEVERITY_V0 = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export type RiskSeverityV0 = (typeof RISK_SEVERITY_V0)[number];

// =============================================================================
// Trend Direction Enum
// =============================================================================

/**
 * Trend direction for momentum analysis.
 */
export const TREND_DIRECTION_V0 = [
  "IMPROVING",
  "STABLE",
  "DECLINING",
  "VOLATILE",
] as const;

export type TrendDirectionV0 = (typeof TREND_DIRECTION_V0)[number];

// =============================================================================
// Overall Health Enum
// =============================================================================

/**
 * Overall project health assessment.
 */
export const OVERALL_HEALTH_V0 = [
  "EXCELLENT",
  "GOOD",
  "AT_RISK",
  "CRITICAL",
] as const;

export type OverallHealthV0 = (typeof OVERALL_HEALTH_V0)[number];

// =============================================================================
// Velocity Types
// =============================================================================

/**
 * Throughput metrics (work completed per time period).
 */
export type ThroughputMetricsV0 = {
  /** Tasks completed per week */
  tasksPerWeek: number;
  /** Story points completed per week (if using points) */
  pointsPerWeek: number | null;
};

/**
 * Cycle time metrics (time from start to completion).
 */
export type CycleTimeMetricsV0 = {
  /** Average days to complete a task */
  avgDays: number;
  /** Median (p50) days to complete */
  p50Days: number;
  /** 90th percentile days to complete */
  p90Days: number;
};

/**
 * Velocity metrics for the project.
 */
export type ProjectVelocityV0 = {
  /**
   * Completion rate (0.0–1.0).
   * Ratio of completed tasks to total tasks.
   */
  completionRate: number;
  /** Throughput metrics */
  throughput: ThroughputMetricsV0;
  /** Cycle time metrics */
  cycleTime: CycleTimeMetricsV0;
  /** Velocity trend compared to previous period */
  velocityTrend?: TrendDirectionV0;
};

// =============================================================================
// Progress Types
// =============================================================================

/**
 * Task progress breakdown.
 */
export type TaskProgressV0 = {
  /** Total tasks in project */
  total: number;
  /** Completed tasks */
  completed: number;
  /** Tasks in progress */
  inProgress: number;
  /** Blocked tasks */
  blocked: number;
  /** Tasks not yet started */
  todo: number;
  /** Tasks in review */
  inReview?: number;
};

/**
 * Epic progress breakdown.
 */
export type EpicProgressV0 = {
  /** Total epics */
  total: number;
  /** Completed epics (all tasks done) */
  completed: number;
  /** Epics with work in progress */
  inProgress: number;
  /** Epics not yet started */
  notStarted?: number;
};

/**
 * Milestone progress breakdown.
 */
export type MilestoneProgressV0 = {
  /** Total milestones */
  total: number;
  /** Completed milestones */
  completed: number;
  /** Upcoming milestones (not yet due) */
  upcoming: number;
  /** Overdue milestones */
  overdue: number;
  /** Next milestone due date (ISO string) */
  nextDueDate?: string | null;
};

/**
 * Overall progress metrics.
 */
export type ProjectProgressV0 = {
  tasks: TaskProgressV0;
  epics: EpicProgressV0;
  milestones: MilestoneProgressV0;
};

// =============================================================================
// Risk Types
// =============================================================================

/**
 * Flat metadata for risks.
 */
export type RiskMetadataV0 = Record<string, string | number | boolean | null>;

/**
 * A detected project risk.
 */
export type ProjectRiskV0 = {
  /** Unique identifier */
  id: string;
  /** Type of risk */
  riskType: ProjectRiskTypeV0;
  /** Severity level */
  severity: RiskSeverityV0;
  /** Human-readable description */
  description: string;
  /** Affected entity IDs (tasks, epics, people) */
  affectedEntityIds: string[];
  /** When the risk was first detected (ISO string) */
  detectedAt: string;
  /** Optional metadata */
  metadata?: RiskMetadataV0;
};

// =============================================================================
// Resource Health Types
// =============================================================================

/**
 * Individual team member's allocation to this project.
 */
export type MemberAllocationV0 = {
  /** Person ID */
  personId: string;
  /** Person name (for display) */
  personName: string;
  /** Allocation percentage to this project (0.0–1.0) */
  allocationPct: number;
  /** Tasks assigned to this person */
  assignedTaskCount: number;
  /** Completed tasks by this person */
  completedTaskCount: number;
};

/**
 * Resource bottleneck detection.
 */
export type ResourceBottleneckV0 = {
  /** Person ID who is bottlenecked */
  personId: string;
  /** Person name */
  personName: string;
  /** Number of blocked/waiting tasks */
  blockedTaskCount: number;
  /** Reason for bottleneck */
  reason: string;
};

/**
 * Resource health metrics for the project.
 */
export type ResourceHealthV0 = {
  /** Total team members allocated */
  teamSize: number;
  /**
   * Average utilization across team (0.0–1.0).
   * 1.0 = fully utilized, >1.0 = overallocated.
   */
  utilizationPct: number;
  /** Team member allocations */
  memberAllocations: MemberAllocationV0[];
  /** Detected bottlenecks */
  bottlenecks: ResourceBottleneckV0[];
  /** Number of unassigned tasks */
  unassignedTaskCount: number;
};

// =============================================================================
// Momentum Types
// =============================================================================

/**
 * Velocity delta compared to previous period.
 */
export type VelocityDeltaV0 = {
  /** Change in tasks per week */
  tasksPerWeekDelta: number;
  /** Change in points per week */
  pointsPerWeekDelta: number | null;
  /** Percentage change (positive = improvement) */
  percentChange: number;
};

/**
 * Project momentum analysis.
 */
export type ProjectMomentumV0 = {
  /** Overall trend direction */
  trendDirection: TrendDirectionV0;
  /** Velocity change from previous period */
  velocityDelta: VelocityDeltaV0;
  /** Number of consecutive weeks of improvement/decline */
  streakWeeks: number;
  /** Confidence in trend assessment (0.0–1.0) */
  confidence: number;
};

// =============================================================================
// Blocker Types
// =============================================================================

/**
 * Blocker type enum.
 */
export const BLOCKER_TYPE_V0 = [
  "DEPENDENCY",
  "RESOURCE",
  "EXTERNAL",
  "TECHNICAL",
  "APPROVAL",
] as const;

export type BlockerTypeV0 = (typeof BLOCKER_TYPE_V0)[number];

/**
 * A project blocker.
 */
export type ProjectBlockerV0 = {
  /** Unique identifier */
  id: string;
  /** Type of blocker */
  blockerType: BlockerTypeV0;
  /** Human-readable description */
  description: string;
  /** Task IDs blocked by this */
  blockedTaskIds: string[];
  /** How long this has been blocking (days) */
  daysBlocked: number;
  /** Estimated impact on timeline (days delay) */
  estimatedImpactDays: number | null;
};

// =============================================================================
// Summary Types
// =============================================================================

/**
 * Project health summary.
 */
export type ProjectHealthSummaryV0 = {
  /** Overall health assessment */
  overallHealth: OverallHealthV0;
  /** Health score (0.0–1.0) */
  healthScore: number;
  /** Number of active risks */
  activeRiskCount: number;
  /** Number of active blockers */
  activeBlockerCount: number;
  /** Days until next milestone (null if none) */
  daysToNextMilestone: number | null;
  /** Whether project is on track for deadline */
  onTrack: boolean;
};

// =============================================================================
// Main Snapshot Type
// =============================================================================

/**
 * Project Health Snapshot v0 — Full project health state for Loopbrain consumption.
 *
 * This is a machine contract, not a UI model.
 * UI may display snapshot data but never reinterpret or reformat it.
 */
export type ProjectHealthSnapshotV0 = {
  /** Schema version for forward compatibility */
  schemaVersion: "v0";
  /** ISO timestamp when snapshot was generated */
  generatedAt: string;
  /** Workspace this project belongs to */
  workspaceId: string;
  /** Project ID */
  projectId: string;
  /** Project name (for display) */
  projectName: string;
  /** Project status */
  projectStatus: "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

  /** Velocity metrics */
  velocity: ProjectVelocityV0;
  /** Progress breakdown */
  progress: ProjectProgressV0;
  /** Detected risks */
  risks: ProjectRiskV0[];
  /** Resource health */
  resourceHealth: ResourceHealthV0;
  /** Momentum analysis */
  momentum: ProjectMomentumV0;
  /** Active blockers */
  blockers: ProjectBlockerV0[];
  /** Summary assessment */
  summary: ProjectHealthSummaryV0;
};

// =============================================================================
// Evidence Paths
// =============================================================================

/**
 * Canonical evidence paths for ProjectHealthSnapshotV0.
 * Used by Loopbrain to cite specific data in answers.
 */
export const PROJECT_HEALTH_PATHS_V0 = {
  /** Velocity metrics */
  VELOCITY: "velocity",
  COMPLETION_RATE: "velocity.completionRate",
  THROUGHPUT: "velocity.throughput",
  CYCLE_TIME: "velocity.cycleTime",

  /** Progress metrics */
  PROGRESS: "progress",
  TASK_PROGRESS: "progress.tasks",
  EPIC_PROGRESS: "progress.epics",
  MILESTONE_PROGRESS: "progress.milestones",

  /** Risk metrics */
  RISKS: "risks",
  RISK_COUNT: "risks.length",

  /** Resource health */
  RESOURCE_HEALTH: "resourceHealth",
  UTILIZATION: "resourceHealth.utilizationPct",
  BOTTLENECKS: "resourceHealth.bottlenecks",

  /** Momentum */
  MOMENTUM: "momentum",
  TREND_DIRECTION: "momentum.trendDirection",

  /** Blockers */
  BLOCKERS: "blockers",
  BLOCKER_COUNT: "blockers.length",

  /** Summary */
  SUMMARY: "summary",
  OVERALL_HEALTH: "summary.overallHealth",
  HEALTH_SCORE: "summary.healthScore",
  ON_TRACK: "summary.onTrack",
} as const;

// =============================================================================
// Blocker Constants
// =============================================================================

/**
 * Project health blockers that prevent Loopbrain from answering.
 * These map to conditions where health data is insufficient.
 */
export const PROJECT_HEALTH_BLOCKERS_V0 = [
  "NO_TASKS",
  "NO_ACTIVITY",
  "INSUFFICIENT_HISTORY",
] as const;

export type ProjectHealthBlockerV0 = (typeof PROJECT_HEALTH_BLOCKERS_V0)[number];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get risks by severity level.
 */
export function getRisksBySeverity(
  snapshot: ProjectHealthSnapshotV0,
  severity: RiskSeverityV0
): ProjectRiskV0[] {
  return snapshot.risks.filter((risk) => risk.severity === severity);
}

/**
 * Get risks by type.
 */
export function getRisksByType(
  snapshot: ProjectHealthSnapshotV0,
  riskType: ProjectRiskTypeV0
): ProjectRiskV0[] {
  return snapshot.risks.filter((risk) => risk.riskType === riskType);
}

/**
 * Check if project has critical issues.
 */
export function hasCriticalIssues(snapshot: ProjectHealthSnapshotV0): boolean {
  return (
    snapshot.summary.overallHealth === "CRITICAL" ||
    snapshot.risks.some((r) => r.severity === "CRITICAL") ||
    snapshot.blockers.length > 0
  );
}

/**
 * Calculate completion percentage for tasks.
 */
export function getTaskCompletionPct(snapshot: ProjectHealthSnapshotV0): number {
  const { total, completed } = snapshot.progress.tasks;
  if (total === 0) return 0;
  return completed / total;
}

// =============================================================================
// TODO: Validation
// =============================================================================

// TODO: Add JSON Schema validation similar to validateAnswerEnvelope.ts
// - Validate schemaVersion is "v0"
// - Validate all percentages are 0.0–1.0
// - Validate risk severity is valid enum
// - Validate dates are ISO format
// - Validate task counts are non-negative and sum correctly
