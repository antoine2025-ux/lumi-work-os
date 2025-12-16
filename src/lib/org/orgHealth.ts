/**
 * Org Health Computation for ContextObject
 * 
 * Lightweight health computation specifically for attaching to the org ContextObject.
 * This provides health signals that Loopbrain can use to answer org health questions.
 */

import { OrgContextBundle } from "./orgContextBundle";
import { ContextObject } from "@/lib/context/contextTypes";

export type OrgHealthLabel = "HEALTHY" | "STABLE" | "WARNING" | "CRITICAL";

export type OrgHealthSummary = {
  score: number; // 0–100
  label: OrgHealthLabel;
  metrics: {
    totalPeople: number;
    totalTeams: number;
    totalDepartments: number;
    totalRoles: number;
    depthApprox: number; // simple heuristic for now
    singlePointTeamsApprox: number;
    overloadedManagersApprox: number;
  };
};

/**
 * Very lightweight heuristic health computation.
 * This does NOT need to be perfect; it just needs to:
 * - produce a consistent score + label
 * - expose a few simple metrics for tags/summary
 */
export function computeOrgHealthForBundle(
  bundle: OrgContextBundle
): OrgHealthSummary {
  const totalPeople = bundle.people.length;
  const totalTeams = bundle.teams.length;
  const totalDepartments = bundle.departments.length;
  const totalRoles = bundle.roles.length;

  // Approximate "depth" by looking at positions and manager-like relations
  let depthApprox = 1;
  for (const person of bundle.people) {
    const hasManager = person.relations.some((rel) => rel.type === "reports_to");
    if (hasManager) {
      depthApprox = Math.max(depthApprox, 2);
    }
  }

  // Approximate single-point teams: teams with exactly 1 person
  const teamMemberCounts: Record<string, number> = {};
  for (const person of bundle.people) {
    for (const rel of person.relations) {
      if (rel.type === "member_of_team") {
        teamMemberCounts[rel.targetId] = (teamMemberCounts[rel.targetId] ?? 0) + 1;
      }
    }
  }

  const singlePointTeamsApprox = Object.values(teamMemberCounts).filter(
    (count) => count === 1
  ).length;

  // Approximate overloaded managers: people with many direct reports
  const directReportCounts: Record<string, number> = {};
  for (const person of bundle.people) {
    for (const rel of person.relations) {
      if (rel.type === "reports_to") {
        // reports_to: sourceId -> targetId (manager)
        const managerId = rel.targetId;
        directReportCounts[managerId] = (directReportCounts[managerId] ?? 0) + 1;
      }
    }
  }

  const overloadedManagersApprox = Object.values(directReportCounts).filter(
    (count) => count >= 8 // heuristic threshold
  ).length;

  // Heuristic scoring:
  // Start at 100 and subtract penalties.
  let score = 100;

  // Penalty for deep-ish hierarchy
  if (depthApprox >= 3) score -= 10;
  if (depthApprox >= 5) score -= 15;

  // Penalty for many single-point teams
  score -= Math.min(singlePointTeamsApprox * 3, 20);

  // Penalty for overloaded managers
  score -= Math.min(overloadedManagersApprox * 5, 25);

  // Clamp score
  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let label: OrgHealthLabel = "HEALTHY";
  if (score < 40) label = "CRITICAL";
  else if (score < 60) label = "WARNING";
  else if (score < 80) label = "STABLE";
  else label = "HEALTHY";

  return {
    score,
    label,
    metrics: {
      totalPeople,
      totalTeams,
      totalDepartments,
      totalRoles,
      depthApprox,
      singlePointTeamsApprox,
      overloadedManagersApprox,
    },
  };
}

/**
 * Mutates the given org ContextObject to include health signals.
 * Adds health information to summary and tags.
 */
export function attachHealthToOrgContext(
  orgContext: ContextObject,
  health: OrgHealthSummary
): ContextObject {
  const tags = new Set(orgContext.tags);

  tags.add("org_health");
  tags.add(`org_health_score:${health.score}`);
  tags.add(`org_health_label:${health.label.toLowerCase()}`);
  tags.add(`org_depth:${health.metrics.depthApprox}`);
  tags.add(`org_single_point_teams:${health.metrics.singlePointTeamsApprox}`);
  tags.add(`org_overloaded_managers:${health.metrics.overloadedManagersApprox}`);
  tags.add(`people:${health.metrics.totalPeople}`);
  tags.add(`teams:${health.metrics.totalTeams}`);
  tags.add(`departments:${health.metrics.totalDepartments}`);
  tags.add(`roles:${health.metrics.totalRoles}`);

  const healthSummaryLine = `Health: ${health.label} (${health.score}/100). Depth≈${health.metrics.depthApprox}, single-point teams≈${health.metrics.singlePointTeamsApprox}, overloaded managers≈${health.metrics.overloadedManagersApprox}.`;

  const combinedSummary =
    orgContext.summary && orgContext.summary.trim().length > 0
      ? `${orgContext.summary} ${healthSummaryLine}`
      : healthSummaryLine;

  return {
    ...orgContext,
    summary: combinedSummary,
    tags: Array.from(tags),
  };
}

