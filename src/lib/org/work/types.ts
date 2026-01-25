/**
 * Phase H: Work Intake Types
 * 
 * Shared types for work request handling and feasibility resolution.
 */

import type { CapacityConfidence } from "@/lib/org/capacity/resolveEffectiveCapacity";
import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";
import { CAPACITY_DATA_ASSUMPTIONS } from "@/lib/org/capacity/thresholds";
import type { ExplainabilityBlock } from "@/lib/org/explainability/types";

// ============================================================================
// Response Metadata (consistent with Phase G)
// ============================================================================

export const WORK_EVIDENCE_VERSION = 1;
export const WORK_SEMANTICS_VERSION = 1;

export const WORK_REQUEST_DATA_ASSUMPTIONS = [
  "tshirtToHoursConversion",
  "desiredWindowAsUTC",
] as const;

/**
 * Work feasibility assumptions include Phase G capacity assumptions
 * since feasibility depends on effective capacity resolution.
 */
export const WORK_FEASIBILITY_DATA_ASSUMPTIONS = [
  ...WORK_REQUEST_DATA_ASSUMPTIONS,
  // Phase G capacity assumptions (inherited)
  ...CAPACITY_DATA_ASSUMPTIONS,
  // Work-specific assumptions
  "candidatesFromDomainOrWorkspace",
  "roleMatchFromAssignmentOrPosition",
  "capacityGapClampedToZero",
  "deterministicCandidateRanking",
] as const;

export type WorkResponseMeta = {
  generatedAt: string;
  assumptionsId: string;
  dataAssumptions: readonly string[];
  evidenceVersion: number;
  semanticsVersion: number;
};

export function getWorkRequestResponseMeta(): WorkResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    assumptionsId: `work-request:v${WORK_SEMANTICS_VERSION}`,
    dataAssumptions: WORK_REQUEST_DATA_ASSUMPTIONS,
    evidenceVersion: WORK_EVIDENCE_VERSION,
    semanticsVersion: WORK_SEMANTICS_VERSION,
  };
}

export function getWorkFeasibilityResponseMeta(): WorkResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    assumptionsId: `work-feasibility:v${WORK_SEMANTICS_VERSION}`,
    dataAssumptions: WORK_FEASIBILITY_DATA_ASSUMPTIONS,
    evidenceVersion: WORK_EVIDENCE_VERSION,
    semanticsVersion: WORK_SEMANTICS_VERSION,
  };
}

// ============================================================================
// Effective Capacity Summary (subset for display)
// ============================================================================

export type EffectiveCapacitySummary = {
  weeklyCapacityHours: number;
  contractedHoursForWindow: number;
  availabilityFactor: number;
  allocatedHours: number;
  effectiveAvailableHours: number;
};

// ============================================================================
// Work Feasibility Result
// ============================================================================

export type WorkFeasibilityResult = {
  workRequestId: string;
  timeWindow: { start: string; end: string };
  estimatedEffortHours: number;
  thresholdsUsed: {
    minCapacityForWork: number;
    overallocationThreshold: number;
  };

  feasibility: {
    canStaff: boolean;
    capacityGapHours: number; // Always >= 0
    explanation: string[];
    confidence: CapacityConfidence;
  };

  recommendation: {
    action: "PROCEED" | "REASSIGN" | "DELAY" | "REQUEST_SUPPORT";
    explanation: string[];
  };

  /** Phase P: Impact-driven recommendation context */
  recommendationContext?: {
    impactSeverity?: "HIGH" | "MEDIUM" | "LOW" | null;
    hasBlockedImpacts?: boolean;
    requiresEscalation?: boolean;
  };

  candidates: Array<{
    personId: string;
    personName: string;
    rank: number;
    whyChosen: string[];
    effectiveCapacitySummary: EffectiveCapacitySummary;
    confidence: CapacityConfidence;
  }>;

  evidence: {
    candidateCount: number;
    viableCount: number;
    blockingIssues: OrgIssueMetadata[];
    /** Pool metrics for issue derivation */
    poolMetrics: {
      totalBeforeRoleFilter: number;
      matchingRoleCount: number;
      roleFilterApplied: boolean;
      requiredRoleType: string | null;
    };
    /** Explicit dependency chain for traceability */
    derivedFrom: {
      capacitySemanticsVersion: number;
      workSemanticsVersion: number;
    };
  };

  /** Escalation contacts when REQUEST_SUPPORT (Phase I integration) */
  escalationContacts: {
    domainKey: string | null;
    primary: { personId: string; personName: string } | null;
    escalation: Array<{ personId: string; personName: string }>;
    firstAvailable: { personId: string; personName: string } | null;
    whyTheseContacts: string[];
  } | null;

  /** Phase J: Impact summary for quick display */
  impactSummary: {
    affectedCount: number;
    highestImpactSeverity: "LOW" | "MEDIUM" | "HIGH" | null;
    hasDecisionDomainImpact: boolean;
  } | null;

  /** Phase K: Alignment summary for staffing insight */
  alignmentSummary: {
    alignedCount: number;
    partialCount: number;
    misalignedCount: number;
    unknownCount: number;
    allMisaligned: boolean;
    workTags: string[];
    workTagsSource: "EXPLICIT" | "INFERRED";
  } | null;

  responseMeta: WorkResponseMeta;
  /** Phase O: Structured explainability */
  explainability?: ExplainabilityBlock;
};

// ============================================================================
// Candidate Resolution
// ============================================================================

export type WorkCandidate = {
  personId: string;
  personName: string;
  teamId: string | null;
  departmentId: string | null;
  roleType: string | null;
  seniorityLevel: string | null;
  effectiveCapacity: EffectiveCapacitySummary | null;
  confidence: CapacityConfidence | null;
  isViable: boolean;
  proximity: "SAME_TEAM" | "SAME_DEPARTMENT" | "OTHER";
  whyChosen: string[];
  // Phase K: Role alignment
  alignment: "ALIGNED" | "PARTIAL" | "MISALIGNED" | "UNKNOWN" | null;
  alignmentExplanation: string[];
};

export type CandidatePoolResult = {
  candidates: WorkCandidate[];
  explanation: string[];
  /** Structured metadata for issue derivation */
  poolMetrics: {
    /** Total candidates before role filtering */
    totalBeforeRoleFilter: number;
    /** Candidates matching required role (if filter applied) */
    matchingRoleCount: number;
    /** Whether role filter was applied */
    roleFilterApplied: boolean;
    /** Required role type (if specified) */
    requiredRoleType: string | null;
  };
};
