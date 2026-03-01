/**
 * Workload Analysis v0 — Workload Distribution Contract
 *
 * Machine contract for Loopbrain reasoning about workload distribution,
 * capacity comparison, and overload detection. Integrates with Task, Todo,
 * WorkRequest, WorkAllocation, and CapacityContract models.
 *
 * Invariants:
 * - All percentages are 0.0–1.0 (not 0–100)
 * - Hours are weekly unless otherwise specified
 * - Signals are sorted by severity (CRITICAL first)
 * - Task counts must be non-negative
 *
 * Evidence paths for Loopbrain reasoning:
 * - taskLoad.byStatus.{status}.count
 * - taskLoad.byPriority.{priority}.count
 * - capacityComparison.allocatedPct
 * - capacityComparison.utilizationPct
 * - signals.{signalType}.severity
 * - temporalDistribution.weeklySchedule
 *
 * @example
 * ```typescript
 * const snapshot: WorkloadAnalysisSnapshotV0 = {
 *   schemaVersion: "v0",
 *   generatedAt: new Date().toISOString(),
 *   workspaceId: "ws_123",
 *   personId: "person_456",
 *   personName: "Alice Smith",
 *   taskLoad: { ... },
 *   projectLoad: [...],
 *   todoLoad: { ... },
 *   capacityComparison: { ... },
 *   temporalDistribution: { ... },
 *   signals: [...],
 *   summary: { ... },
 * };
 * ```
 */

// =============================================================================
// Task Status Enum (mirrors Prisma ProjectTaskStatus)
// =============================================================================

/**
 * Task status values.
 * Must match ProjectTaskStatus enum in Prisma schema.
 */
export const TASK_STATUS_V0 = [
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "BLOCKED",
] as const;

export type TaskStatusV0 = (typeof TASK_STATUS_V0)[number];

// =============================================================================
// Priority Enum (mirrors Prisma Priority)
// =============================================================================

/**
 * Priority values.
 * Must match Priority enum in Prisma schema.
 */
export const PRIORITY_V0 = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export type PriorityV0 = (typeof PRIORITY_V0)[number];

// =============================================================================
// Todo Status Enum (mirrors Prisma TodoStatus)
// =============================================================================

/**
 * Todo status values.
 * Must match TodoStatus enum in Prisma schema.
 */
export const TODO_STATUS_V0 = ["OPEN", "DONE"] as const;

export type TodoStatusV0 = (typeof TODO_STATUS_V0)[number];

// =============================================================================
// Workload Signal Type Enum
// =============================================================================

/**
 * Types of workload signals detected by Loopbrain.
 * Append-only; meanings must never change.
 */
export const WORKLOAD_SIGNAL_TYPE_V0 = [
  "OVERLOAD",
  "SEVERE_OVERLOAD",
  "UNDERUTILIZED",
  "DEADLINE_CLUSTER",
  "BLOCKED_WORK",
  "UNBALANCED_DISTRIBUTION",
  "PRIORITY_INVERSION",
  "STALE_TASKS",
  "CONTEXT_SWITCHING",
  "DEPENDENCY_BOTTLENECK",
] as const;

export type WorkloadSignalTypeV0 = (typeof WORKLOAD_SIGNAL_TYPE_V0)[number];

// =============================================================================
// Signal Severity Enum
// =============================================================================

/**
 * Signal severity levels.
 */
export const SIGNAL_SEVERITY_V0 = ["INFO", "WARNING", "HIGH", "CRITICAL"] as const;

export type SignalSeverityV0 = (typeof SIGNAL_SEVERITY_V0)[number];

// =============================================================================
// Utilization Status Enum
// =============================================================================

/**
 * Utilization status assessment.
 */
export const UTILIZATION_STATUS_V0 = [
  "UNDERUTILIZED",
  "HEALTHY",
  "HIGH",
  "OVERLOADED",
  "SEVERELY_OVERLOADED",
] as const;

export type UtilizationStatusV0 = (typeof UTILIZATION_STATUS_V0)[number];

// =============================================================================
// Task Load Types
// =============================================================================

/**
 * Count and hours for a task grouping.
 */
export type TaskCountV0 = {
  /** Number of tasks */
  count: number;
  /** Total story points (null if not using points) */
  points: number | null;
  /** Estimated hours (null if not estimated) */
  estimatedHours: number | null;
};

/**
 * Task load breakdown by status.
 */
export type TaskLoadByStatusV0 = Partial<Record<TaskStatusV0, TaskCountV0>>;

/**
 * Task load breakdown by priority.
 */
export type TaskLoadByPriorityV0 = Partial<Record<PriorityV0, TaskCountV0>>;

/**
 * Overdue task metrics.
 */
export type OverdueTasksV0 = {
  /** Number of overdue tasks */
  count: number;
  /** Total days overdue (sum across all tasks) */
  totalDaysOverdue: number;
  /** Most overdue task days */
  maxDaysOverdue: number;
  /** Task IDs that are overdue */
  taskIds: string[];
};

/**
 * Task load analysis for a person.
 */
export type TaskLoadV0 = {
  /** Total tasks assigned */
  totalCount: number;
  /** Total story points assigned */
  totalPoints: number | null;
  /** Total estimated hours */
  totalEstimatedHours: number | null;
  /** Breakdown by status */
  byStatus: TaskLoadByStatusV0;
  /** Breakdown by priority */
  byPriority: TaskLoadByPriorityV0;
  /** Overdue task metrics */
  overdue: OverdueTasksV0;
  /** Tasks due this week */
  dueThisWeek: number;
  /** Tasks due today */
  dueToday: number;
};

// =============================================================================
// Project Load Types
// =============================================================================

/**
 * Workload for a single project.
 */
export type ProjectLoadEntryV0 = {
  /** Project ID */
  projectId: string;
  /** Project name */
  projectName: string;
  /** Allocation percentage to this project (0.0–1.0) */
  allocationPct: number;
  /** Tasks assigned in this project */
  taskCount: number;
  /** Tasks in progress in this project */
  inProgressCount: number;
  /** Blocked tasks in this project */
  blockedCount: number;
  /** Estimated hours for this project */
  estimatedHours: number | null;
};

/**
 * Project load summary.
 */
export type ProjectLoadSummaryV0 = {
  /** Total projects person is allocated to */
  projectCount: number;
  /** Total allocation across all projects (can exceed 1.0) */
  totalAllocationPct: number;
  /** Is person spread across too many projects */
  isOverSpread: boolean;
  /** Project with highest allocation */
  primaryProjectId: string | null;
};

// =============================================================================
// Todo Load Types
// =============================================================================

/**
 * Todo load analysis.
 */
export type TodoLoadV0 = {
  /** Total todos assigned */
  totalCount: number;
  /** Open todos */
  openCount: number;
  /** Completed todos */
  doneCount: number;
  /** Breakdown by priority */
  byPriority: Partial<Record<"LOW" | "MEDIUM" | "HIGH", number>>;
  /** Todos due today */
  dueToday: number;
  /** Todos due this week */
  dueThisWeek: number;
  /** Overdue todos */
  overdueCount: number;
};

// =============================================================================
// Work Request Load Types
// =============================================================================

/**
 * Work request load analysis.
 */
export type WorkRequestLoadV0 = {
  /** Total work requests assigned/relevant */
  totalCount: number;
  /** Open work requests */
  openCount: number;
  /** Closed work requests */
  closedCount: number;
  /** Total estimated hours from work requests */
  totalEstimatedHours: number;
  /** Breakdown by priority */
  byPriority: Partial<Record<"P0" | "P1" | "P2" | "P3", number>>;
};

// =============================================================================
// Capacity Comparison Types
// =============================================================================

/**
 * Capacity comparison analysis.
 */
export type CapacityComparisonV0 = {
  /** Contracted weekly capacity (hours) */
  contractedHours: number;
  /**
   * Allocated hours (from WorkAllocation).
   * Sum of all allocations × contracted hours.
   */
  allocatedHours: number;
  /**
   * Estimated hours (from task estimates).
   * Sum of estimated hours for assigned tasks.
   */
  estimatedHours: number;
  /**
   * Allocation percentage (0.0–1.0+).
   * allocatedHours / contractedHours.
   */
  allocatedPct: number;
  /**
   * Utilization percentage (0.0–1.0+).
   * estimatedHours / contractedHours.
   */
  utilizationPct: number;
  /** Utilization status assessment */
  utilizationStatus: UtilizationStatusV0;
  /** Hours of headroom (negative if overloaded) */
  headroomHours: number;
  /** Can take on more work */
  hasCapacity: boolean;
};

// =============================================================================
// Temporal Distribution Types
// =============================================================================

/**
 * Daily workload distribution.
 */
export type DailyWorkloadV0 = {
  /** Date (ISO 8601 date string) */
  date: string;
  /** Day of week (0=Sunday, 6=Saturday) */
  dayOfWeek: number;
  /** Tasks due on this day */
  tasksDue: number;
  /** Todos due on this day */
  todosDue: number;
  /** Estimated hours of work due */
  estimatedHours: number;
  /** Is this day overloaded */
  isOverloaded: boolean;
};

/**
 * Weekly schedule analysis.
 */
export type WeeklyScheduleV0 = {
  /** Start of week (ISO 8601 date) */
  weekStart: string;
  /** End of week (ISO 8601 date) */
  weekEnd: string;
  /** Daily breakdown */
  days: DailyWorkloadV0[];
  /** Total estimated hours for the week */
  totalEstimatedHours: number;
  /** Peak day (most work due) */
  peakDay: string | null;
  /** Is workload evenly distributed */
  isBalanced: boolean;
};

/**
 * Temporal distribution analysis.
 */
export type TemporalDistributionV0 = {
  /** Current week schedule */
  currentWeek: WeeklyScheduleV0;
  /** Next week schedule */
  nextWeek: WeeklyScheduleV0 | null;
  /** Deadline clusters (multiple deadlines on same day) */
  deadlineClusters: Array<{
    date: string;
    count: number;
    taskIds: string[];
  }>;
};

// =============================================================================
// Workload Signal Types
// =============================================================================

/**
 * A detected workload signal.
 */
export type WorkloadSignalV0 = {
  /** Unique identifier */
  id: string;
  /** Signal type */
  signalType: WorkloadSignalTypeV0;
  /** Severity level */
  severity: SignalSeverityV0;
  /** Human-readable description */
  description: string;
  /** Affected entity IDs (tasks, projects, etc.) */
  affectedEntityIds: string[];
  /** Quantitative value (e.g., overload percentage, days blocked) */
  value: number | null;
  /** Threshold that was breached (if applicable) */
  threshold: number | null;
  /** When signal was detected (ISO 8601) */
  detectedAt: string;
};

/**
 * Signal summary statistics.
 */
export type SignalSummaryV0 = {
  /** Total signals detected */
  totalCount: number;
  /** Counts by signal type */
  byType: Partial<Record<WorkloadSignalTypeV0, number>>;
  /** Counts by severity */
  bySeverity: { info: number; warning: number; high: number; critical: number };
  /** Most severe signal */
  mostSevere: WorkloadSignalV0 | null;
};

// =============================================================================
// Summary Types
// =============================================================================

/**
 * Overall workload assessment.
 */
export const WORKLOAD_ASSESSMENT_V0 = [
  "LIGHT",
  "BALANCED",
  "HEAVY",
  "OVERLOADED",
  "CRITICAL",
] as const;

export type WorkloadAssessmentV0 = (typeof WORKLOAD_ASSESSMENT_V0)[number];

/**
 * Workload analysis summary.
 */
export type WorkloadAnalysisSummaryV0 = {
  /** Overall workload assessment */
  assessment: WorkloadAssessmentV0;
  /** Workload score (0.0–1.0, where 0.5 is balanced) */
  workloadScore: number;
  /** Primary concern (if any) */
  primaryConcern: string | null;
  /** Recommended action */
  recommendedAction: string | null;
  /** Is immediate attention needed */
  needsAttention: boolean;
};

// =============================================================================
// Main Snapshot Type
// =============================================================================

/**
 * Workload Analysis Snapshot v0 — Full workload state for Loopbrain consumption.
 *
 * This is a machine contract, not a UI model.
 * UI may display snapshot data but never reinterpret or reformat it.
 */
export type WorkloadAnalysisSnapshotV0 = {
  /** Schema version for forward compatibility */
  schemaVersion: "v0";
  /** ISO timestamp when snapshot was generated */
  generatedAt: string;
  /** Workspace this snapshot belongs to */
  workspaceId: string;
  /** Person ID this analysis is for */
  personId: string;
  /** Person name (for display) */
  personName: string;

  /** Task load analysis */
  taskLoad: TaskLoadV0;

  /** Project load breakdown */
  projectLoad: ProjectLoadEntryV0[];
  /** Project load summary */
  projectLoadSummary: ProjectLoadSummaryV0;

  /** Todo load analysis */
  todoLoad: TodoLoadV0;

  /** Work request load (if applicable) */
  workRequestLoad: WorkRequestLoadV0 | null;

  /** Capacity comparison */
  capacityComparison: CapacityComparisonV0;

  /** Temporal distribution */
  temporalDistribution: TemporalDistributionV0;

  /** Detected signals */
  signals: WorkloadSignalV0[];
  /** Signal summary */
  signalSummary: SignalSummaryV0;

  /** Overall summary */
  summary: WorkloadAnalysisSummaryV0;
};

// =============================================================================
// Team Workload Snapshot
// =============================================================================

/**
 * Team member workload summary.
 */
export type TeamMemberWorkloadV0 = {
  personId: string;
  personName: string;
  assessment: WorkloadAssessmentV0;
  utilizationPct: number;
  taskCount: number;
  blockedCount: number;
  hasCapacity: boolean;
};

/**
 * Team-level workload snapshot.
 */
export type TeamWorkloadSnapshotV0 = {
  /** Schema version */
  schemaVersion: "v0";
  /** ISO timestamp */
  generatedAt: string;
  /** Workspace ID */
  workspaceId: string;
  /** Team ID */
  teamId: string;
  /** Team name */
  teamName: string;

  /** Individual member workloads */
  members: TeamMemberWorkloadV0[];

  /** Team-level metrics */
  teamMetrics: {
    /** Total team members */
    totalMembers: number;
    /** Members with capacity */
    membersWithCapacity: number;
    /** Members overloaded */
    membersOverloaded: number;
    /** Average utilization */
    avgUtilizationPct: number;
    /** Total tasks across team */
    totalTasks: number;
    /** Total blocked tasks */
    totalBlocked: number;
    /** Is team balanced */
    isBalanced: boolean;
  };
};

// =============================================================================
// Evidence Paths
// =============================================================================

/**
 * Canonical evidence paths for WorkloadAnalysisSnapshotV0.
 * Used by Loopbrain to cite specific data in answers.
 */
export const WORKLOAD_ANALYSIS_PATHS_V0 = {
  /** Task load paths */
  TASK_LOAD: "taskLoad",
  TASK_TOTAL: "taskLoad.totalCount",
  TASK_BY_STATUS: "taskLoad.byStatus",
  TASK_BY_PRIORITY: "taskLoad.byPriority",
  TASK_OVERDUE: "taskLoad.overdue",
  TASK_DUE_TODAY: "taskLoad.dueToday",

  /** Project load paths */
  PROJECT_LOAD: "projectLoad",
  PROJECT_SUMMARY: "projectLoadSummary",
  PROJECT_COUNT: "projectLoadSummary.projectCount",
  TOTAL_ALLOCATION: "projectLoadSummary.totalAllocationPct",

  /** Todo load paths */
  TODO_LOAD: "todoLoad",
  TODO_OPEN: "todoLoad.openCount",
  TODO_OVERDUE: "todoLoad.overdueCount",

  /** Capacity paths */
  CAPACITY: "capacityComparison",
  ALLOCATED_PCT: "capacityComparison.allocatedPct",
  UTILIZATION_PCT: "capacityComparison.utilizationPct",
  UTILIZATION_STATUS: "capacityComparison.utilizationStatus",
  HEADROOM: "capacityComparison.headroomHours",
  HAS_CAPACITY: "capacityComparison.hasCapacity",

  /** Temporal paths */
  TEMPORAL: "temporalDistribution",
  CURRENT_WEEK: "temporalDistribution.currentWeek",
  DEADLINE_CLUSTERS: "temporalDistribution.deadlineClusters",

  /** Signal paths */
  SIGNALS: "signals",
  SIGNAL_SUMMARY: "signalSummary",
  SIGNAL_COUNT: "signalSummary.totalCount",
  MOST_SEVERE: "signalSummary.mostSevere",

  /** Summary paths */
  SUMMARY: "summary",
  ASSESSMENT: "summary.assessment",
  WORKLOAD_SCORE: "summary.workloadScore",
  NEEDS_ATTENTION: "summary.needsAttention",
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get signals by type.
 */
export function getSignalsByType(
  snapshot: WorkloadAnalysisSnapshotV0,
  signalType: WorkloadSignalTypeV0
): WorkloadSignalV0[] {
  return snapshot.signals.filter((s) => s.signalType === signalType);
}

/**
 * Get signals by severity.
 */
export function getSignalsBySeverity(
  snapshot: WorkloadAnalysisSnapshotV0,
  severity: SignalSeverityV0
): WorkloadSignalV0[] {
  return snapshot.signals.filter((s) => s.severity === severity);
}

/**
 * Check if person is overloaded.
 */
export function isOverloaded(snapshot: WorkloadAnalysisSnapshotV0): boolean {
  return (
    snapshot.capacityComparison.utilizationStatus === "OVERLOADED" ||
    snapshot.capacityComparison.utilizationStatus === "SEVERELY_OVERLOADED"
  );
}

/**
 * Check if person has capacity for new work.
 */
export function hasCapacityForNewWork(
  snapshot: WorkloadAnalysisSnapshotV0,
  requiredHours: number
): boolean {
  return snapshot.capacityComparison.headroomHours >= requiredHours;
}

/**
 * Get total active work items (tasks + todos).
 */
export function getTotalActiveItems(snapshot: WorkloadAnalysisSnapshotV0): number {
  const activeTasks =
    (snapshot.taskLoad.byStatus.TODO?.count ?? 0) +
    (snapshot.taskLoad.byStatus.IN_PROGRESS?.count ?? 0) +
    (snapshot.taskLoad.byStatus.IN_REVIEW?.count ?? 0) +
    (snapshot.taskLoad.byStatus.BLOCKED?.count ?? 0);
  const activeTodos = snapshot.todoLoad.openCount;
  return activeTasks + activeTodos;
}

/**
 * Get critical signals that need immediate attention.
 */
export function getCriticalSignals(
  snapshot: WorkloadAnalysisSnapshotV0
): WorkloadSignalV0[] {
  return snapshot.signals.filter((s) => s.severity === "CRITICAL");
}

// =============================================================================
// TODO [BACKLOG]: Validation
// =============================================================================

// TODO [BACKLOG]: Add JSON Schema validation similar to validateAnswerEnvelope.ts
// - Validate schemaVersion is "v0"
// - Validate all percentages are 0.0–1.0 (or allow >1.0 for overallocation)
// - Validate task counts are non-negative
// - Validate signal severity is valid enum
// - Validate dates are ISO format
