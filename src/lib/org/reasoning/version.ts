/**
 * Phase R: Org Reasoning Layer Versioning
 *
 * Version constants for the reasoning layer.
 * See docs/org/reasoning-rules.md for increment policies.
 */

/**
 * Schema version for OrgReasoningResult DTO shape.
 *
 * INCREMENT POLICY:
 * - Increment when DTO shape changes (fields added/removed/renamed)
 * - Increment when type of existing field changes
 * - Do NOT increment for bug fixes that don't change shape
 * - Do NOT increment for semantics changes (use semanticsVersion)
 */
export const ORG_REASONING_SCHEMA_VERSION = 1;

/**
 * Semantics version for reasoning behavior.
 *
 * INCREMENT POLICY:
 * - Increment when category priority order changes
 * - Increment when ranking algorithm changes
 * - Increment when recommendation codes added/renamed/removed
 * - Increment when aggregation thresholds change
 * - Increment when evidence requirements change
 * - Increment when any *_RANK_BASE constant changes
 * - Do NOT increment for DTO shape changes (use schemaVersion)
 */
export const ORG_REASONING_SEMANTICS_VERSION = 1;

// ============================================================================
// Rank Base Constants (VERSIONED)
// ============================================================================
//
// These constants control recommendation priority within categories.
// Lower rank = higher priority (after severity + category sort).
// Formula: rank = *_RANK_BASE - count
//
// ⚠️ CHANGING ANY OF THESE REQUIRES incrementing ORG_REASONING_SEMANTICS_VERSION ⚠️
//
// See docs/org/reasoning-rules.md § Ranking Policy

/**
 * Rank base for ownership recommendations.
 * @semanticsVersioned - changing this requires incrementing ORG_REASONING_SEMANTICS_VERSION
 */
export const OWNERSHIP_RANK_BASE = 1000;

/**
 * Rank base for people recommendations.
 * @semanticsVersioned - changing this requires incrementing ORG_REASONING_SEMANTICS_VERSION
 */
export const PEOPLE_RANK_BASE = 1000;

/**
 * Rank base for structure recommendations.
 * @semanticsVersioned - changing this requires incrementing ORG_REASONING_SEMANTICS_VERSION
 */
export const STRUCTURE_RANK_BASE = 1000;

/**
 * API version for query param.
 * Used in ?version=v1 requests.
 */
export const REASONING_API_VERSION = "v1";

/**
 * Maximum recommendations to return.
 * limit > this value will be clamped.
 */
export const REASONING_MAX_LIMIT = 50;

/**
 * Default recommendations to return when limit not specified.
 */
export const REASONING_DEFAULT_LIMIT = 10;

/**
 * Preview count for aggregated recommendations.
 * Number of entities to include in evidence.entities.
 */
export const REASONING_PREVIEW_COUNT = 3;

/**
 * Category priority order for sorting.
 * Lower number = higher priority.
 */
export const CATEGORY_PRIORITY: Record<string, number> = {
  ownership: 1,
  people: 2,
  structure: 3,
  capacity: 4,
};
