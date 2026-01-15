/**
 * Org Intelligence aggregation service.
 * 
 * Aggregates all intelligence signals into a single result set.
 * All computations are read-only and derived from existing Org data.
 */

import { computeManagementLoad } from "./managementLoad";
import { computeOwnershipRisk } from "./ownershipRisk";
import { computeStructuralGaps } from "./structuralGaps";
import { computeAvailabilityGaps } from "./availabilityGaps";
import type { OrgIntelligenceFinding } from "./types";

/**
 * Compute all Org Intelligence signals.
 * Returns a flat array of findings from all intelligence computations.
 */
export async function computeOrgIntelligence(): Promise<OrgIntelligenceFinding[]> {
  const results = await Promise.all([
    computeManagementLoad(),
    computeOwnershipRisk(),
    computeStructuralGaps(),
    computeAvailabilityGaps(),
  ]);

  return results.flat();
}

