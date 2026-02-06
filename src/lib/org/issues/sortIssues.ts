/**
 * Deterministic issue sorting for snapshot and summary APIs.
 *
 * Single source of truth for issue ordering. Used by:
 * - /api/org/issues/summary
 * - buildOrgSemanticSnapshotV0 (topIssueIds)
 */

import type { OrgIssueMetadata } from "@/lib/org/deriveIssues";

function severityRank(sev: string): number {
  if (sev === "error") return 0;
  if (sev === "warning") return 1;
  if (sev === "info") return 2;
  return 3;
}

function scopeRank(entityType: string): number {
  if (entityType === "TEAM") return 0;
  if (entityType === "DEPARTMENT") return 1;
  if (entityType === "PERSON") return 2;
  if (entityType === "WORKSPACE") return 3;
  return 4; // unknown / missing → lowest priority
}

/**
 * Sort issues deterministically for consistent display and snapshot.
 * Order: severity (error > warning > info), then scope (TEAM > DEPARTMENT > PERSON > WORKSPACE), then type alphabetically.
 */
export function sortIssuesForSnapshot(issues: OrgIssueMetadata[]): OrgIssueMetadata[] {
  return [...issues].sort((a, b) => {
    const s = severityRank(a.severity) - severityRank(b.severity);
    if (s !== 0) return s;
    const e = scopeRank(a.entityType) - scopeRank(b.entityType);
    if (e !== 0) return e;
    return a.type.localeCompare(b.type);
  });
}
