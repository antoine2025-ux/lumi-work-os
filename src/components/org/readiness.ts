/**
 * Org Readiness Evaluator
 * 
 * Computes deterministic Org readiness status from API data.
 * This is a pure function for testability and consistency.
 */

import type { OrgOwnershipDTO, OrgPeopleListDTO, OrgStructureDTO } from "@/components/org/api";

export type OrgChecklistItem =
  | "people_added"
  | "structure_defined"
  | "ownership_assigned"
  | "reporting_defined"
  | "availability_set";

export type OrgReadiness = {
  ready: boolean;
  items: Array<{
    key: OrgChecklistItem;
    title: string;
    description: string;
    complete: boolean;
    ctaLabel: string;
    href: string;
    meta?: string;
  }>;
};

export function computeOrgReadiness(input: {
  people: OrgPeopleListDTO;
  structure: OrgStructureDTO;
  ownership: OrgOwnershipDTO;
}): OrgReadiness {
  const peopleCount = input.people.people.length;
  const teamCount = input.structure.teams.length;
  const deptCount = input.structure.departments.length;

  const ownershipGaps = input.ownership.unowned.length;

  const missingManagerCount = input.people.people.filter((p) => !p.manager).length;
  const unknownAvailabilityCount = input.people.people.filter((p) => p.availabilityStatus === "UNKNOWN").length;
  const staleAvailabilityCount = input.people.people.filter((p) => p.availabilityStale).length;

  const people_added = peopleCount > 0;
  const structure_defined = teamCount > 0 || deptCount > 0;

  // Ownership complete means: no unowned entities IF there are entities.
  const ownership_assigned = (teamCount + deptCount) === 0 ? false : ownershipGaps === 0;

  // Reporting "defined" means: no missing manager IF there are 2+ people.
  // For MVP, allow 0/1 person to pass without reporting lines.
  const reporting_defined = peopleCount <= 1 ? true : missingManagerCount === 0;

  // Availability "set" means: no UNKNOWN and not stale.
  // For MVP, allow 0 people to fail (handled by people_added).
  const availability_set = peopleCount === 0 ? false : unknownAvailabilityCount === 0 && staleAvailabilityCount === 0;

  const items = [
    {
      key: "people_added" as const,
      title: "Add people",
      description: "Create your people directory so Org has identity truth.",
      complete: people_added,
      ctaLabel: people_added ? "View people" : "Add people",
      href: people_added ? "/org/people" : "/org/people/new",
      meta: `People: ${peopleCount}`,
    },
    {
      key: "structure_defined" as const,
      title: "Define structure",
      description: "Create departments/teams so people have a place in the org.",
      complete: structure_defined,
      ctaLabel: "Open structure",
      href: "/org/structure",
      meta: `Teams: ${teamCount} • Departments: ${deptCount}`,
    },
    {
      key: "ownership_assigned" as const,
      title: "Assign ownership",
      description: "Ensure every team/department has an accountable owner.",
      complete: ownership_assigned,
      ctaLabel: ownership_assigned ? "View ownership" : "Fix ownership gaps",
      href: "/org/ownership",
      meta: `Gaps: ${ownershipGaps}`,
    },
    {
      key: "reporting_defined" as const,
      title: "Set reporting lines",
      description: "Define who reports to whom (manager relationships).",
      complete: reporting_defined,
      ctaLabel: "Open people",
      href: "/org/people",
      meta: peopleCount <= 1 ? "Not required (single person)" : `Missing manager: ${missingManagerCount}`,
    },
    {
      key: "availability_set" as const,
      title: "Set availability",
      description: "Mark availability so you can answer who is available/unavailable.",
      complete: availability_set,
      ctaLabel: "Open people",
      href: "/org/people",
      meta: `Unknown: ${unknownAvailabilityCount} • Stale: ${staleAvailabilityCount}`,
    },
  ];

  const ready = items.every((i) => i.complete);

  return { ready, items };
}

