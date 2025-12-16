import type { OrgChartData } from "@/hooks/useOrgChartData";
import type { OrgChartNode } from "./OrgChart.types";

/**
 * Transform the existing OrgChartData structure (departments → teams)
 * into a hierarchical OrgChartNode[] structure for the interactive chart.
 */
export function transformChartData(data: OrgChartData): OrgChartNode[] {
  return data.departments.map((dept) => {
    const departmentNode: OrgChartNode = {
      id: dept.id,
      name: dept.name,
      type: "department",
      parentId: null,
      memberCount: dept.teams.reduce((sum, team) => sum + team.headcount, 0),
      children: dept.teams.map((team) => ({
        id: team.id,
        name: team.name,
        type: "team",
        parentId: dept.id,
        memberCount: team.headcount,
        children: undefined,
      })),
    };

    return departmentNode;
  });
}

