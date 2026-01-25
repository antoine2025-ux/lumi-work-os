/**
 * Derived Metrics Service
 * 
 * Read-only metrics computed on-demand from org state.
 * Metrics are NOT stored - they are derived facts.
 * 
 * Metrics:
 * - Ownership coverage (percentage of teams/departments with owners)
 * - Span of control (average direct reports per manager)
 * - Orphan rate (percentage of unassigned entities)
 * - Structural imbalance (depth/width ratios)
 */

import { prisma } from "@/lib/db";
import { resolveTeamOwners, resolveDepartmentOwners } from "./ownership-resolver";

export type OrgMetrics = {
  ownershipCoverage: {
    teams: { total: number; owned: number; unowned: number; percentage: number };
    departments: { total: number; owned: number; unowned: number; percentage: number };
  };
  spanOfControl: {
    average: number;
    median: number;
    max: number;
    distribution: Array<{ span: number; count: number }>;
  };
  orphanRate: {
    teams: { unassigned: number; total: number; percentage: number };
    positions: { unfilled: number; total: number; percentage: number };
  };
  structuralImbalance: {
    maxDepth: number;
    averageDepth: number;
    avgTeamSize: number;
    avgDepartmentSize: number;
  };
};

/**
 * Compute all org metrics (read-only, on-demand).
 * 
 * @param workspaceId - Workspace ID
 * @returns Computed metrics
 */
export async function computeOrgMetrics(workspaceId: string): Promise<OrgMetrics> {
  // Fetch all teams and departments
  const [teams, departments, positions] = await Promise.all([
    prisma.orgTeam.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, departmentId: true },
    }),
    prisma.orgDepartment.findMany({
      where: { workspaceId, isActive: true, name: { not: { equals: "Unassigned" } } },
      select: { id: true },
    }),
    prisma.orgPosition.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true, userId: true, parentId: true, teamId: true },
    }),
  ]);

  // Compute ownership coverage using batch resolvers
  const teamIds = teams.map(t => t.id);
  const deptIds = departments.map(d => d.id);
  const [teamResolutions, deptResolutions] = await Promise.all([
    resolveTeamOwners(workspaceId, teamIds),
    resolveDepartmentOwners(workspaceId, deptIds),
  ]);

  const ownedTeams = Array.from(teamResolutions.values()).filter(r => r.ownerPersonId !== null).length;
  const ownedDepartments = Array.from(deptResolutions.values()).filter(r => r.ownerPersonId !== null).length;

  // Compute span of control (average direct reports per manager)
  const managerChildren = new Map<string, number>();
  for (const pos of positions) {
    if (pos.parentId) {
      managerChildren.set(pos.parentId, (managerChildren.get(pos.parentId) || 0) + 1);
    }
  }
  const spans = Array.from(managerChildren.values());
  const averageSpan = spans.length > 0 ? spans.reduce((a, b) => a + b, 0) / spans.length : 0;
  const sortedSpans = [...spans].sort((a, b) => a - b);
  const medianSpan = sortedSpans.length > 0
    ? sortedSpans[Math.floor(sortedSpans.length / 2)]
    : 0;
  const maxSpan = spans.length > 0 ? Math.max(...spans) : 0;

  // Span distribution (buckets: 0, 1-3, 4-7, 8-15, 16+)
  const distribution: Array<{ span: number; count: number }> = [
    { span: 0, count: positions.filter(p => !p.parentId && p.userId).length },
    { span: 1, count: spans.filter(s => s >= 1 && s <= 3).length },
    { span: 4, count: spans.filter(s => s >= 4 && s <= 7).length },
    { span: 8, count: spans.filter(s => s >= 8 && s <= 15).length },
    { span: 16, count: spans.filter(s => s >= 16).length },
  ];

  // Compute orphan rate
  const unassignedTeams = teams.filter(t => t.departmentId === null).length;
  const unfilledPositions = positions.filter(p => !p.userId).length;

  // Compute structural imbalance (depth/width)
  // Build parent-child map
  const parentMap = new Map<string, string>();
  for (const pos of positions) {
    if (pos.parentId) {
      parentMap.set(pos.id, pos.parentId);
    }
  }

  // Compute depth for each position
  const depthMap = new Map<string, number>();
  const computeDepth = (posId: string): number => {
    if (depthMap.has(posId)) {
      return depthMap.get(posId)!;
    }
    const parentId = parentMap.get(posId);
    if (!parentId) {
      depthMap.set(posId, 1);
      return 1;
    }
    const depth = 1 + computeDepth(parentId);
    depthMap.set(posId, depth);
    return depth;
  };

  for (const pos of positions) {
    if (!depthMap.has(pos.id)) {
      computeDepth(pos.id);
    }
  }

  const depths = Array.from(depthMap.values());
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
  const averageDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 0;

  // Team and department sizes
  const teamSizeMap = new Map<string, number>();
  for (const pos of positions) {
    if (pos.teamId) {
      teamSizeMap.set(pos.teamId, (teamSizeMap.get(pos.teamId) || 0) + 1);
    }
  }
  const teamSizes = Array.from(teamSizeMap.values());
  const avgTeamSize = teamSizes.length > 0 ? teamSizes.reduce((a, b) => a + b, 0) / teamSizes.length : 0;

  const deptTeamMap = new Map<string, number>();
  for (const team of teams) {
    if (team.departmentId) {
      deptTeamMap.set(team.departmentId, (deptTeamMap.get(team.departmentId) || 0) + 1);
    }
  }
  const deptSizes = Array.from(deptTeamMap.values());
  const avgDepartmentSize = deptSizes.length > 0 ? deptSizes.reduce((a, b) => a + b, 0) / deptSizes.length : 0;

  return {
    ownershipCoverage: {
      teams: {
        total: teams.length,
        owned: ownedTeams,
        unowned: teams.length - ownedTeams,
        percentage: teams.length > 0 ? (ownedTeams / teams.length) * 100 : 0,
      },
      departments: {
        total: departments.length,
        owned: ownedDepartments,
        unowned: departments.length - ownedDepartments,
        percentage: departments.length > 0 ? (ownedDepartments / departments.length) * 100 : 0,
      },
    },
    spanOfControl: {
      average: averageSpan,
      median: medianSpan,
      max: maxSpan,
      distribution,
    },
    orphanRate: {
      teams: {
        unassigned: unassignedTeams,
        total: teams.length,
        percentage: teams.length > 0 ? (unassignedTeams / teams.length) * 100 : 0,
      },
      positions: {
        unfilled: unfilledPositions,
        total: positions.length,
        percentage: positions.length > 0 ? (unfilledPositions / positions.length) * 100 : 0,
      },
    },
    structuralImbalance: {
      maxDepth,
      averageDepth,
      avgTeamSize,
      avgDepartmentSize,
    },
  };
}
