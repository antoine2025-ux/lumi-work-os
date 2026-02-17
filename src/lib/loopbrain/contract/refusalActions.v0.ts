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
  NO_ACTIVE_PEOPLE: [{ label: "Add people", deepLink: "/org/directory" }],
  NO_TEAMS: [{ label: "Add teams", deepLink: "/org/structure" }],
  OWNERSHIP_INCOMPLETE: [
    { label: "Resolve ownership issues", deepLink: deepLinkForOwnershipIssues() },
  ],
  NO_DECISION_DOMAINS: [
    { label: "Define decision domains", deepLink: "/org/admin/decisions" },
  ],
  CAPACITY_COVERAGE_BELOW_MIN: [
    { label: "Configure capacity", deepLink: deepLinkForCapacityIssues() },
    { label: "Add people", deepLink: "/org/directory" },
  ],
  RESPONSIBILITY_PROFILES_MISSING: [
    {
      label: "Configure responsibility profiles",
      deepLink: deepLinkForResponsibilityIssues(),
    },
    { label: "Configure responsibility", deepLink: "/org/admin/responsibility" },
  ],
  WORK_CANNOT_EVALUATE_BASELINE: [
    { label: "Resume onboarding", deepLink: "/org/onboarding/work" },
  ],
  // Project Health blockers (Phase 2)
  NO_PROJECT_DATA: [
    { label: "Create a project", deepLink: "/projects" },
  ],
  NO_TASKS: [
    { label: "Add tasks to the project", deepLink: "/projects" },
  ],
  NO_ACTIVITY: [
    { label: "Add tasks or updates", deepLink: "/projects" },
  ],
  INSUFFICIENT_HISTORY: [
    { label: "Complete more tasks to build history", deepLink: "/projects" },
  ],
  // Workload Analysis blockers (Phase 2)
  NO_PERSON_DATA: [
    { label: "Add people to the org", deepLink: "/org/directory" },
  ],
  NO_TASK_DATA: [
    { label: "Assign tasks to this person", deepLink: "/projects" },
  ],
  // Calendar Availability blockers (Phase 2)
  NO_CALENDAR_DATA: [
    { label: "Connect Google Calendar", deepLink: "/settings" },
  ],
  NO_AVAILABILITY_DATA: [
    { label: "Configure availability", deepLink: "/org/directory" },
    { label: "Set up capacity contracts", deepLink: "/org/admin/capacity" },
  ],
};
