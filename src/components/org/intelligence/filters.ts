/**
 * Intelligence findings filter helpers.
 * 
 * Utility functions for filtering and sorting findings.
 */

import type { OrgIntelligenceFinding } from "@/components/org/api";

/**
 * Filter findings by signal type.
 */
export function filterBySignal(
  findings: OrgIntelligenceFinding[],
  signal: OrgIntelligenceFinding["signal"]
): OrgIntelligenceFinding[] {
  return findings.filter((f) => f.signal === signal);
}

/**
 * Sort findings by severity (HIGH first, then MEDIUM, then LOW).
 */
export function sortBySeverityDesc(findings: OrgIntelligenceFinding[]): OrgIntelligenceFinding[] {
  const rank = (s: string) => (s === "HIGH" ? 3 : s === "MEDIUM" ? 2 : 1);
  return [...findings].sort((a, b) => rank(b.severity) - rank(a.severity));
}

/**
 * Filter findings by entity type.
 */
export function findingsForEntityType(
  findings: OrgIntelligenceFinding[],
  entityType: OrgIntelligenceFinding["entityType"]
): OrgIntelligenceFinding[] {
  return findings.filter((f) => f.entityType === entityType);
}

