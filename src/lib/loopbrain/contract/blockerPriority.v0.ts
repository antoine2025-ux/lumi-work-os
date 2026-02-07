/**
 * Canonical Blocker Priority v0
 *
 * Single source of truth for OrgReadinessBlocker ordering.
 * Must match the order used in buildOrgSemanticSnapshotV0 when populating readiness.blockers.
 * Any divergence is a contract violation.
 *
 * Blocker priority must be defined in exactly one canonical module and reused everywhere.
 */

import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

export const BLOCKER_PRIORITY_V0: OrgReadinessBlocker[] = [
  "NO_ACTIVE_PEOPLE",
  "NO_TEAMS",
  "OWNERSHIP_INCOMPLETE",
  "NO_DECISION_DOMAINS",
  "CAPACITY_COVERAGE_BELOW_MIN",
  "RESPONSIBILITY_PROFILES_MISSING",
  "WORK_CANNOT_EVALUATE_BASELINE",
];
