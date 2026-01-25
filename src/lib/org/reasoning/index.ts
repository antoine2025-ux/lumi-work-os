/**
 * Phase R: Org Reasoning Layer
 *
 * Re-exports for external consumption.
 * Import from @/lib/org/reasoning for all reasoning types and functions.
 */

// Version constants
export {
  ORG_REASONING_SCHEMA_VERSION,
  ORG_REASONING_SEMANTICS_VERSION,
  REASONING_API_VERSION,
  REASONING_MAX_LIMIT,
  REASONING_DEFAULT_LIMIT,
  REASONING_PREVIEW_COUNT,
  CATEGORY_PRIORITY,
  // Rank base constants (semantics-versioned)
  OWNERSHIP_RANK_BASE,
  PEOPLE_RANK_BASE,
  STRUCTURE_RANK_BASE,
} from "./version";

// Types
export {
  // Recommendation codes
  ORG_RECOMMENDATION_CODES,
  ORG_RECOMMENDATION_CODES_SET,
  type RecommendationCode,
  // Core types
  type RecommendationSeverity,
  type RecommendationCategory,
  type ActionSurface,
  // Evidence
  type InputSnapshotMeta,
  type RecommendationEvidence,
  // Actions
  type RecommendationAction,
  // Recommendation
  type OrgRecommendation,
  // Result types
  type ReasoningMeta,
  type ReasoningSummaries,
  type OrgReasoningResult,
} from "./types";

// Helpers
export {
  ALLOWED_ACTION_HREF_PREFIXES,
  validateAction,
  createRecommendation,
  buildEvidence,
  extractInputSnapshotMeta,
  type CreateRecommendationOptions,
  type BuildEvidenceOptions,
} from "./helpers";

// Engine
export {
  computeOrgRecommendations,
  type ComputeRecommendationsOptions,
} from "./engine";

// Rule modules (for testing/extension)
export { deriveOwnershipRecommendations } from "./rules/ownership";
export { derivePeopleRecommendations } from "./rules/people";
export { deriveStructureRecommendations } from "./rules/structure";
export { deriveCapacityRecommendations } from "./rules/capacity";
