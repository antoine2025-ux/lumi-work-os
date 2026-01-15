/**
 * Feature flags for Org rollout.
 * 
 * IMPORTANT:
 * - Must NOT be used to mask missing schema.
 * - Must only gate exposure/entry points for incomplete functionality.
 * - All flags default to false for safe Phase 1 rollout.
 */

export type OrgFlag =
  | "org.people.write"
  | "org.structure.write"
  | "org.ownership.write"
  | "org.reporting.write"
  | "org.availability.write";

const DEFAULTS: Record<OrgFlag, boolean> = {
  "org.people.write": true, // Enabled for Step 2.1 testing
  "org.structure.write": true, // Enabled for Step 2.2 testing
  "org.ownership.write": true, // Enabled for Step 2.3 testing
  "org.reporting.write": false,
  "org.availability.write": true, // Enabled for Step 2.5 testing
};

/**
 * Feature flags for Org rollout.
 * 
 * Phase 1: Static defaults (all false for safe merge).
 * Phase 2+: Replace with real flag system if one exists.
 * 
 * @param flag - The feature flag to check
 * @returns true if the flag is enabled, false otherwise
 */
export function isOrgFlagEnabled(flag: OrgFlag): boolean {
  // Phase 1: static defaults. Replace with real flag system later if one exists.
  return DEFAULTS[flag];
}

