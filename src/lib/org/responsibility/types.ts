/**
 * Phase K: Role Responsibilities Types
 *
 * Types for role alignment resolution and response metadata.
 * Consistent with Phase G/H/I/J patterns.
 */

import type { ExplainabilityBlock } from "@/lib/org/explainability/types";

// ============================================================================
// Response Metadata
// ============================================================================

export const RESPONSIBILITY_EVIDENCE_VERSION = 1;
export const RESPONSIBILITY_SEMANTICS_VERSION = 1;

export const RESPONSIBILITY_DATA_ASSUMPTIONS = [
  "profileTagsAreUnion",
  "overridesAreAdditive",
  "inferenceFromRoleTypeProfile",
  "forbiddenTakesPrecedence",
] as const;

export type ResponsibilityResponseMeta = {
  generatedAt: string;
  assumptionsId: string; // "role-alignment:v1"
  dataAssumptions: readonly string[];
  evidenceVersion: number;
  semanticsVersion: number;
};

export function getResponsibilityResponseMeta(): ResponsibilityResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    assumptionsId: `role-alignment:v${RESPONSIBILITY_SEMANTICS_VERSION}`,
    dataAssumptions: RESPONSIBILITY_DATA_ASSUMPTIONS,
    evidenceVersion: RESPONSIBILITY_EVIDENCE_VERSION,
    semanticsVersion: RESPONSIBILITY_SEMANTICS_VERSION,
  };
}

// ============================================================================
// Alignment Result Types
// ============================================================================

export type AlignmentResult = "ALIGNED" | "PARTIAL" | "MISALIGNED" | "UNKNOWN";

/**
 * Alignment score for ranking.
 * Higher is better.
 */
export const ALIGNMENT_SCORES: Record<AlignmentResult, number> = {
  ALIGNED: 3,
  PARTIAL: 2,
  MISALIGNED: 1,
  UNKNOWN: 0,
};

// ============================================================================
// Confidence Types
// ============================================================================

export type AlignmentConfidence = {
  score: number; // 0-1
  factors: {
    workTagsExplicit: number; // 1.0 if explicit, 0.6 if inferred
    profileExists: number; // 1.0 if profile exists, 0.5 if missing
    overridesConsidered: number; // 1.0 always (included in computation)
  };
  explanation: string[];
};

export function buildAlignmentConfidence(params: {
  workTagsExplicit: boolean;
  profileExists: boolean;
}): AlignmentConfidence {
  const factors = {
    workTagsExplicit: params.workTagsExplicit ? 1.0 : 0.6,
    profileExists: params.profileExists ? 1.0 : 0.5,
    overridesConsidered: 1.0,
  };

  const score = (factors.workTagsExplicit + factors.profileExists + factors.overridesConsidered) / 3;

  const explanation: string[] = [];
  if (!params.workTagsExplicit) {
    explanation.push("Work tags were inferred (not explicitly set)");
  }
  if (!params.profileExists) {
    explanation.push("No role responsibility profile found for this roleType");
  }

  return { score, factors, explanation };
}

// ============================================================================
// Evidence Types
// ============================================================================

export type AlignmentEvidence = {
  personId: string;
  roleType: string | null;
  workRequestId: string;
  workTags: string[];
  workTagsSource: "EXPLICIT" | "INFERRED";
  effectiveTags: string[];
  forbiddenTags: string[];
  overrideTags: string[];
  derivedFrom: {
    responsibilitySemanticsVersion: number;
  };
};

// ============================================================================
// Resolution Types
// ============================================================================

export type RoleAlignmentResolution = {
  personId: string;
  personName: string;
  roleType: string | null;

  alignment: AlignmentResult;

  matchedTags: string[]; // Tags person has that match work
  missingTags: string[]; // Work tags person doesn't have
  forbiddenConflicts: string[]; // Tags forbidden for person but required by work

  explanation: string[];
  confidence: AlignmentConfidence;
  evidence: AlignmentEvidence;
  responseMeta: ResponsibilityResponseMeta;
  /** Phase O: Structured explainability */
  explainability?: ExplainabilityBlock;
};

export type BatchAlignmentResolution = {
  workRequestId: string;
  workRequestTitle: string;
  workTags: string[];
  workTagsSource: "EXPLICIT" | "INFERRED";
  alignments: RoleAlignmentResolution[];
  summary: {
    alignedCount: number;
    partialCount: number;
    misalignedCount: number;
    unknownCount: number;
  };
  responseMeta: ResponsibilityResponseMeta;
};

// ============================================================================
// Tag Types (for API responses)
// ============================================================================

export type ResponsibilityTagSummary = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string | null;
  isArchived: boolean;
};

export type RoleProfileSummary = {
  id: string;
  roleType: string;
  minSeniority: string | null;
  maxSeniority: string | null;
  primaryTags: ResponsibilityTagSummary[];
  allowedTags: ResponsibilityTagSummary[];
  forbiddenTags: ResponsibilityTagSummary[];
};

// ============================================================================
// Work Tag Inference Types
// ============================================================================

export type InferredWorkTags = {
  tags: string[];
  source: "ROLE_PROFILE" | "DECISION_DOMAIN" | "TEAM_CATEGORY" | "NONE";
  explanation: string[];
};
