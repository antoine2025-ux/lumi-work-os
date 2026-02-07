/**
 * Refusal Copy v0 — Canonical blocker copy for Loopbrain blocked answers
 *
 * Strings must match docs/loopbrain/refusal-language-canon.v0.md exactly.
 * Append-only changes: if wording changes materially, bump version.
 */

import type { OrgReadinessBlocker } from "@/lib/org/snapshot/types";

export const BLOCKER_COPY_V0: Record<
  OrgReadinessBlocker,
  { label: string; description: string }
> = {
  NO_ACTIVE_PEOPLE: {
    label: "No active people",
    description: "No active people are set up yet.",
  },
  NO_TEAMS: {
    label: "No teams",
    description: "No teams exist yet.",
  },
  OWNERSHIP_INCOMPLETE: {
    label: "Ownership incomplete",
    description: "Some teams or departments are missing an owner.",
  },
  NO_DECISION_DOMAINS: {
    label: "No decision domains",
    description: "No decision domains are defined yet.",
  },
  CAPACITY_COVERAGE_BELOW_MIN: {
    label: "Capacity below minimum",
    description: "Capacity is not configured for enough people.",
  },
  RESPONSIBILITY_PROFILES_MISSING: {
    label: "Responsibility profiles missing",
    description: "Role responsibility profiles are missing.",
  },
  WORK_CANNOT_EVALUATE_BASELINE: {
    label: "Work baseline not established",
    description: "No non-provisional work request has been evaluated yet.",
  },
};

/** Title for blocked refusal UI. Static. */
export function getRefusalTitleV0(): string {
  return "Can't answer yet";
}

/** Subtitle for blocked refusal UI. Static. No parameters. No blocker-specific variant. */
export function getRefusalSubtitleV0(): string {
  return "Your org is missing required structure to answer this question.";
}
