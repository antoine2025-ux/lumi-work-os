/**
 * Proactive Insight v0 — Proactive Intelligence Contract
 *
 * Machine contract for Loopbrain's autonomous intelligence recommendations.
 * Enables proactive surfacing of issues, opportunities, and recommendations
 * before users ask. Integrates with OrgHealthSignal, OrgIntelligenceSnapshot,
 * and all other Loopbrain contracts.
 *
 * Invariants:
 * - Insights are sorted by priority (CRITICAL first, then by confidence)
 * - Confidence is 0.0–1.0 (higher = more certain)
 * - Expiration times are in ISO 8601 format
 * - Dismissed insights are tracked but not re-surfaced
 * - Each insight has exactly one trigger and one category
 *
 * Evidence paths for Loopbrain reasoning:
 * - insights.{category}.count
 * - insights.byPriority.{priority}
 * - insights.byTrigger.{trigger}
 * - recommendations.{insightId}.confidence
 * - batch.freshness
 *
 * @example
 * ```typescript
 * const insight: ProactiveInsightV0 = {
 *   id: "insight_123",
 *   trigger: "THRESHOLD_BREACH",
 *   category: "CAPACITY",
 *   priority: "HIGH",
 *   title: "Team capacity at risk",
 *   description: "Platform team is at 95% utilization with 3 members on leave next week.",
 *   confidence: 0.87,
 *   recommendations: [
 *     { id: "rec_1", action: "Reassign 2 tasks to Backend team", deepLink: "/org/work", confidence: 0.8 },
 *   ],
 *   evidence: [...],
 *   createdAt: "2026-02-09T10:00:00Z",
 *   expiresAt: "2026-02-16T10:00:00Z",
 *   status: "ACTIVE",
 * };
 * ```
 */

// =============================================================================
// Insight Trigger Enum
// =============================================================================

/**
 * What triggered the insight to be generated.
 * Append-only; meanings must never change.
 */
export const INSIGHT_TRIGGER_V0 = [
  "THRESHOLD_BREACH",
  "PATTERN_DETECTED",
  "ANOMALY_DETECTED",
  "DEADLINE_APPROACHING",
  "DEPENDENCY_RISK",
  "COVERAGE_GAP",
  "TREND_CHANGE",
  "SCHEDULED_CHECK",
  "USER_ACTION",
  "EXTERNAL_EVENT",
] as const;

export type InsightTriggerV0 = (typeof INSIGHT_TRIGGER_V0)[number];

// =============================================================================
// Insight Priority Enum
// =============================================================================

/**
 * Priority levels for insights.
 * Determines surfacing order and urgency.
 */
export const INSIGHT_PRIORITY_V0 = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
] as const;

export type InsightPriorityV0 = (typeof INSIGHT_PRIORITY_V0)[number];

// =============================================================================
// Insight Category Enum
// =============================================================================

/**
 * Categories of insights.
 * Maps to different domains of organizational intelligence.
 */
export const INSIGHT_CATEGORY_V0 = [
  "CAPACITY",
  "WORKLOAD",
  "CALENDAR",
  "PROJECT",
  "ORG_HEALTH",
  "OWNERSHIP",
  "DECISION",
  "DEPENDENCY",
  "SKILL_GAP",
  "PROCESS",
  "COMMUNICATION",
  "ONBOARDING",
  "DAILY_BRIEFING",
  "MEETING_PREP",
] as const;

export type InsightCategoryV0 = (typeof INSIGHT_CATEGORY_V0)[number];

// =============================================================================
// Insight Status Enum
// =============================================================================

/**
 * Lifecycle status of an insight.
 */
export const INSIGHT_STATUS_V0 = [
  "ACTIVE",
  "ACKNOWLEDGED",
  "DISMISSED",
  "RESOLVED",
  "EXPIRED",
  "SUPERSEDED",
] as const;

export type InsightStatusV0 = (typeof INSIGHT_STATUS_V0)[number];

// =============================================================================
// Recommendation Types
// =============================================================================

/**
 * Action type for recommendations.
 */
export const RECOMMENDATION_ACTION_TYPE_V0 = [
  "REASSIGN",
  "DELEGATE",
  "ESCALATE",
  "DEFER",
  "CANCEL",
  "SPLIT",
  "MERGE",
  "NOTIFY",
  "REVIEW",
  "CONFIGURE",
  "HIRE",
  "TRAIN",
  "CREATE",
] as const;

export type RecommendationActionTypeV0 = (typeof RECOMMENDATION_ACTION_TYPE_V0)[number];

/**
 * A recommended action for an insight.
 */
export type RecommendationV0 = {
  /** Unique identifier */
  id: string;
  /** Human-readable action description */
  action: string;
  /** Type of action */
  actionType: RecommendationActionTypeV0;
  /** Deep link to relevant page/action */
  deepLink?: string;
  /**
   * Confidence in this recommendation (0.0–1.0).
   * Higher = more confident this action will help.
   */
  confidence: number;
  /** Estimated effort (hours, null if unknown) */
  estimatedEffortHours?: number | null;
  /** Estimated impact description */
  estimatedImpact?: string;
  /** Affected entity IDs */
  affectedEntityIds?: string[];
};

// =============================================================================
// Evidence Types
// =============================================================================

/**
 * Evidence value types (shallow, JSON-serializable).
 * Mirrors EvidenceValue from answer-envelope.v0.ts.
 */
export type InsightEvidenceValueV0 =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | Record<string, string | number | boolean | null>;

/**
 * A piece of evidence supporting an insight.
 */
export type InsightEvidenceV0 = {
  /** Path to the evidence in source data */
  path: string;
  /** The evidence value */
  value: InsightEvidenceValueV0;
  /** Source contract/snapshot this came from */
  source?: string;
};

// =============================================================================
// Affected Entity Types
// =============================================================================

/**
 * Entity type affected by an insight.
 */
export const AFFECTED_ENTITY_TYPE_V0 = [
  "PERSON",
  "TEAM",
  "DEPARTMENT",
  "PROJECT",
  "TASK",
  "WORK_REQUEST",
  "DECISION_DOMAIN",
  "SKILL",
] as const;

export type AffectedEntityTypeV0 = (typeof AFFECTED_ENTITY_TYPE_V0)[number];

/**
 * An entity affected by an insight.
 */
export type AffectedEntityV0 = {
  /** Entity type */
  entityType: AffectedEntityTypeV0;
  /** Entity ID */
  entityId: string;
  /** Entity label (for display) */
  label: string;
  /** How this entity is affected */
  impact?: string;
};

// =============================================================================
// Dismissal Types
// =============================================================================

/**
 * Reason for dismissing an insight.
 */
export const DISMISSAL_REASON_V0 = [
  "NOT_RELEVANT",
  "ALREADY_ADDRESSED",
  "FALSE_POSITIVE",
  "WILL_ADDRESS_LATER",
  "ACCEPTED_RISK",
  "OTHER",
] as const;

export type DismissalReasonV0 = (typeof DISMISSAL_REASON_V0)[number];

/**
 * Dismissal tracking for an insight.
 */
export type InsightDismissalV0 = {
  /** When dismissed (ISO 8601) */
  dismissedAt: string;
  /** Who dismissed it (user ID) */
  dismissedBy: string;
  /** Reason for dismissal */
  reason: DismissalReasonV0;
  /** Optional note */
  note?: string;
  /** Don't show similar insights for this duration (hours, null = default) */
  suppressDurationHours?: number | null;
};

// =============================================================================
// Main Insight Type
// =============================================================================

/**
 * A proactive insight generated by Loopbrain.
 */
export type ProactiveInsightV0 = {
  /** Unique identifier */
  id: string;

  /** What triggered this insight */
  trigger: InsightTriggerV0;
  /** Category of insight */
  category: InsightCategoryV0;
  /** Priority level */
  priority: InsightPriorityV0;

  /** Short title */
  title: string;
  /** Detailed description */
  description: string;

  /**
   * Confidence in this insight (0.0–1.0).
   * Higher = more confident the insight is accurate.
   */
  confidence: number;

  /** Recommended actions */
  recommendations: RecommendationV0[];

  /** Supporting evidence */
  evidence: InsightEvidenceV0[];

  /** Affected entities */
  affectedEntities: AffectedEntityV0[];

  /** When insight was created (ISO 8601) */
  createdAt: string;
  /** When insight expires (ISO 8601, null = never) */
  expiresAt: string | null;
  /** Current status */
  status: InsightStatusV0;

  /** Dismissal info (if dismissed) */
  dismissal?: InsightDismissalV0;

  /** ID of insight this supersedes (if any) */
  supersedesId?: string;

  /** Workspace-specific metadata */
  metadata?: Record<string, string | number | boolean | null>;
};

// =============================================================================
// Batch Types
// =============================================================================

/**
 * Freshness assessment for an insight batch.
 */
export const BATCH_FRESHNESS_V0 = [
  "FRESH",
  "RECENT",
  "STALE",
  "EXPIRED",
] as const;

export type BatchFreshnessV0 = (typeof BATCH_FRESHNESS_V0)[number];

/**
 * Summary statistics for an insight batch.
 */
export type InsightBatchSummaryV0 = {
  /** Total insights in batch */
  totalCount: number;
  /** Active insights */
  activeCount: number;
  /** Counts by priority */
  byPriority: Partial<Record<InsightPriorityV0, number>>;
  /** Counts by category */
  byCategory: Partial<Record<InsightCategoryV0, number>>;
  /** Counts by trigger */
  byTrigger: Partial<Record<InsightTriggerV0, number>>;
  /** Most critical insight */
  mostCritical: ProactiveInsightV0 | null;
  /** Average confidence */
  avgConfidence: number;
};

/**
 * A batch of proactive insights.
 */
export type InsightBatchV0 = {
  /** Schema version */
  schemaVersion: "v0";
  /** When batch was generated (ISO 8601) */
  generatedAt: string;
  /** Workspace ID */
  workspaceId: string;

  /** All insights in this batch */
  insights: ProactiveInsightV0[];

  /** Batch summary */
  summary: InsightBatchSummaryV0;

  /** Freshness assessment */
  freshness: BatchFreshnessV0;

  /** Time until batch is considered stale (seconds) */
  ttlSeconds: number;

  /** Source snapshots used to generate insights */
  sourceSnapshots?: Array<{
    type: string;
    generatedAt: string;
  }>;
};

// =============================================================================
// Person Insight Summary
// =============================================================================

/**
 * Insight summary for a specific person.
 */
export type PersonInsightSummaryV0 = {
  /** Person ID */
  personId: string;
  /** Person name */
  personName: string;
  /** Active insights affecting this person */
  activeInsightCount: number;
  /** Critical insights */
  criticalCount: number;
  /** High priority insights */
  highCount: number;
  /** Top insight (most urgent) */
  topInsight: ProactiveInsightV0 | null;
  /** Categories with insights */
  affectedCategories: InsightCategoryV0[];
};

// =============================================================================
// Evidence Paths
// =============================================================================

/**
 * Canonical evidence paths for InsightBatchV0.
 * Used by Loopbrain to cite specific data in answers.
 */
export const PROACTIVE_INSIGHT_PATHS_V0 = {
  /** Insight collection paths */
  INSIGHTS: "insights",
  INSIGHT_COUNT: "summary.totalCount",
  ACTIVE_COUNT: "summary.activeCount",

  /** Priority paths */
  BY_PRIORITY: "summary.byPriority",
  CRITICAL_COUNT: "summary.byPriority.CRITICAL",
  HIGH_COUNT: "summary.byPriority.HIGH",

  /** Category paths */
  BY_CATEGORY: "summary.byCategory",
  CAPACITY_INSIGHTS: "summary.byCategory.CAPACITY",
  WORKLOAD_INSIGHTS: "summary.byCategory.WORKLOAD",
  PROJECT_INSIGHTS: "summary.byCategory.PROJECT",

  /** Trigger paths */
  BY_TRIGGER: "summary.byTrigger",

  /** Top insight */
  MOST_CRITICAL: "summary.mostCritical",
  AVG_CONFIDENCE: "summary.avgConfidence",

  /** Freshness */
  FRESHNESS: "freshness",
  TTL: "ttlSeconds",
} as const;

// =============================================================================
// Priority Ordering
// =============================================================================

/**
 * Priority ordering for sorting insights.
 * Lower index = higher priority.
 */
export const INSIGHT_PRIORITY_ORDER_V0: Record<InsightPriorityV0, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

// =============================================================================
// Default TTL Values
// =============================================================================

/**
 * Default TTL values for different insight categories (in seconds).
 */
export const INSIGHT_TTL_DEFAULTS_V0: Record<InsightCategoryV0, number> = {
  CAPACITY: 3600, // 1 hour
  WORKLOAD: 3600, // 1 hour
  CALENDAR: 1800, // 30 minutes
  PROJECT: 7200, // 2 hours
  ORG_HEALTH: 14400, // 4 hours
  OWNERSHIP: 86400, // 24 hours
  DECISION: 86400, // 24 hours
  DEPENDENCY: 3600, // 1 hour
  SKILL_GAP: 86400, // 24 hours
  PROCESS: 86400, // 24 hours
  COMMUNICATION: 86400, // 24 hours
  ONBOARDING: 86400 * 30, // 30 days
  DAILY_BRIEFING: 86400, // 24 hours
  MEETING_PREP: 86400, // 24 hours
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get insights by priority.
 */
export function getInsightsByPriority(
  batch: InsightBatchV0,
  priority: InsightPriorityV0
): ProactiveInsightV0[] {
  return batch.insights.filter((i) => i.priority === priority && i.status === "ACTIVE");
}

/**
 * Get insights by category.
 */
export function getInsightsByCategory(
  batch: InsightBatchV0,
  category: InsightCategoryV0
): ProactiveInsightV0[] {
  return batch.insights.filter((i) => i.category === category && i.status === "ACTIVE");
}

/**
 * Get insights by trigger.
 */
export function getInsightsByTrigger(
  batch: InsightBatchV0,
  trigger: InsightTriggerV0
): ProactiveInsightV0[] {
  return batch.insights.filter((i) => i.trigger === trigger && i.status === "ACTIVE");
}

/**
 * Get active insights only.
 */
export function getActiveInsights(batch: InsightBatchV0): ProactiveInsightV0[] {
  return batch.insights.filter((i) => i.status === "ACTIVE");
}

/**
 * Get critical insights that need immediate attention.
 */
export function getCriticalInsights(batch: InsightBatchV0): ProactiveInsightV0[] {
  return batch.insights.filter(
    (i) => i.priority === "CRITICAL" && i.status === "ACTIVE"
  );
}

/**
 * Sort insights by priority and confidence.
 */
export function sortInsightsByUrgency(
  insights: ProactiveInsightV0[]
): ProactiveInsightV0[] {
  return [...insights].sort((a, b) => {
    // First by priority
    const priorityDiff =
      INSIGHT_PRIORITY_ORDER_V0[a.priority] - INSIGHT_PRIORITY_ORDER_V0[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    // Then by confidence (higher first)
    return b.confidence - a.confidence;
  });
}

/**
 * Check if an insight has expired.
 */
export function isInsightExpired(insight: ProactiveInsightV0): boolean {
  if (!insight.expiresAt) return false;
  return new Date(insight.expiresAt) < new Date();
}

/**
 * Get insights affecting a specific entity.
 */
export function getInsightsForEntity(
  batch: InsightBatchV0,
  entityType: AffectedEntityTypeV0,
  entityId: string
): ProactiveInsightV0[] {
  return batch.insights.filter(
    (i) =>
      i.status === "ACTIVE" &&
      i.affectedEntities.some(
        (e) => e.entityType === entityType && e.entityId === entityId
      )
  );
}

/**
 * Get high-confidence recommendations from an insight.
 */
export function getHighConfidenceRecommendations(
  insight: ProactiveInsightV0,
  minConfidence: number = 0.7
): RecommendationV0[] {
  return insight.recommendations.filter((r) => r.confidence >= minConfidence);
}

/**
 * Calculate batch freshness based on generation time.
 */
export function calculateBatchFreshness(
  generatedAt: string,
  ttlSeconds: number
): BatchFreshnessV0 {
  const ageMs = Date.now() - new Date(generatedAt).getTime();
  const ageSeconds = ageMs / 1000;

  if (ageSeconds < ttlSeconds * 0.25) return "FRESH";
  if (ageSeconds < ttlSeconds * 0.75) return "RECENT";
  if (ageSeconds < ttlSeconds) return "STALE";
  return "EXPIRED";
}

// =============================================================================
// TODO: Validation
// =============================================================================

// TODO: Add JSON Schema validation similar to validateAnswerEnvelope.ts
// - Validate schemaVersion is "v0"
// - Validate all timestamps are ISO 8601 format
// - Validate confidence is 0.0–1.0
// - Validate priority, category, trigger are valid enums
// - Validate recommendations have valid action types
// - Validate affected entities have valid entity types
// - Validate dismissal reasons are valid enums
