// src/lib/org/healthService.ts

import type { ContextObject } from "@/lib/context";
import type { OrgHealth, OrgHealthRoles } from "./healthTypes";
import { computeRoleHealth } from "./roleHealthService";

/**
 * Compute role structure risk score (0-1).
 * Higher value = more risk.
 */
function computeRoleStructureRisk(roles: OrgHealthRoles | undefined): number {
  if (!roles) return 0;

  const s = roles.summary;

  // Simple scoring: each issue type adds up to a max penalty
  const noOwnerPenalty = Math.min(s.rolesWithoutOwner, 10) / 10; // 0..1
  const noRespPenalty = Math.min(s.rolesWithoutResponsibilities, 10) / 10; // 0..1
  const noTeamPenalty = Math.min(s.rolesWithoutTeam, 10) / 10; // 0..1
  const noDeptPenalty = Math.min(s.rolesWithoutDepartment, 10) / 10; // 0..1

  // Average of the four dimensions
  const avg =
    (noOwnerPenalty + noRespPenalty + noTeamPenalty + noDeptPenalty) / 4;

  // Ensure between 0 and 1
  return Math.max(0, Math.min(1, avg));
}

/**
 * Compute span of control risk score (0-1).
 * Higher value = more risk.
 */
function computeSpanOfControlRisk(
  overloadedManagers: number,
  underloadedManagers: number,
  totalPeople: number
): number {
  if (totalPeople === 0) return 0;

  // Risk increases with overloaded managers (more impactful)
  const overloadRisk = Math.min(overloadedManagers / Math.max(totalPeople / 10, 1), 1);
  
  // Underloaded managers are less risky but still a concern
  const underloadRisk = Math.min(underloadedManagers / Math.max(totalPeople / 20, 1), 1) * 0.5;

  return Math.min((overloadRisk + underloadRisk) / 1.5, 1);
}

/**
 * Compute team structure risk score (0-1).
 * Higher value = more risk.
 */
function computeTeamStructureRisk(
  singlePointTeams: number,
  largestTeamSize: number,
  totalTeams: number
): number {
  if (totalTeams === 0) return 0;

  // Single-person teams are risky
  const singleTeamRisk = Math.min(singlePointTeams / Math.max(totalTeams / 5, 1), 1);
  
  // Very large teams can indicate poor structure
  const largeTeamRisk = largestTeamSize > 15 ? (largestTeamSize - 15) / 20 : 0;

  return Math.min((singleTeamRisk * 0.7 + largeTeamRisk * 0.3), 1);
}

/**
 * Compute org complexity risk score (0-1).
 * Higher value = more risk.
 */
function computeOrgComplexityRisk(treeDepth: number): number {
  // Depth >= 5 is considered too centralized/complex
  if (treeDepth >= 5) return 1;
  if (treeDepth >= 4) return 0.7;
  if (treeDepth >= 3) return 0.4;
  if (treeDepth >= 2) return 0.2;
  return 0;
}

/**
 * Compute Org health signals from ContextObjects.
 * Uses weighted risk model with role structure as a first-class component.
 */
export function computeOrgHealthSignals(params: {
  people: ContextObject[];
  teams: ContextObject[];
  departments: ContextObject[];
  roles: ContextObject[];
  treeDepth?: number;
}): OrgHealth {
  const { people, teams, roles, treeDepth = 0 } = params;

  // Compute role health
  const roleHealth = computeRoleHealth(roles ?? []);

  // Span of control calculation
  // Count managers with > 7 direct reports as overloaded, < 2 as underloaded
  let overloadedManagers = 0;
  let underloadedManagers = 0;

  for (const person of people) {
    if (person.type !== "person") continue;
    const relations = person.relations ?? [];
    const directReports = relations.filter(
      (rel) => rel.type === "reports_to" && rel.targetId === person.id
    );
    const reportCount = directReports.length;

    if (reportCount > 7) {
      overloadedManagers++;
    } else if (reportCount < 2 && reportCount > 0) {
      underloadedManagers++;
    }
  }

  // Team balance: count single-person teams
  let singlePointTeams = 0;
  let largestTeamSize = 0;

  for (const team of teams) {
    if (team.type !== "team") continue;
    const relations = team.relations ?? [];
    const members = relations.filter(
      (rel) => rel.type === "has_person" || rel.type === "has_member"
    );
    const memberCount = members.length;

    if (memberCount === 1) {
      singlePointTeams++;
    }
    if (memberCount > largestTeamSize) {
      largestTeamSize = memberCount;
    }
  }

  // Compute risk scores (0-1, higher = more risk)
  const spanOfControlRisk = computeSpanOfControlRisk(
    overloadedManagers,
    underloadedManagers,
    people.length
  );
  const teamStructureRisk = computeTeamStructureRisk(
    singlePointTeams,
    largestTeamSize,
    teams.length
  );
  const orgComplexityRisk = computeOrgComplexityRisk(treeDepth);
  const roleStructureRisk = computeRoleStructureRisk(roleHealth);

  // Weighted risk model
  const WEIGHT_SPAN = 0.35;
  const WEIGHT_TEAM = 0.30;
  const WEIGHT_COMPLEXITY = 0.15;
  const WEIGHT_ROLES = 0.20;

  const totalRisk =
    spanOfControlRisk * WEIGHT_SPAN +
    teamStructureRisk * WEIGHT_TEAM +
    orgComplexityRisk * WEIGHT_COMPLEXITY +
    roleStructureRisk * WEIGHT_ROLES;

  // Convert risk (0..1) into score (0..100)
  const score = Math.round((1 - totalRisk) * 100);
  const clampedScore = Math.max(0, Math.min(100, score));

  // Determine label
  let label: string;
  if (clampedScore >= 80) {
    label = "Healthy";
  } else if (clampedScore >= 60) {
    label = "Stable";
  } else if (clampedScore >= 40) {
    label = "At Risk";
  } else {
    label = "Critical";
  }

  return {
    score: clampedScore,
    label,
    orgShape: {
      depth: treeDepth,
      centralized: treeDepth >= 5,
    },
    spanOfControl: {
      overloadedManagers,
      underloadedManagers,
    },
    teamBalance: {
      singlePointTeams,
      largestTeamSize,
    },
    roles: roleHealth,
  };
}

// Export helper for UI use
export { computeRoleStructureRisk };

