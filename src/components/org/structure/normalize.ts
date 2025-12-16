/**
 * Normalize raw org structure data into a consistent view model
 */

import type { StructureDepartment, StructureTeam } from "@/types/org";
import type { OrgStructureDepartment, OrgStructureTeam } from "./normalized-types";
import { getInitials } from "./utils";

/**
 * Normalize raw structure data into OrgStructureDepartment array
 */
export function normaliseOrgStructure(
  departments: StructureDepartment[],
  teams: StructureTeam[] | null
): OrgStructureDepartment[] {
  if (!teams) {
    return departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      teamsCount: 0,
      peopleCount: 0,
      teams: [],
    }));
  }

  return departments.map((dept) => {
    const deptTeams = teams.filter((t) => t.departmentId === dept.id);
    const totalPeople = deptTeams.reduce((sum, team) => sum + team.memberCount, 0);

    const normalizedTeams: OrgStructureTeam[] = deptTeams.map((team) => ({
      id: team.id,
      name: team.name,
      peopleCount: team.memberCount,
      lead: team.leadName
        ? {
            id: team.id, // Using team id as placeholder for lead id
            name: team.leadName,
            initials: getInitials(team.leadName),
          }
        : null,
      href: `/org/structure?tab=teams&teamId=${team.id}`,
    }));

    return {
      id: dept.id,
      name: dept.name,
      teamsCount: deptTeams.length,
      peopleCount: totalPeople,
      teams: normalizedTeams,
    };
  });
}

