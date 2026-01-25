/**
 * Phase J: Work Impact Resolver
 *
 * Produces a canonical impact graph for a WorkRequest.
 * Pure resolver that:
 * 1. Fetches explicit impacts from DB
 * 2. Computes inferred impacts (if enabled)
 * 3. Suppresses inferred where explicit exists for same subject
 * 4. Hydrates labels for all subjects
 * 5. Returns structured result with evidence
 */

import type { WorkRequest } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { WorkImpactResolution, WorkImpactEvidence } from "./types";
import {
  getSubjectMatchKey,
  getImpactResponseMeta,
  sortImpacts,
  groupBySubjectType,
  computeSummary,
  IMPACT_SEMANTICS_VERSION,
} from "./types";
import { getExplicitImpacts, hydrateExplicitImpacts, hydrateInferredImpacts } from "./read";
import { inferImpacts } from "./inferImpacts";
import type { ExplainabilityBlock, ExplainDependency } from "@/lib/org/explainability/types";

// ============================================================================
// Resolver Options
// ============================================================================

export type ResolveWorkImpactOptions = {
  /** Whether to include inferred impacts (default: true) */
  includeInferred?: boolean;
  /** Maximum depth for chaining (fixed at 1 for v1) */
  maxDepth?: number;
};

const DEFAULT_OPTIONS: Required<ResolveWorkImpactOptions> = {
  includeInferred: true,
  maxDepth: 1, // Fixed in v1
};

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve the complete impact graph for a work request.
 *
 * @param workspaceId - Workspace context
 * @param workRequest - The work request to resolve impacts for
 * @param options - Resolution options
 * @returns Complete impact resolution with evidence and metadata
 */
export async function resolveWorkImpact(
  workspaceId: string,
  workRequest: WorkRequest,
  options: ResolveWorkImpactOptions = {}
): Promise<WorkImpactResolution> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Step 1: Fetch explicit impacts from DB
  const dbImpacts = await getExplicitImpacts(workspaceId, workRequest.id);

  // Step 2: Hydrate explicit impacts with labels
  const explicitImpacts = await hydrateExplicitImpacts(workspaceId, dbImpacts);

  // Step 3: Build set of explicit subject keys for deduplication
  const explicitSubjectKeys = new Set(
    dbImpacts.map((impact) => getSubjectMatchKey(impact))
  );

  // Step 4: Compute inferred impacts (if enabled)
  let inferredImpacts: Awaited<ReturnType<typeof hydrateInferredImpacts>> = [];
  let appliedRules: string[] = [];
  let suppressedCount = 0;

  if (opts.includeInferred) {
    const inferenceResult = inferImpacts(workRequest, explicitSubjectKeys);
    appliedRules = inferenceResult.appliedRules;
    suppressedCount = inferenceResult.suppressedCount;

    // Hydrate inferred impacts with labels
    inferredImpacts = await hydrateInferredImpacts(
      workspaceId,
      workRequest.id,
      inferenceResult.inferredImpacts
    );
  }

  // Step 5: Combine and sort all impacts
  const allImpacts = sortImpacts([...explicitImpacts, ...inferredImpacts]);

  // Step 6: Build evidence
  const evidence: WorkImpactEvidence = {
    workRequestId: workRequest.id,
    explicitImpactIds: dbImpacts.map((i) => i.id),
    inferenceRulesApplied: appliedRules,
    suppressedInferredCount: suppressedCount,
    derivedFrom: {
      impactSemanticsVersion: IMPACT_SEMANTICS_VERSION,
    },
  };

  // Step 7: Build section-level explainability
  const dependsOn: ExplainDependency[] = [
    { type: "DATA", label: "Work request data", reference: workRequest.id },
    { type: "DATA", label: "Explicit impacts", reference: workRequest.id },
  ];

  if (opts.includeInferred) {
    dependsOn.push({ type: "RULE", label: "Inference rules v1" });
  }

  const why: string[] = [];
  if (evidence.explicitImpactIds.length > 0) {
    why.push(`${evidence.explicitImpactIds.length} explicit impact(s) defined`);
  }
  if (opts.includeInferred && evidence.inferenceRulesApplied.length > 0) {
    why.push(`${evidence.inferenceRulesApplied.length} inference rule(s) applied`);
    why.push("Explicit impacts override inferred impacts");
  }
  if (evidence.suppressedInferredCount > 0) {
    why.push(`${evidence.suppressedInferredCount} inferred impact(s) suppressed by explicit overrides`);
  }

  const whatChangesIt: string[] = [
    "Add or remove explicit impacts",
    "Modify work request details (title, dates, tags)",
  ];
  if (opts.includeInferred) {
    whatChangesIt.push("Disable inference to see only explicit impacts");
  }

  const explainability: ExplainabilityBlock = {
    blockId: `${workRequest.id}:impact`,
    kind: "IMPACT",
    why,
    dependsOn,
    whatChangesIt,
  };

  // Step 8: Build response
  return {
    workRequestId: workRequest.id,
    workRequestTitle: workRequest.title,
    impacts: allImpacts,
    bySubjectType: groupBySubjectType(allImpacts),
    summary: computeSummary(allImpacts),
    evidence,
    responseMeta: getImpactResponseMeta(),
    explainability,
  };
}

/**
 * Resolve impact summary only (lightweight, no label hydration).
 * Used for batch operations where only counts are needed.
 */
export async function resolveWorkImpactSummary(
  workspaceId: string,
  workRequest: WorkRequest,
  options: ResolveWorkImpactOptions = {}
): Promise<{ workRequestId: string; summary: import("./types").WorkImpactSummary; hasBlockedImpacts: boolean }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Step 1: Fetch explicit impacts from DB
  const dbImpacts = await getExplicitImpacts(workspaceId, workRequest.id);
  const explicitCount = dbImpacts.length;

  // Check for BLOCKED impacts in explicit impacts
  const hasBlockedExplicit = dbImpacts.some((impact) => impact.impactType === "BLOCKED");

  // Get highest severity from explicit impacts
  const explicitSeverities = dbImpacts.map((impact) => impact.severity);
  const highestExplicitSeverity = explicitSeverities.length > 0
    ? explicitSeverities.reduce((highest, current) => {
        const severityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return severityOrder[current] > severityOrder[highest] ? current : highest;
      })
    : null;

  // Step 2: Build set of explicit subject keys for deduplication
  const explicitSubjectKeys = new Set(
    dbImpacts.map((impact) => getSubjectMatchKey(impact))
  );

  // Step 3: Compute inferred impacts (if enabled) - no hydration needed
  let inferredCount = 0;
  let hasBlockedInferred = false;
  let highestInferredSeverity: string | null = null;
  if (opts.includeInferred) {
    const inferenceResult = inferImpacts(workRequest, explicitSubjectKeys);
    // Count inferred impacts after suppression
    inferredCount = inferenceResult.inferredImpacts.length;
    // Check for BLOCKED in inferred impacts
    hasBlockedInferred = inferenceResult.inferredImpacts.some(
      (impact) => impact.impactType === "BLOCKED"
    );
    // Get highest severity from inferred impacts
    const inferredSeverities = inferenceResult.inferredImpacts.map((impact) => impact.severity);
    highestInferredSeverity = inferredSeverities.length > 0
      ? inferredSeverities.reduce((highest, current) => {
          const severityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          return severityOrder[current] > severityOrder[highest] ? current : highest;
        })
      : null;
  }

  // Determine overall highest severity
  const severityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  let highestSeverity: "HIGH" | "MEDIUM" | "LOW" | null = null;
  if (highestExplicitSeverity && highestInferredSeverity) {
    highestSeverity = severityOrder[highestExplicitSeverity] >= severityOrder[highestInferredSeverity]
      ? (highestExplicitSeverity as "HIGH" | "MEDIUM" | "LOW")
      : (highestInferredSeverity as "HIGH" | "MEDIUM" | "LOW");
  } else if (highestExplicitSeverity) {
    highestSeverity = highestExplicitSeverity as "HIGH" | "MEDIUM" | "LOW";
  } else if (highestInferredSeverity) {
    highestSeverity = highestInferredSeverity as "HIGH" | "MEDIUM" | "LOW";
  }

  // Step 4: Build summary with severity and blocked flag
  const summary: import("./types").WorkImpactSummary = {
    totalCount: explicitCount + inferredCount,
    explicitCount,
    inferredCount,
    highestSeverity,
    affectedTeamCount: 0, // Not computed in summary-only path
    affectedDepartmentCount: 0,
    affectedPersonCount: 0,
    affectedRoleCount: 0,
    affectedDecisionDomainCount: 0,
    affectedWorkRequestCount: 0,
  };

  return {
    workRequestId: workRequest.id,
    summary,
    hasBlockedImpacts: hasBlockedExplicit || hasBlockedInferred,
  };
}

/**
 * Resolve impact by work request ID (convenience wrapper).
 */
export async function resolveWorkImpactById(
  workspaceId: string,
  workRequestId: string,
  options: ResolveWorkImpactOptions = {}
): Promise<WorkImpactResolution | null> {
  const workRequest = await prisma.workRequest.findFirst({
    where: {
      id: workRequestId,
      workspaceId,
    },
  });

  if (!workRequest) {
    return null;
  }

  return resolveWorkImpact(workspaceId, workRequest, options);
}
