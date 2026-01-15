/**
 * Org Intelligence rollups computation.
 * 
 * Computes explainable rollups from findings:
 * - Totals
 * - Counts by signal type
 * - Counts by severity
 */

import type { OrgIntelligenceFinding } from "@/server/org/intelligence/types";

export type OrgIntelligenceRollups = {
  totals: { findings: number };
  bySignal: Record<string, number>;
  bySeverity: Record<string, number>;
};

/**
 * Compute rollups from a list of findings.
 * Returns structured counts by signal and severity.
 */
export function computeRollups(findings: OrgIntelligenceFinding[]): OrgIntelligenceRollups {
  const bySignal: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const f of findings) {
    bySignal[f.signal] = (bySignal[f.signal] || 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
  }

  return {
    totals: { findings: findings.length },
    bySignal,
    bySeverity,
  };
}

