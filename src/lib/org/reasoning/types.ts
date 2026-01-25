/**
 * Phase R: Org Reasoning Layer Types
 *
 * Types for the reasoning/recommendations layer.
 * Consumes Phase S OrgIntelligenceSnapshotDTO only.
 *
 * See docs/org/reasoning-rules.md for contracts and policies.
 */

import type { EntityRef, OrgSnapshotIssueCode } from "../intelligence/snapshotTypes";

// ============================================================================
// Recommendation Codes
// ============================================================================

/**
 * Canonical recommendation codes.
 * Type-safe allowlist - no typos allowed.
 *
 * See docs/org/reasoning-rules.md § Recommendation Codes for descriptions.
 */
export const ORG_RECOMMENDATION_CODES = [
  "REC_ASSIGN_TEAM_OWNER",
  "REC_ASSIGN_DEPT_OWNER",
  "REC_RESOLVE_OWNERSHIP_CONFLICTS",
  "REC_FIX_MANAGER_GAPS",
  "REC_REBALANCE_MANAGER_LOAD",
  "REC_ASSIGN_TEAMS_TO_DEPARTMENTS",
  "REC_REVIEW_EMPTY_DEPARTMENTS",
  "REC_NAME_MISSING_ENTITIES",
  "REC_ENABLE_CAPACITY_MODELING",
] as const;

export type RecommendationCode = (typeof ORG_RECOMMENDATION_CODES)[number];

/**
 * Set for runtime validation of recommendation codes.
 * Properly typed to only accept RecommendationCode values.
 */
export const ORG_RECOMMENDATION_CODES_SET: ReadonlySet<RecommendationCode> = new Set(
  ORG_RECOMMENDATION_CODES
);

// ============================================================================
// Core Types
// ============================================================================

/**
 * Recommendation severity levels.
 * Maps to UI presentation (badges, colors).
 */
export type RecommendationSeverity = "info" | "warning" | "critical";

/**
 * Recommendation categories.
 * Determines grouping and sort priority.
 * See docs/org/reasoning-rules.md § Category Priority.
 */
export type RecommendationCategory = "ownership" | "people" | "structure" | "capacity";

/**
 * Action surfaces - where the fix is implemented.
 * Must map to real UI pages.
 */
export type ActionSurface = "ownership" | "people" | "structure" | "team" | "department";

// ============================================================================
// Evidence
// ============================================================================

/**
 * Input snapshot metadata for traceability.
 * Copied from the snapshot that produced this recommendation.
 */
export type InputSnapshotMeta = {
  schemaVersion: number;
  semanticsVersion: number;
  assumptionsId: string;
};

/**
 * Evidence linking recommendation to snapshot data.
 *
 * INVARIANT: At least one of issueCodes or entities must be non-empty.
 * Enforced by createRecommendation() helper.
 */
export type RecommendationEvidence = {
  /** Snapshot issue codes that triggered this recommendation */
  issueCodes: OrgSnapshotIssueCode[];
  /** Preview entities (up to REASONING_PREVIEW_COUNT) */
  entities: EntityRef[];
  /** Metadata for aggregation and traceability */
  meta: {
    /** Total count if aggregated (more than preview shows) */
    count?: number;
    /** Number of entities included in preview (for UI to know if list is complete) */
    previewCount?: number;
    /** True if count > previewCount (signals UI should show "and N more") */
    aggregated?: boolean;
    /** Copied from input snapshot for traceability */
    snapshotMeta: InputSnapshotMeta;
  };
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Action to resolve a recommendation.
 *
 * INVARIANTS (enforced by validateAction):
 * - href must start with /
 * - href must not contain http://, https://, javascript:
 * - surface must be a valid ActionSurface
 */
export type RecommendationAction = {
  /** Button/link label */
  label: string;
  /** Internal path only (starts with /) */
  href: string;
  /** Which fix surface this navigates to */
  surface: ActionSurface;
  /** If true, this is the primary CTA */
  primary?: boolean;
  /** If true, action is shown but not clickable (e.g., permission denied) */
  disabled?: boolean;
  /** Reason action is disabled (tooltip text) */
  disabledReason?: string;
};

// ============================================================================
// Recommendation
// ============================================================================

/**
 * A single recommendation from the reasoning engine.
 *
 * Use createRecommendation() to construct - it enforces all invariants.
 */
export type OrgRecommendation = {
  /** Type-safe code from ORG_RECOMMENDATION_CODES */
  code: RecommendationCode;
  /** Determines UI presentation */
  severity: RecommendationSeverity;
  /** Grouping and sort priority */
  category: RecommendationCategory;
  /** Short headline */
  title: string;
  /** Longer explanation */
  summary: string;
  /** Links to snapshot data that triggered this */
  evidence: RecommendationEvidence;
  /** Actions user can take */
  actions: RecommendationAction[];
  /** Deterministic priority within category (lower = higher priority) */
  rank: number;
  /**
   * Optional metadata for UI hints and extensibility.
   * Examples: { showInOverview: true, experimental: true, requiresSetup: true }
   */
  meta?: Record<string, unknown>;
};

// ============================================================================
// Result Types
// ============================================================================

/**
 * Reasoning result metadata.
 *
 * Includes full traceability chain for LoopBrain/audit:
 * - Which snapshot was consumed
 * - Which reasoning version produced this
 */
export type ReasoningMeta = {
  /** ISO timestamp - only nondeterministic field */
  computedAt: string;
  /** DTO shape version */
  reasoningSchemaVersion: number;
  /** Reasoning behavior version */
  reasoningSemanticsVersion: number;
  /** Snapshot API version consumed (e.g., "v2") */
  snapshotApiVersion: string;
  /** Traceability for LoopBrain/audit */
  inputSnapshotMeta: InputSnapshotMeta;
};

/**
 * Summary counts by category.
 */
export type ReasoningSummaries = {
  /** Count per category */
  byCategory: Record<RecommendationCategory, number>;
  /** Count of critical severity recommendations */
  criticalCount: number;
  /** Total recommendation count (before limit) */
  total: number;
};

/**
 * Complete reasoning result.
 */
export type OrgReasoningResult = {
  /** Recommendations (may be limited by limit param) */
  recommendations: OrgRecommendation[];
  /** Summaries of full recommendation set (before limit) */
  summaries: ReasoningSummaries;
  /** Metadata including traceability */
  _meta: ReasoningMeta;
};

// ============================================================================
// Re-exports for convenience
// ============================================================================

export type { EntityRef, OrgSnapshotIssueCode };
