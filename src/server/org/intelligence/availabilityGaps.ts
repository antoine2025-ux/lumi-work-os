/**
 * Availability gaps intelligence computation.
 * 
 * Identifies people with UNKNOWN or STALE availability as structural gaps.
 */

import type { OrgIntelligenceFinding } from "./types";
/**
 * Compute availability gap findings.
 * Returns findings for people with UNKNOWN or STALE availability.
 */
export async function computeAvailabilityGaps(): Promise<OrgIntelligenceFinding[]> {

  const findings: OrgIntelligenceFinding[] = [];

  // Note: Availability tracking moved to PersonAvailability model
  // This function may need to be refactored to query PersonAvailability instead
  // For now, returning empty findings to prevent runtime errors
  
  return findings;
}

