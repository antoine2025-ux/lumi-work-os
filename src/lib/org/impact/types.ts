/**
 * Phase J: Impact & Dependency Graph Types
 *
 * Types for impact resolution and response metadata.
 * Consistent with Phase G/H/I patterns.
 */

import type {
  ImpactSubjectType as PrismaImpactSubjectType,
  ImpactType as PrismaImpactType,
  ImpactSeverity as PrismaImpactSeverity,
} from "@prisma/client";

// Re-export Prisma enums for convenience
export type ImpactSubjectType = PrismaImpactSubjectType;
export type ImpactType = PrismaImpactType;
export type ImpactSeverity = PrismaImpactSeverity;

// ============================================================================
// ImpactType Semantic Definitions (Locked)
// ============================================================================
// BLOCKED: This work cannot complete unless the subject acts or changes
// DEPENDENT: The subject's work or outcome depends on this work
// INFORM: Subject should be informed if this changes
// CONSULT: Subject should be consulted before changing this

// ============================================================================
// Response Metadata (consistent with Phases G/H/I)
// ============================================================================

export const IMPACT_EVIDENCE_VERSION = 1;
export const IMPACT_SEMANTICS_VERSION = 1;

export const IMPACT_DATA_ASSUMPTIONS = [
  "labelHydratedAtResolveTime",
  "explicitOverridesInferredForSameSubject",
  "inferenceRule:domain-team",
  "inferenceRule:domain-dept",
  "inferenceRule:decision-domain",
  "inferenceRule:required-role",
] as const;

export type ImpactResponseMeta = {
  generatedAt: string;
  assumptionsId: string; // "work-impact:v1"
  dataAssumptions: readonly string[];
  evidenceVersion: number;
  semanticsVersion: number;
};

export function getImpactResponseMeta(): ImpactResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    assumptionsId: `work-impact:v${IMPACT_SEMANTICS_VERSION}`,
    dataAssumptions: IMPACT_DATA_ASSUMPTIONS,
    evidenceVersion: IMPACT_EVIDENCE_VERSION,
    semanticsVersion: IMPACT_SEMANTICS_VERSION,
  };
}

// ============================================================================
// Impact Key Helpers
// ============================================================================

/**
 * Compute stable key for deduplication and reconciliation.
 * Format: ${workRequestId}:${subjectType}:${subjectIdentity}:${impactType}
 */
export function computeImpactKey(
  workRequestId: string,
  subjectType: ImpactSubjectType,
  subjectIdentity: string, // subjectId OR roleType OR domainKey
  impactType: ImpactType
): string {
  return `${workRequestId}:${subjectType}:${subjectIdentity}:${impactType}`;
}

/**
 * Compute subject identity from impact fields.
 * Used for impactKey generation and explicit-overrides-inferred matching.
 */
export function getSubjectIdentity(impact: {
  subjectType: ImpactSubjectType;
  subjectId?: string | null;
  roleType?: string | null;
  domainKey?: string | null;
}): string {
  switch (impact.subjectType) {
    case "ROLE":
      return impact.roleType ?? "unknown";
    case "DECISION_DOMAIN":
      return impact.domainKey ?? "unknown";
    default:
      return impact.subjectId ?? "unknown";
  }
}

/**
 * Generate a subject match key for explicit-overrides-inferred deduplication.
 * Format: ${subjectType}:${subjectIdentity}
 */
export function getSubjectMatchKey(impact: {
  subjectType: ImpactSubjectType;
  subjectId?: string | null;
  roleType?: string | null;
  domainKey?: string | null;
}): string {
  return `${impact.subjectType}:${getSubjectIdentity(impact)}`;
}

// ============================================================================
// Confidence Types
// ============================================================================

export type ImpactConfidence = {
  score: number; // 0–1
  factors: {
    explicitness: number; // 1.0 for explicit, 0.7 for inferred
    completeness: number; // 1.0 if all identity fields resolved
    consistency: number; // 1.0 (reserved for future cross-validation)
  };
  explanation: string[];
};

export function buildExplicitConfidence(): ImpactConfidence {
  return {
    score: 1.0,
    factors: {
      explicitness: 1.0,
      completeness: 1.0,
      consistency: 1.0,
    },
    explanation: ["Explicitly declared impact"],
  };
}

export function buildInferredConfidence(
  ruleId: string,
  ruleDescription: string
): ImpactConfidence {
  return {
    score: 0.7,
    factors: {
      explicitness: 0.7,
      completeness: 1.0,
      consistency: 1.0,
    },
    explanation: [`Inferred from rule: ${ruleId} (${ruleDescription})`],
  };
}

// ============================================================================
// Resolved Impact Types
// ============================================================================

export type ResolvedImpact = {
  impactKey: string; // Stable key for React/reconciliation
  subjectType: ImpactSubjectType;
  subjectId: string | null;
  subjectLabel: string; // Hydrated at resolve time (NOT from DB)
  impactType: ImpactType;
  severity: ImpactSeverity;
  explanation: string;
  source: "EXPLICIT" | "INFERRED";
  confidence: ImpactConfidence;
  inferenceRule?: string; // Rule ID if inferred
  // For explicit impacts, include the DB record ID for deletion
  explicitImpactId?: string;
};

export type WorkImpactEvidence = {
  workRequestId: string;
  explicitImpactIds: string[];
  inferenceRulesApplied: string[];
  suppressedInferredCount: number;
  derivedFrom: {
    impactSemanticsVersion: number;
  };
};

export type WorkImpactSummary = {
  totalCount: number;
  explicitCount: number;
  inferredCount: number;
  highestSeverity: ImpactSeverity | null;
  affectedTeamCount: number;
  affectedDepartmentCount: number;
  affectedPersonCount: number;
  affectedRoleCount: number;
  affectedDecisionDomainCount: number;
  affectedWorkRequestCount: number;
};

import type { ExplainabilityBlock } from "@/lib/org/explainability/types";

export type WorkImpactResolution = {
  workRequestId: string;
  workRequestTitle: string;

  impacts: ResolvedImpact[];

  // Grouped for UI convenience
  bySubjectType: Partial<Record<ImpactSubjectType, ResolvedImpact[]>>;

  // Summary metrics
  summary: WorkImpactSummary;

  evidence: WorkImpactEvidence;
  responseMeta: ImpactResponseMeta;
  /** Phase O: Section-level explainability */
  explainability?: ExplainabilityBlock;
};

// ============================================================================
// Inferred Impact Type (internal use)
// ============================================================================

export type InferredImpact = {
  subjectType: ImpactSubjectType;
  subjectId: string | null;
  roleType: string | null;
  domainKey: string | null;
  impactType: ImpactType;
  severity: ImpactSeverity;
  explanation: string;
  ruleId: string;
  ruleDescription: string;
};

// ============================================================================
// Severity Ordering
// ============================================================================

const SEVERITY_ORDER: Record<ImpactSeverity, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const SUBJECT_TYPE_ORDER: Record<ImpactSubjectType, number> = {
  TEAM: 1,
  DEPARTMENT: 2,
  PERSON: 3,
  ROLE: 4,
  DECISION_DOMAIN: 5,
  WORK_REQUEST: 6,
};

/**
 * Get the highest severity from a list of severities.
 */
export function getHighestSeverity(
  severities: ImpactSeverity[]
): ImpactSeverity | null {
  if (severities.length === 0) return null;
  return severities.reduce((highest, current) =>
    SEVERITY_ORDER[current] > SEVERITY_ORDER[highest] ? current : highest
  );
}

/**
 * Sort impacts deterministically.
 * Order: severity desc → subjectType → subjectLabel → impactKey (final tie-breaker)
 */
export function sortImpacts(impacts: ResolvedImpact[]): ResolvedImpact[] {
  return [...impacts].sort((a, b) => {
    // 1. Severity descending
    const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity];
    if (severityDiff !== 0) return severityDiff;

    // 2. SubjectType ascending
    const typeDiff =
      SUBJECT_TYPE_ORDER[a.subjectType] - SUBJECT_TYPE_ORDER[b.subjectType];
    if (typeDiff !== 0) return typeDiff;

    // 3. SubjectLabel ascending
    const labelDiff = a.subjectLabel.localeCompare(b.subjectLabel);
    if (labelDiff !== 0) return labelDiff;

    // 4. ImpactKey as final tie-breaker
    return a.impactKey.localeCompare(b.impactKey);
  });
}

/**
 * Group impacts by subject type.
 */
export function groupBySubjectType(
  impacts: ResolvedImpact[]
): Partial<Record<ImpactSubjectType, ResolvedImpact[]>> {
  const grouped: Partial<Record<ImpactSubjectType, ResolvedImpact[]>> = {};

  for (const impact of impacts) {
    if (!grouped[impact.subjectType]) {
      grouped[impact.subjectType] = [];
    }
    grouped[impact.subjectType]!.push(impact);
  }

  return grouped;
}

/**
 * Compute summary metrics from resolved impacts.
 */
export function computeSummary(impacts: ResolvedImpact[]): WorkImpactSummary {
  const summary: WorkImpactSummary = {
    totalCount: impacts.length,
    explicitCount: impacts.filter((i) => i.source === "EXPLICIT").length,
    inferredCount: impacts.filter((i) => i.source === "INFERRED").length,
    highestSeverity: getHighestSeverity(impacts.map((i) => i.severity)),
    affectedTeamCount: impacts.filter((i) => i.subjectType === "TEAM").length,
    affectedDepartmentCount: impacts.filter((i) => i.subjectType === "DEPARTMENT")
      .length,
    affectedPersonCount: impacts.filter((i) => i.subjectType === "PERSON").length,
    affectedRoleCount: impacts.filter((i) => i.subjectType === "ROLE").length,
    affectedDecisionDomainCount: impacts.filter(
      (i) => i.subjectType === "DECISION_DOMAIN"
    ).length,
    affectedWorkRequestCount: impacts.filter(
      (i) => i.subjectType === "WORK_REQUEST"
    ).length,
  };

  return summary;
}
