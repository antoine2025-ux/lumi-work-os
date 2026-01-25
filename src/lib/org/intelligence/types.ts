/**
 * Intelligence Landing Types
 *
 * Response metadata, versions, and assumptions for the Intelligence landing page.
 * Follows the same pattern as Phase G/H/I/J/K for consistency.
 *
 * Phase S snapshot types are in snapshotTypes.ts to prevent circular dependencies.
 * Re-exported here for backward compatibility.
 */

import type { OrgIssueMetadata, CapacityThresholds } from "@/lib/org/deriveIssues";

// ============================================================================
// Re-export Phase S Snapshot Types (for backward compatibility)
// ============================================================================

export {
  // Constants
  ORG_SNAPSHOT_SCHEMA_VERSION,
  SNAPSHOT_DATA_ASSUMPTIONS,
  // Severity
  type Severity,
  type LandingSeverity,
  mapSeverityToLanding,
  // Entity
  type EntityRef,
  createEntityRef,
  // Issues
  type ExplainableIssue,
  type OwnershipConflictMeta,
  type AggregatedIssueMeta,
  // Signals
  type StructureSignals,
  type OwnershipSource,
  type EntityOwnershipState,
  type OwnershipSignals,
  type PeopleSignals,
  type CapacitySignals,
  // Snapshot
  type SnapshotMeta,
  type OrgIntelligenceSnapshot,
  type SnapshotMetaDTO,
  type OrgIntelligenceSnapshotDTO,
  type SnapshotOptions,
  serializeSnapshot,
  createSnapshotMeta,
} from "./snapshotTypes";

// ============================================================================
// Evidence + Semantics Versions
// ============================================================================

/**
 * Evidence version — shape/schema of evidence payloads (fields)
 * Increment when evidence payload structure changes
 */
export const INTELLIGENCE_EVIDENCE_VERSION = 1;

/**
 * Semantics version — meaning of computations/assumptions
 * Increment when computation logic changes
 */
export const INTELLIGENCE_SEMANTICS_VERSION = 1;

// ============================================================================
// Data Assumptions
// ============================================================================

/**
 * Data assumptions used in Intelligence landing computations.
 * These are explicitly declared for LoopBrain consistency and debugging.
 *
 * For Phase S snapshot assumptions, see SNAPSHOT_DATA_ASSUMPTIONS in snapshotTypes.ts.
 */
export const INTELLIGENCE_DATA_ASSUMPTIONS = [
  "issuesAreCanonicalSource",
  "timeWindowUtcIso",
  "thresholdsFromWorkspaceSettings",
  "sortedDeterministically",
  "readOnlyLinksToFixSurfaces",
] as const;

// ============================================================================
// Response Meta
// ============================================================================

/**
 * Response metadata for Intelligence landing API
 */
export type IntelligenceResponseMeta = {
  generatedAt: string;
  assumptionsId: "intelligence-landing:v1";
  dataAssumptions: readonly string[];
  evidenceVersion: number;
  semanticsVersion: number;
};

/**
 * Generate response metadata for Intelligence landing API
 */
export function getIntelligenceResponseMeta(): IntelligenceResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    assumptionsId: "intelligence-landing:v1",
    dataAssumptions: INTELLIGENCE_DATA_ASSUMPTIONS,
    evidenceVersion: INTELLIGENCE_EVIDENCE_VERSION,
    semanticsVersion: INTELLIGENCE_SEMANTICS_VERSION,
  };
}

// ============================================================================
// Issue Window
// ============================================================================

export type IssueWindowLabel = "Next 7 days" | "Custom range";

export type SerializedIssueWindow = {
  start: string;
  end: string;
  label: IssueWindowLabel;
};

// ============================================================================
// Section Summaries
// ============================================================================

/**
 * Base section summary for landing page.
 *
 * SEVERITY MAPPING:
 * - critical: Phase S "critical" issues (mapped via mapSeverityToLanding)
 * - warning: Phase S "warning" issues
 *
 * Note: Landing uses "critical" count but Phase S uses "error" internally.
 * Use mapSeverityToLanding() when aggregating.
 */
export type SectionSummary = {
  total: number;
  critical: number; // severity === "error" (Phase S "critical" maps here)
  warning: number;  // severity === "warning"
};

export type OwnershipSummary = SectionSummary & {
  conflicts: number;
  unowned: number;
};

export type CapacitySummary = SectionSummary & {
  overallocated: number;
  lowCapacity: number;
  noCover: number;
};

export type WorkSummary = SectionSummary & {
  notStaffable: number;
  capacityGap: number;
};

export type ResponsibilitySummary = SectionSummary & {
  unknown: number;
  misaligned: number;
};

export type DecisionsSummary = SectionSummary & {
  missing: number;
  unavailable: number;
};

export type ImpactSummary = SectionSummary & {
  undefined: number;
  highImpact: number;
};

export type IntelligenceSummaries = {
  ownership: OwnershipSummary;
  capacity: CapacitySummary;
  work: WorkSummary;
  responsibility: ResponsibilitySummary;
  decisions: DecisionsSummary;
  impact: ImpactSummary;
};

// ============================================================================
// Phase P: Work Risk Summary
// ============================================================================

export type WorkRiskSummary = {
  highImpactOpenCount: number; // OPEN work requests with HIGH severity impacts
  blockedImpactCount: number; // OPEN work requests with BLOCKED impacts
  totalAtRisk: number; // Total OPEN work requests with any HIGH/BLOCKED impacts
};

// ============================================================================
// Landing Result
// ============================================================================

export type IntelligenceLandingResult = {
  issueWindow: SerializedIssueWindow;
  thresholds: CapacityThresholds & { issueWindowDays: number };
  /** Top 10 issues for landing inbox (sorted by severity desc, issueKey asc) */
  topIssues: OrgIssueMetadata[];
  /** All issues for drilldowns (sorted deterministically) */
  allIssues: OrgIssueMetadata[];
  summaries: IntelligenceSummaries;
  /** Phase P: Work risk summary for high-impact work at risk */
  workRiskSummary?: WorkRiskSummary;
  /** Phase P: Map of workRequestId -> impact summary for Impact column in drilldowns */
  impactSummariesByWorkRequestId?: Record<string, import("@/lib/org/impact/types").WorkImpactSummary>;
  responseMeta: IntelligenceResponseMeta;
};
