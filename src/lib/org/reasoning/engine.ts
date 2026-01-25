/**
 * Phase R: Org Reasoning Engine
 *
 * Pure function that computes recommendations from Phase S snapshot.
 * No Prisma, no network calls, no side effects.
 *
 * See docs/org/reasoning-rules.md for contracts.
 */

import type { OrgIntelligenceSnapshotDTO } from "../intelligence/snapshotTypes";
import { SNAPSHOT_API_VERSION } from "../intelligence/snapshotTypes";
import type {
  OrgRecommendation,
  OrgReasoningResult,
  ReasoningMeta,
  ReasoningSummaries,
  RecommendationCategory,
  RecommendationSeverity,
  RecommendationCode,
} from "./types";
import { ORG_RECOMMENDATION_CODES_SET } from "./types";
import {
  ORG_REASONING_SCHEMA_VERSION,
  ORG_REASONING_SEMANTICS_VERSION,
  REASONING_DEFAULT_LIMIT,
  REASONING_MAX_LIMIT,
  CATEGORY_PRIORITY,
} from "./version";
import { extractInputSnapshotMeta } from "./helpers";

// Import rule modules (to be implemented)
import { deriveOwnershipRecommendations } from "./rules/ownership";
import { derivePeopleRecommendations } from "./rules/people";
import { deriveStructureRecommendations } from "./rules/structure";
import { deriveCapacityRecommendations } from "./rules/capacity";

// ============================================================================
// Options
// ============================================================================

export type ComputeRecommendationsOptions = {
  /** Max recommendations to return (0-50, default 10) */
  limit?: number;
};

// ============================================================================
// Sorting
// ============================================================================

/**
 * Severity priority for sorting (higher severity = lower number = higher priority).
 * Properly typed to prevent silent typos.
 */
const SEVERITY_PRIORITY: Record<RecommendationSeverity, number> = {
  critical: 1,
  warning: 2,
  info: 3,
};

/**
 * Sort recommendations deterministically.
 *
 * Order: severity desc, category priority asc, rank asc, code asc
 * This ensures stable, predictable output.
 */
function sortRecommendations(recs: OrgRecommendation[]): OrgRecommendation[] {
  return [...recs].sort((a, b) => {
    // 1. Severity (critical > warning > info)
    const sevA = SEVERITY_PRIORITY[a.severity] ?? 99;
    const sevB = SEVERITY_PRIORITY[b.severity] ?? 99;
    if (sevA !== sevB) return sevA - sevB;

    // 2. Category priority (ownership > people > structure > capacity)
    const catA = CATEGORY_PRIORITY[a.category] ?? 99;
    const catB = CATEGORY_PRIORITY[b.category] ?? 99;
    if (catA !== catB) return catA - catB;

    // 3. Rank (lower = higher priority)
    if (a.rank !== b.rank) return a.rank - b.rank;

    // 4. Code (alphabetical for stability)
    return a.code.localeCompare(b.code);
  });
}

// ============================================================================
// Summaries
// ============================================================================

/**
 * Build summary counts from recommendations.
 * Uses full list (before limit applied).
 */
function buildSummaries(recs: OrgRecommendation[]): ReasoningSummaries {
  const byCategory: Record<RecommendationCategory, number> = {
    ownership: 0,
    people: 0,
    structure: 0,
    capacity: 0,
  };

  let criticalCount = 0;

  for (const rec of recs) {
    byCategory[rec.category]++;
    if (rec.severity === "critical") {
      criticalCount++;
    }
  }

  return {
    byCategory,
    criticalCount,
    total: recs.length,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate recommendation codes and enforce aggregation invariant.
 *
 * INVARIANTS:
 * - All codes must be from ORG_RECOMMENDATION_CODES
 * - No duplicate codes (aggregation invariant)
 *
 * @throws Error if validation fails (dev/test safety net)
 */
function validateRecommendations(recs: OrgRecommendation[]): void {
  const seenCodes = new Set<RecommendationCode>();

  for (const rec of recs) {
    // Validate code is from allowlist
    if (!ORG_RECOMMENDATION_CODES_SET.has(rec.code)) {
      throw new Error(
        `Invalid recommendation code "${rec.code}". Must be from ORG_RECOMMENDATION_CODES.`
      );
    }

    // Validate no duplicate codes (aggregation invariant)
    if (seenCodes.has(rec.code)) {
      throw new Error(
        `Duplicate recommendation code "${rec.code}". Each code should appear at most once (aggregation invariant).`
      );
    }
    seenCodes.add(rec.code);
  }
}

// ============================================================================
// Main Engine
// ============================================================================

/**
 * Compute recommendations from Phase S snapshot.
 *
 * GUARANTEES:
 * - Pure function: same input → same output (excluding _meta.computedAt)
 * - Deterministic ordering even with shuffled input arrays
 * - Aggregated: one recommendation per code (enforced by validateRecommendations)
 * - Traceable: _meta includes inputSnapshotMeta
 *
 * @param snapshot - Phase S snapshot DTO (from /api/org/intelligence?version=v2 or serializeSnapshot(getOrgIntelligenceSnapshot(...)))
 * @param options - Limit and other options
 * @returns Recommendations with summaries and metadata
 */
export function computeOrgRecommendations(
  snapshot: OrgIntelligenceSnapshotDTO,
  options?: ComputeRecommendationsOptions
): OrgReasoningResult {
  const inputSnapshotMeta = extractInputSnapshotMeta(snapshot._meta);

  // 1. Collect recommendations from each rule module (aggregated, not N-per-entity)
  const allRecs: OrgRecommendation[] = [
    ...deriveOwnershipRecommendations(snapshot, inputSnapshotMeta),
    ...derivePeopleRecommendations(snapshot, inputSnapshotMeta),
    ...deriveStructureRecommendations(snapshot, inputSnapshotMeta),
    ...deriveCapacityRecommendations(snapshot, inputSnapshotMeta),
  ];

  // 2. Validate codes and aggregation invariant
  validateRecommendations(allRecs);

  // 3. Sort deterministically
  const sorted = sortRecommendations(allRecs);

  // 4. Build summaries from full list (before limit)
  const summaries = buildSummaries(sorted);

  // 5. Apply limit (clamped to max)
  const requestedLimit = options?.limit ?? REASONING_DEFAULT_LIMIT;
  const limit = Math.min(Math.max(0, requestedLimit), REASONING_MAX_LIMIT);
  const limited = limit === 0 ? [] : sorted.slice(0, limit);

  // 6. Build metadata with full traceability
  const _meta: ReasoningMeta = {
    computedAt: new Date().toISOString(),
    reasoningSchemaVersion: ORG_REASONING_SCHEMA_VERSION,
    reasoningSemanticsVersion: ORG_REASONING_SEMANTICS_VERSION,
    snapshotApiVersion: SNAPSHOT_API_VERSION,
    inputSnapshotMeta,
  };

  return {
    recommendations: limited,
    summaries,
    _meta,
  };
}
