/**
 * Phase I: Decision Authority Types
 * 
 * Types for decision authority resolution and response metadata.
 * Consistent with Phase G/H patterns.
 */

import type { CapacityConfidence } from "@/lib/org/capacity/resolveEffectiveCapacity";
import { SEMANTICS_VERSION as CAPACITY_SEMANTICS_VERSION } from "@/lib/org/capacity/thresholds";
import type { ExplainabilityBlock } from "@/lib/org/explainability/types";

// ============================================================================
// Response Metadata (consistent with Phase G/H)
// ============================================================================

export const DECISION_EVIDENCE_VERSION = 1;
export const DECISION_SEMANTICS_VERSION = 1;

export const DECISION_DATA_ASSUMPTIONS = [
  "roleResolutionViaAssignmentThenTitle",
  "firstMatchByPersonId",
  "availabilityFromPhaseG",
] as const;

export type DecisionResponseMeta = {
  generatedAt: string;
  assumptionsId: string;
  dataAssumptions: readonly string[];
  evidenceVersion: number;
  semanticsVersion: number;
};

export function getDecisionResponseMeta(): DecisionResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    assumptionsId: `decision-authority:v${DECISION_SEMANTICS_VERSION}`,
    dataAssumptions: DECISION_DATA_ASSUMPTIONS,
    evidenceVersion: DECISION_EVIDENCE_VERSION,
    semanticsVersion: DECISION_SEMANTICS_VERSION,
  };
}

// ============================================================================
// Availability Status
// ============================================================================

export type AvailabilityStatus = {
  isAvailable: boolean;
  availabilityFactor: number;
  effectiveAvailableHours: number;
};

// ============================================================================
// Resolved Authority Types
// ============================================================================

export type ResolvedPerson = {
  personId: string;
  personName: string;
  configuredAs: "PERSON" | "ROLE";
  resolvedAs: "PERSON"; // Always resolves to a person
  roleType: string | null; // Original roleType if configured as ROLE
  availability: AvailabilityStatus | null; // if timeWindow provided
};

export type ResolvedEscalationStep = ResolvedPerson & {
  stepOrder: number;
};

export type FirstAvailable = {
  personId: string;
  personName: string;
  stepOrder: number | null; // null = primary
  whyChosen: string[];
};

// ============================================================================
// Evidence Types
// ============================================================================

export type UnresolvableRole = {
  configuredFor: "PRIMARY" | "ESCALATION";
  stepOrder: number | null;
  roleType: string;
};

export type DecisionAuthorityEvidence = {
  domainKey: string;
  domainName: string;
  hasAuthority: boolean;
  primaryConfiguredAs: "PERSON" | "ROLE" | null;
  escalationCount: number;
  roleResolutionUsed: boolean;
  /** Roles that could not be resolved to a person */
  unresolvableRoles: UnresolvableRole[];
  derivedFrom: {
    capacitySemanticsVersion: number;
    decisionSemanticsVersion: number;
  };
};

// ============================================================================
// Main Resolution Type
// ============================================================================

export type DecisionAuthorityResolution = {
  domainKey: string;
  domainName: string;

  primary: ResolvedPerson | null;

  escalation: ResolvedEscalationStep[];

  firstAvailable: FirstAvailable | null;

  confidence: CapacityConfidence;
  evidence: DecisionAuthorityEvidence;
  responseMeta: DecisionResponseMeta;
  /** Phase O: Structured explainability */
  explainability?: ExplainabilityBlock;
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build evidence object for decision authority resolution
 */
export function buildDecisionEvidence(params: {
  domainKey: string;
  domainName: string;
  hasAuthority: boolean;
  primaryConfiguredAs: "PERSON" | "ROLE" | null;
  escalationCount: number;
  roleResolutionUsed: boolean;
  unresolvableRoles?: UnresolvableRole[];
}): DecisionAuthorityEvidence {
  return {
    ...params,
    unresolvableRoles: params.unresolvableRoles ?? [],
    derivedFrom: {
      capacitySemanticsVersion: CAPACITY_SEMANTICS_VERSION,
      decisionSemanticsVersion: DECISION_SEMANTICS_VERSION,
    },
  };
}

/**
 * Compute confidence for decision authority resolution
 * 
 * Rules:
 * - If all configured as PERSON: completeness = 1.0
 * - If any configured as ROLE: completeness = 0.8
 */
export function computeDecisionConfidence(params: {
  hasAuthority: boolean;
  roleResolutionUsed: boolean;
  availabilityChecked: boolean;
}): CapacityConfidence {
  const { hasAuthority, roleResolutionUsed, availabilityChecked } = params;

  if (!hasAuthority) {
    return {
      score: 0,
      factors: { completeness: 0, consistency: 1, freshness: 1 },
      explanation: ["No decision authority configured for this domain"],
    };
  }

  const explanation: string[] = [];
  let completeness = 1.0;

  if (roleResolutionUsed) {
    completeness = 0.8;
    explanation.push("Resolved via roleType fallback, not explicitly assigned person.");
  } else {
    explanation.push("Primary configured as explicit person.");
  }

  if (availabilityChecked) {
    explanation.push("Availability verified against Phase G capacity data.");
  }

  const score = completeness * 0.9 + 0.1; // Baseline + completeness factor

  return {
    score,
    factors: {
      completeness,
      consistency: 1,
      freshness: availabilityChecked ? 0.9 : 1,
    },
    explanation,
  };
}
