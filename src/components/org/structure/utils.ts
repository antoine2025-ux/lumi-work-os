/**
 * Utility functions for Organization Structure
 */

import type { StructureDepartment, StructureTeam } from "@/types/org";
import type { OrgTreeNode } from "./types";

/**
 * Helper function to get initials from a name
 */
export function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Map departments and teams to tree node structure
 */
export function mapDepartmentsToTreeNodes(
  departments: StructureDepartment[],
  teams: StructureTeam[] | null
): OrgTreeNode[] {
  if (!teams) return [];

  return departments.map((dept) => {
    const deptTeams = teams.filter((t) => t.departmentId === dept.id);
    const totalPeople = deptTeams.reduce((sum, team) => sum + team.memberCount, 0);

    const children: OrgTreeNode[] = deptTeams.map((team) => ({
      id: team.id,
      type: "team" as const,
      name: team.name,
      peopleCount: team.memberCount,
      lead: team.leadName
        ? {
            id: team.id, // Using team id as placeholder
            name: team.leadName,
            initials: getInitials(team.leadName),
          }
        : undefined,
    }));

    return {
      id: dept.id,
      type: "department" as const,
      name: dept.name,
      peopleCount: totalPeople,
      teamCount: deptTeams.length,
      children: children.length > 0 ? children : undefined,
    };
  });
}

