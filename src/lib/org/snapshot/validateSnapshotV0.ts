/**
 * Org Semantic Snapshot v0 Validation
 *
 * Validates snapshot structure for dev/debugging. Not used in production path.
 */

import type { OrgSemanticSnapshotV0 } from "./types";

export function validateSnapshotV0(snapshot: OrgSemanticSnapshotV0): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (snapshot.schemaVersion !== "v0") {
    errors.push(`schemaVersion must be "v0", got "${snapshot.schemaVersion}"`);
  }

  const requiredArrays = [
    snapshot.readiness.blockers,
    snapshot.roles,
    snapshot.decisionDomains,
    snapshot.decisions.domains,
  ] as unknown[][];

  for (const arr of requiredArrays) {
    if (!Array.isArray(arr)) {
      errors.push(`Expected array, got ${typeof arr}`);
    }
  }

  // pct fields in [0, 100]
  const pctChecks: { path: string; value: number }[] = [
    { path: "coverage.ownership.coveragePct", value: snapshot.coverage.ownership.coveragePct },
    { path: "coverage.capacity.pct", value: snapshot.coverage.capacity.pct },
    { path: "coverage.responsibilityProfiles.pct", value: snapshot.coverage.responsibilityProfiles.pct },
    { path: "coverage.decisionDomains.pct", value: snapshot.coverage.decisionDomains.pct },
    { path: "capacity.pctConfigured", value: snapshot.capacity.pctConfigured },
    { path: "responsibility.pctCovered", value: snapshot.responsibility.pctCovered },
  ];

  for (const { path, value } of pctChecks) {
    if (typeof value !== "number" || value < 0 || value > 100) {
      errors.push(`${path} must be 0-100, got ${value}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
