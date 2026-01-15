/**
 * Intelligence rollup delta computation.
 * 
 * Computes the difference between two rollups to show trends over time.
 */

import type { OrgIntelligenceRollups } from "@/components/org/api";

export type RollupDelta = {
  bySeverity: Record<string, number>;
  bySignal: Record<string, number>;
  totalFindings: number;
};

/**
 * Compute delta between two record maps.
 * Returns a map where each key's value is curr[key] - prev[key].
 */
function deltaMap(curr: Record<string, number> = {}, prev: Record<string, number> = {}) {
  const keys = new Set([...Object.keys(curr), ...Object.keys(prev)]);
  const out: Record<string, number> = {};
  for (const k of keys) {
    out[k] = (curr[k] || 0) - (prev[k] || 0);
  }
  return out;
}

/**
 * Compute rollup delta between current and previous snapshot.
 * Positive values mean increases, negative values mean decreases.
 */
export function computeRollupDelta(
  curr: OrgIntelligenceRollups | null,
  prev: OrgIntelligenceRollups | null
): RollupDelta {
  return {
    bySeverity: deltaMap(curr?.bySeverity || {}, prev?.bySeverity || {}),
    bySignal: deltaMap(curr?.bySignal || {}, prev?.bySignal || {}),
    totalFindings: (curr?.totals?.findings || 0) - (prev?.totals?.findings || 0),
  };
}

