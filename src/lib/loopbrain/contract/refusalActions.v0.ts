/**
 * Refusal Actions v0 — Blocker-to-next-actions map for Loopbrain blocked answers
 *
 * BLOCKER_ACTIONS_V0 must be static data. No functions, no conditionals, no environment-based branching.
 * Deep links must be literal strings or calls to pure deep-link helpers that return strings at module load.
 * All deepLink values must be strings at import time (not functions).
 */

import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";
import {
  deepLinkForOwnershipIssues,
  deepLinkForCapacityIssues,
  deepLinkForResponsibilityIssues,
} from "@/lib/org/issues/deepLinks";

type Action = { label: string; deepLink?: string };

/** Imperative actions per blocker. Static data. */
export const BLOCKER_ACTIONS_V0: Record<OrgReadinessBlocker, Action[]> = {
  NO_ACTIVE_PEOPLE: [{ label: "Add people", deepLink: "/org/people" }],
  NO_TEAMS: [{ label: "Add teams", deepLink: "/org/structure" }],
  OWNERSHIP_INCOMPLETE: [
    { label: "Resolve ownership issues", deepLink: deepLinkForOwnershipIssues() },
  ],
  NO_DECISION_DOMAINS: [
    { label: "Define decision domains", deepLink: "/org/settings/decision-authority" },
  ],
  CAPACITY_COVERAGE_BELOW_MIN: [
    { label: "Configure capacity", deepLink: deepLinkForCapacityIssues() },
    { label: "Add people", deepLink: "/org/people" },
  ],
  RESPONSIBILITY_PROFILES_MISSING: [
    {
      label: "Configure responsibility profiles",
      deepLink: deepLinkForResponsibilityIssues(),
    },
    { label: "Configure responsibility", deepLink: "/org/settings/responsibility" },
  ],
  WORK_CANNOT_EVALUATE_BASELINE: [
    { label: "Resume onboarding", deepLink: "/org/onboarding/work" },
  ],
};
