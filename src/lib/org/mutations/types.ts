/**
 * Mutation Response Contract Types
 *
 * Canonical types for mutation responses in the Org module.
 * Every mutation returns updated derived state so UIs can update immediately.
 *
 * Core Contract:
 * - No mutation returns only { ok: true }
 * - All mutations return data, patch, scope, affectedIssues, responseMeta
 * - affectedIssues are scoped to minimal impacted set (not full workspace)
 */

import type { OrgIssueMetadata, OrgIssue } from "@/lib/org/deriveIssues";
import type { OrgSignal } from "@/lib/org/signals";
import { deriveSignalsFromIssues } from "@/lib/org/signals";

// ============================================================================
// Resolved Issue Delta (mutation-only, never persisted)
// ============================================================================

/**
 * Resolved issue delta for mutation responses.
 * 
 * Separate from canonical OrgIssueMetadata to keep issues timeless.
 * Provides resolution narrative without polluting canonical issue shape.
 */
export type ResolvedIssueDelta = {
  issueKey: string;
  type: OrgIssue;
  entityType: "TEAM" | "DEPARTMENT" | "PERSON" | "POSITION" | "ROLE_COVERAGE" | "WORK_REQUEST" | "DECISION_DOMAIN";
  entityId: string;
  fixUrl?: string;
  explainability?: import("@/lib/org/explainability/types").ExplainabilityBlock; // Optional: preserve for audit/debugging
  resolvedBy: {
    mutationId: string;
    at: string; // ISO UTC
  };
};

// ============================================================================
// Response Metadata (matches resolver patterns)
// ============================================================================

export const MUTATION_EVIDENCE_VERSION = 1;
export const MUTATION_SEMANTICS_VERSION = 1;

export type MutationResponseMeta = {
  generatedAt: string;
  mutationId: string;
  assumptionsId: string; // e.g. "mutation:ownership-assign:v1"
  evidenceVersion: number;
  semanticsVersion: number;
};

// ============================================================================
// Mutation Scope (tells client what to update)
// ============================================================================

export type MutationScope = {
  entityType: string;
  entityId: string;
  related?: Array<{ entityType: string; entityId: string }>;
};

// ============================================================================
// Canonical Result Type
// ============================================================================

/**
 * Canonical mutation result.
 *
 * @template T - Primary mutation data (entity that was mutated)
 * @template TPatch - Domain-specific extras (updatedCoverage, updatedFeasibility, etc.)
 *
 * Invariant: affectedIssues.active must be the same scoped set used for before/after computation, never global.
 */
export type MutationResult<T, TPatch = Record<string, never>> = {
  ok: true;
  data: T;
  patch: TPatch;
  scope: MutationScope;
  affectedIssues: {
    active: OrgIssueMetadata[];
    resolved: ResolvedIssueDelta[];
  };
  affectedSignals?: OrgSignal[]; // Optional; client can derive from issues if missing
  responseMeta: MutationResponseMeta;
};

export type MutationError = {
  ok: false;
  error: string;
  hint?: string;
};

export type MutationResponse<T, TPatch = Record<string, never>> =
  | MutationResult<T, TPatch>
  | MutationError;

// ============================================================================
// Domain-Specific Patch Types (versioned independently)
// ============================================================================

/** Ownership mutations return updated coverage stats */
export type OwnershipPatch = {
  patchVersion: 1;
  updatedCoverage: {
    teams: { total: number; owned: number };
    departments: { total: number; owned: number };
  };
};

/** Capacity mutations return updated effective capacity for the person */
export type CapacityPatch = {
  patchVersion: 1;
  updatedEffectiveCapacity: {
    personId: string;
    weeklyCapacityHours: number;
    effectiveAvailableHours: number;
    utilizationPercent: number;
  };
};

/** Work mutations return updated feasibility and impact */
export type WorkPatch = {
  patchVersion: 1;
  updatedFeasibility: {
    canStaff: boolean;
    capacityGapHours: number;
    recommendation: { action: string; explanation: string[] };
  };
  updatedImpact: {
    totalCount: number;
    highestSeverity: "HIGH" | "MEDIUM" | "LOW" | null;
  };
  timeWindow: { start: string; end: string }; // Echo the window used
};

/** Empty patch for mutations with no domain-specific extras */
export type EmptyPatch = Record<string, never>;

// ============================================================================
// Server Helpers
// ============================================================================

/**
 * Build response metadata for a mutation.
 * @param assumptionsId - e.g. "mutation:ownership-assign:v1"
 */
export function buildResponseMeta(assumptionsId: string): MutationResponseMeta {
  return {
    generatedAt: new Date().toISOString(),
    mutationId: crypto.randomUUID(),
    assumptionsId,
    evidenceVersion: MUTATION_EVIDENCE_VERSION,
    semanticsVersion: MUTATION_SEMANTICS_VERSION,
  };
}

// ============================================================================
// Client Helpers
// ============================================================================

/**
 * Get signals from mutation response.
 * Uses returned signals if available, otherwise derives from active issues.
 *
 * This ensures consistent signal derivation across all surfaces.
 */
export function getSignalsFromMutationResult<T, TPatch>(
  result: MutationResult<T, TPatch>
): OrgSignal[] {
  return result.affectedSignals ?? deriveSignalsFromIssues(result.affectedIssues.active);
}

/**
 * Type guard to check if a mutation response is successful.
 */
export function isMutationSuccess<T, TPatch>(
  response: MutationResponse<T, TPatch>
): response is MutationResult<T, TPatch> {
  return response.ok === true;
}

/**
 * Type guard to check if a mutation response is an error.
 */
export function isMutationError<T, TPatch>(
  response: MutationResponse<T, TPatch>
): response is MutationError {
  return response.ok === false;
}
