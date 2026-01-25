/**
 * Phase R: Org Reasoning Layer Helpers
 *
 * Type-safe helpers for creating recommendations.
 * Enforce all invariants at construction time.
 *
 * See docs/org/reasoning-rules.md for contracts.
 */

import type {
  RecommendationCode,
  RecommendationSeverity,
  RecommendationCategory,
  RecommendationEvidence,
  RecommendationAction,
  OrgRecommendation,
  InputSnapshotMeta,
} from "./types";
import type { EntityRef, OrgSnapshotIssueCode } from "../intelligence/snapshotTypes";
import { REASONING_PREVIEW_COUNT } from "./version";

// ============================================================================
// Action Validation
// ============================================================================

/**
 * Allowed href prefixes for recommendation actions.
 * Only these real fix surfaces are permitted.
 *
 * See docs/org/reasoning-rules.md § Allowed Action Href Prefixes
 */
export const ALLOWED_ACTION_HREF_PREFIXES = [
  "/org/ownership",
  "/org/people",
  "/org/structure",
  "/org/settings/capacity",
  "/org/teams/",
  "/org/departments/",
] as const;

/**
 * Surface ↔ href prefix mapping.
 * Prevents UX inconsistencies like "Ownership recommendation → Structure page".
 *
 * Each surface must link to its corresponding page prefix.
 */
const SURFACE_TO_HREF_PREFIX: Record<string, string[]> = {
  ownership: ["/org/ownership"],
  people: ["/org/people"],
  structure: ["/org/structure", "/org/settings/capacity"],
  team: ["/org/teams/"],
  department: ["/org/departments/"],
};

/**
 * Control characters that are forbidden in hrefs.
 */
const FORBIDDEN_HREF_CHARS = /[\n\r\t]/;

/**
 * Validate action href and surface.
 *
 * INVARIANTS:
 * - href must not be empty
 * - href must not have leading/trailing whitespace
 * - href must not contain control characters (\n, \r, \t)
 * - href must start with one of ALLOWED_ACTION_HREF_PREFIXES
 * - href must match surface (ownership → /org/ownership, etc.)
 * - href must not contain http://, https://, javascript:
 *
 * @throws Error if validation fails
 */
export function validateAction(action: RecommendationAction): void {
  if (!action.href) {
    throw new Error("Action href must not be empty");
  }

  // Check for leading/trailing whitespace
  const trimmed = action.href.trim();
  if (trimmed !== action.href) {
    throw new Error(`Action href must not have leading/trailing whitespace: "${action.href}"`);
  }

  // Check for control characters
  if (FORBIDDEN_HREF_CHARS.test(action.href)) {
    throw new Error(`Action href must not contain control characters: ${action.href}`);
  }

  // Check allowed prefixes
  const hasAllowedPrefix = ALLOWED_ACTION_HREF_PREFIXES.some((prefix) =>
    action.href.startsWith(prefix)
  );
  if (!hasAllowedPrefix) {
    throw new Error(
      `Action href must start with one of: ${ALLOWED_ACTION_HREF_PREFIXES.join(", ")}. Got: ${action.href}`
    );
  }

  // Check surface ↔ href prefix consistency
  const allowedPrefixesForSurface = SURFACE_TO_HREF_PREFIX[action.surface];
  if (allowedPrefixesForSurface) {
    const matchesSurface = allowedPrefixesForSurface.some((prefix) =>
      action.href.startsWith(prefix)
    );
    if (!matchesSurface) {
      throw new Error(
        `Action surface "${action.surface}" must link to ${allowedPrefixesForSurface.join(" or ")}, got: ${action.href}`
      );
    }
  }

  // Check for dangerous patterns
  if (action.href.includes("javascript:")) {
    throw new Error(`Action href must not contain javascript: ${action.href}`);
  }

  if (action.href.includes("http://") || action.href.includes("https://")) {
    throw new Error(`Action href must be internal path, not external URL: ${action.href}`);
  }
}

// ============================================================================
// Recommendation Creation
// ============================================================================

/**
 * Options for creating a recommendation.
 */
export type CreateRecommendationOptions = {
  category: RecommendationCategory;
  summary: string;
  evidence: RecommendationEvidence;
  actions: RecommendationAction[];
  rank: number;
  /** Optional metadata for UI hints */
  meta?: Record<string, unknown>;
};

/**
 * Type-safe recommendation creator.
 *
 * ENFORCES:
 * - code must be from ORG_RECOMMENDATION_CODES
 * - evidence must have at least one issueCode or entity
 * - all actions must pass validateAction
 * - critical and warning recommendations must have at least one action
 * - critical recommendations must have at least one primary action
 *
 * @throws Error if any invariant is violated
 */
export function createRecommendation(
  code: RecommendationCode,
  severity: RecommendationSeverity,
  title: string,
  options: CreateRecommendationOptions
): OrgRecommendation {
  // Validate evidence has at least one issueCode or entity
  if (
    options.evidence.issueCodes.length === 0 &&
    options.evidence.entities.length === 0
  ) {
    throw new Error(
      `Recommendation ${code} must have evidence (at least one issueCode or entity)`
    );
  }

  // Critical and warning recommendations must have at least one action
  // (info recommendations may be informational-only with no actions)
  if ((severity === "critical" || severity === "warning") && options.actions.length === 0) {
    throw new Error(
      `${severity} recommendation ${code} must have at least one action`
    );
  }

  // Validate all actions
  for (const action of options.actions) {
    validateAction(action);
  }

  // Critical recommendations must have at least one primary action
  if (severity === "critical" && !options.actions.some((a) => a.primary)) {
    throw new Error(
      `Critical recommendation ${code} must have at least one primary action`
    );
  }

  return {
    code,
    severity,
    title,
    category: options.category,
    summary: options.summary,
    evidence: options.evidence,
    actions: options.actions,
    rank: options.rank,
    ...(options.meta && { meta: options.meta }),
  };
}

// ============================================================================
// Evidence Building Helpers
// ============================================================================

/**
 * Options for building evidence.
 */
export type BuildEvidenceOptions = {
  /**
   * Override the total count instead of using entities.length.
   * Use this when you have a count but only pass preview entities
   * to avoid building/passing huge arrays.
   */
  totalCountOverride?: number;
};

/**
 * Build evidence from snapshot issue codes and entities.
 *
 * Automatically:
 * - De-duplicates and sorts issue codes (for determinism)
 * - De-duplicates entities by type:id
 * - Limits entities to REASONING_PREVIEW_COUNT
 * - Sets count, previewCount, and aggregated in meta
 *
 * @param issueCodes - Issue codes that triggered this (may contain duplicates)
 * @param entities - Entities to include (will be sliced to preview count)
 * @param snapshotMeta - Input snapshot metadata for traceability
 * @param options - Optional overrides (e.g., totalCountOverride)
 */
export function buildEvidence(
  issueCodes: OrgSnapshotIssueCode[],
  entities: EntityRef[],
  snapshotMeta: InputSnapshotMeta,
  options?: BuildEvidenceOptions
): RecommendationEvidence {
  // De-duplicate and sort issue codes for determinism
  const uniqueIssueCodes = Array.from(new Set(issueCodes)).sort() as OrgSnapshotIssueCode[];

  // De-duplicate entities by type:id
  const seenEntityKeys = new Set<string>();
  const uniqueEntities: EntityRef[] = [];
  for (const entity of entities) {
    const key = `${entity.type}:${entity.id}`;
    if (!seenEntityKeys.has(key)) {
      seenEntityKeys.add(key);
      uniqueEntities.push(entity);
    }
  }

  // Apply preview limit
  const previewEntities = uniqueEntities.slice(0, REASONING_PREVIEW_COUNT);

  // Calculate count (use override if provided, else use unique entities length)
  const totalCount = options?.totalCountOverride ?? uniqueEntities.length;
  const aggregated = totalCount > REASONING_PREVIEW_COUNT;

  return {
    issueCodes: uniqueIssueCodes,
    entities: previewEntities,
    meta: {
      count: totalCount,
      previewCount: previewEntities.length,
      aggregated,
      snapshotMeta,
    },
  };
}

/**
 * Extract InputSnapshotMeta from snapshot DTO _meta.
 */
export function extractInputSnapshotMeta(snapshotMeta: {
  schemaVersion: number;
  semanticsVersion: number;
  assumptionsId: string;
}): InputSnapshotMeta {
  return {
    schemaVersion: snapshotMeta.schemaVersion,
    semanticsVersion: snapshotMeta.semanticsVersion,
    assumptionsId: snapshotMeta.assumptionsId,
  };
}
