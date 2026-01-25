/**
 * Structure Resolver
 *
 * Pure function that computes structure signals from intelligence data.
 * No side effects, no Prisma calls, no writes.
 *
 * See docs/org/intelligence-rules.md for canonical rules.
 */

import type { IntelligenceData } from "../queries";
import type { StructureSignals, EntityRef, ExplainableIssue } from "../snapshotTypes";
import { createEntityRef, ISSUE_PREVIEW_COUNT } from "../snapshotTypes";

/**
 * Resolve structure signals from intelligence data.
 * Pure function: same input produces same output.
 *
 * @param data - Intelligence data from loadIntelligenceData()
 * @returns Structure signals
 */
export function resolveStructureSignals(data: IntelligenceData): StructureSignals {
  const issues: ExplainableIssue[] = [];

  // Track entities with missing names for data quality issue
  const entitiesWithMissingNames: Array<{ type: "team" | "department"; id: string }> = [];

  // Build department refs
  const departments: EntityRef[] = data.departments.map((d) => {
    if (!d.name) {
      entitiesWithMissingNames.push({ type: "department", id: d.id });
    }
    return createEntityRef("department", d.id, d.name);
  });

  // Build teams by department mapping
  const teamsByDepartment: Record<string, EntityRef[]> = {};
  const unassignedTeams: EntityRef[] = [];

  for (const team of data.teams) {
    if (!team.name) {
      entitiesWithMissingNames.push({ type: "team", id: team.id });
    }
    const teamRef = createEntityRef("team", team.id, team.name);

    if (team.departmentId) {
      if (!teamsByDepartment[team.departmentId]) {
        teamsByDepartment[team.departmentId] = [];
      }
      teamsByDepartment[team.departmentId].push(teamRef);
    } else {
      // Unassigned team (departmentId = null)
      unassignedTeams.push(teamRef);
    }
  }

  // Emit single aggregated issue for missing entity names (data quality)
  if (entitiesWithMissingNames.length > 0) {
    const teamCount = entitiesWithMissingNames.filter((e) => e.type === "team").length;
    const deptCount = entitiesWithMissingNames.filter((e) => e.type === "department").length;
    const parts: string[] = [];
    if (teamCount > 0) parts.push(`${teamCount} team(s)`);
    if (deptCount > 0) parts.push(`${deptCount} department(s)`);

    issues.push({
      code: "STRUCTURE_MISSING_ENTITY_NAME",
      severity: "warning",
      title: "Entities with missing names",
      detail: `${parts.join(" and ")} have null/empty names. Using fallback names in UI.`,
      // Preview list for actionability without being huge
      entities: entitiesWithMissingNames
        .slice(0, ISSUE_PREVIEW_COUNT)
        .map((e) => createEntityRef(e.type, e.id, null)),
      meta: {
        count: entitiesWithMissingNames.length,
        teamCount,
        deptCount,
        aggregated: entitiesWithMissingNames.length > ISSUE_PREVIEW_COUNT,
      },
    });
  }

  // Find departments without teams
  const departmentsWithoutTeams: EntityRef[] = departments.filter(
    (dept) => !teamsByDepartment[dept.id] || teamsByDepartment[dept.id].length === 0
  );

  // Add issues for empty departments
  for (const dept of departmentsWithoutTeams) {
    issues.push({
      code: "STRUCTURE_EMPTY_DEPARTMENT",
      severity: "info",
      title: "Department has no teams",
      detail: `"${dept.name}" has no teams assigned.`,
      entities: [dept],
    });
  }

  // Add issues for unassigned teams
  for (const team of unassignedTeams) {
    issues.push({
      code: "STRUCTURE_UNASSIGNED_TEAM",
      severity: "info",
      title: "Team has no department",
      detail: `"${team.name}" is not assigned to any department.`,
      entities: [team],
    });
  }

  // Check if team-person relation is modeled
  const hasTeamPersonRelation = data.people.some((p) => p.teamId !== null);

  let teamsWithoutPeople: EntityRef[] = [];
  let peopleWithoutTeams: EntityRef[] = [];

  if (!hasTeamPersonRelation) {
    // Schema guard: relation not modeled, emit info issue
    issues.push({
      code: "STRUCTURE_TEAM_PERSON_RELATION_NOT_MODELED",
      severity: "info",
      title: "Team-person relation not modeled",
      detail: "OrgPosition.teamId is not populated. Team membership analysis unavailable.",
      entities: [],
    });
  } else {
    // Compute teams without people
    const teamsWithPeople = new Set(
      data.people.filter((p) => p.teamId).map((p) => p.teamId!)
    );

    teamsWithoutPeople = data.teams
      .filter((t) => t.departmentId !== null && !teamsWithPeople.has(t.id))
      .map((t) => createEntityRef("team", t.id, t.name));

    // Compute people without teams
    peopleWithoutTeams = data.people
      .filter((p) => !p.teamId)
      .map((p) => createEntityRef("person", p.id, p.name));
  }

  return {
    departments,
    teamsByDepartment,
    unassignedTeams,
    departmentsWithoutTeams,
    teamsWithoutPeople,
    peopleWithoutTeams,
    issues,
  };
}
