/**
 * Mutation Response Contract
 *
 * Canonical types and helpers for mutation responses.
 */

export {
  // Types
  type ResolvedIssueDelta,
  type MutationResponseMeta,
  type MutationScope,
  type MutationResult,
  type MutationError,
  type MutationResponse,
  // Patch types
  type OwnershipPatch,
  type CapacityPatch,
  type WorkPatch,
  type EmptyPatch,
  // Constants
  MUTATION_EVIDENCE_VERSION,
  MUTATION_SEMANTICS_VERSION,
  // Server helpers
  buildResponseMeta,
  // Client helpers
  getSignalsFromMutationResult,
  isMutationSuccess,
  isMutationError,
} from "./types";

export { computeIssueResolution } from "./utils";

// Export bus for client consumption
export { mutationBus, type OrgMutationEvent } from "./bus";

// ============================================================================
// Mutation Bus Publishing Helper
// ============================================================================

import { mutationBus, type OrgMutationEvent } from "./bus";
import type { MutationResult } from "./types";
import { isMutationSuccess } from "./types";

/**
 * Publish a successful mutation result to the mutation bus.
 * 
 * Automatically derives patchType from result.patch shape.
 * Returns the result unchanged for chaining.
 * 
 * @param result - Mutation result (only publishes if successful)
 * @returns The same result (pass-through for chaining)
 */
export function publishMutationResult<T, TPatch>(
  result: MutationResult<T, TPatch>
): MutationResult<T, TPatch> {
  if (!isMutationSuccess(result)) return result;
  
  // Derive patchType from result.patch if available (optional, not critical)
  const patchType: OrgMutationEvent["patchType"] | undefined = 
    result.patch && typeof result.patch === "object" && "patchVersion" in result.patch && result.patch.patchVersion === 1
      ? ("updatedCoverage" in result.patch ? "OwnershipPatch" 
         : "updatedEffectiveCapacity" in result.patch ? "CapacityPatch"
         : "updatedFeasibility" in result.patch ? "WorkPatch"
         : undefined)
      : undefined;
  
  // Use stable timestamp from resolved deltas if available, otherwise omit
  // The resolved deltas already have resolvedBy.at timestamp, but we emit at bus emission time
  const eventAt = new Date().toISOString();
  
  mutationBus.emit({
    mutationId: result.responseMeta.mutationId,
    eventAt, // Bus emission timestamp (not resolution timestamp)
    resolvedAt: eventAt, // Backward compatibility
    affectedIssues: result.affectedIssues,
    scope: result.scope,
    patchType, // Optional, derived from patch shape
  });
  
  return result; // Pass-through for chaining
}
