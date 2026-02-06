/**
 * Team Capacity Rollup
 *
 * Capacity v1: Aggregate person-level effective capacity into team metrics.
 *
 * Active OrgPosition definition:
 * - isActive === true AND archivedAt === null
 * - userId !== null AND linked WorkspaceMember employmentStatus !== "TERMINATED"
 *
 * Department utilization = weighted average by effective available hours
 * (not simple arithmetic mean).
 *
 * Invariant: All capacity numbers originate from resolveEffectiveCapacityBatch.
 * This module never recomputes utilization ad-hoc.
 */

import { prisma } from "@/lib/db";
import { resolveEffectiveCapacityBatch, type EffectiveCapacity } from "./resolveEffectiveCapacity";
import { getDefaultIssueWindow, getWorkspaceThresholdsAsync, type CapacityThresholds } from "./thresholds";
import { getPersonCapacityStatus, type PersonCapacityMeta, type TeamCapacityRollup } from "./status";

// ============================================================================
// Types
// ============================================================================

export type TeamMemberCapacity = {
  personId: string;
  personName: string;
  teamId: string;
  positionTitle: string | null;
  capacity: EffectiveCapacity;
  meta: PersonCapacityMeta;
};

export type DepartmentCapacityRollup = {
  departmentId: string;
  departmentName: string;
  teamCount: number;
  memberCount: number;
  /** Weighted by available hours, not simple mean */
  availableHours: number;
  allocatedHours: number;
  utilizationPct: number;
  missingDataCount: number;
};

// ============================================================================
// Core Computation (Pure Functions)
// ============================================================================

/**
 * Compute team capacity rollup from pre-resolved member capacities.
 * Pure function — no database calls.
 */
export function computeTeamCapacityRollup(
  teamId: string,
  teamName: string,
  departmentId: string | null,
  members: TeamMemberCapacity[],
  teamPlan: { weeklyDemandHours: number } | null
): TeamCapacityRollup {
  let totalAvailableHours = 0;
  let totalAllocatedHours = 0;
  let missingDataCount = 0;

  for (const member of members) {
    const availHours = member.capacity.contractedHoursForWindow * member.capacity.availabilityFactor;
    totalAvailableHours += availHours;
    totalAllocatedHours += member.capacity.allocatedHours;

    if (member.meta.isContractDefault && !member.meta.hasAvailabilityData) {
      missingDataCount++;
    }
  }

  const utilizationPct = totalAvailableHours > 0
    ? totalAllocatedHours / totalAvailableHours
    : 0;

  const weeklyDemandHours = teamPlan?.weeklyDemandHours ?? null;
  const demandGapHours = weeklyDemandHours !== null
    ? totalAvailableHours - weeklyDemandHours
    : null;

  return {
    teamId,
    teamName,
    departmentId,
    memberCount: members.length,
    availableHours: totalAvailableHours,
    allocatedHours: totalAllocatedHours,
    utilizationPct,
    missingDataCount,
    weeklyDemandHours,
    demandGapHours,
  };
}

/**
 * Compute department rollup from team rollups.
 * Uses weighted average by available hours (not simple mean).
 * Departments with 0 total available hours show utilizationPct = 0.
 */
export function computeDepartmentRollup(
  departmentId: string,
  departmentName: string,
  teamRollups: TeamCapacityRollup[]
): DepartmentCapacityRollup {
  let totalAvailable = 0;
  let totalAllocated = 0;
  let totalMembers = 0;
  let totalMissing = 0;

  for (const team of teamRollups) {
    totalAvailable += team.availableHours;
    totalAllocated += team.allocatedHours;
    totalMembers += team.memberCount;
    totalMissing += team.missingDataCount;
  }

  return {
    departmentId,
    departmentName,
    teamCount: teamRollups.length,
    memberCount: totalMembers,
    availableHours: totalAvailable,
    allocatedHours: totalAllocated,
    utilizationPct: totalAvailable > 0 ? totalAllocated / totalAvailable : 0,
    missingDataCount: totalMissing,
  };
}

// ============================================================================
// Batch Resolver (Database-backed)
// ============================================================================

/**
 * Compute capacity rollups for all teams in a workspace.
 *
 * Steps:
 * 1. Fetch active team members via OrgPosition
 * 2. Batch resolve effective capacity for all people
 * 3. Check contract/availability data presence per person
 * 4. Group by team and compute rollups
 */
export async function computeAllTeamRollups(
  workspaceId: string
): Promise<{
  teamRollups: TeamCapacityRollup[];
  memberCapacities: TeamMemberCapacity[];
  settings: CapacityThresholds;
}> {
  const issueWindow = getDefaultIssueWindow();
  const settings = await getWorkspaceThresholdsAsync(workspaceId);

  // 1. Fetch active positions with team assignments and user info
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      archivedAt: null,
      userId: { not: null },
      teamId: { not: null },
      user: {
        workspaceMembers: {
          some: {
            workspaceId,
            employmentStatus: { not: "TERMINATED" },
          },
        },
      },
    },
    select: {
      userId: true,
      teamId: true,
      title: true,
      team: {
        select: {
          id: true,
          name: true,
          departmentId: true,
          isActive: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Filter to active teams only
  const activePositions = positions.filter(p => p.team?.isActive);

  // Deduplicate personIds (a person could have multiple positions)
  const personIds = [...new Set(activePositions.map(p => p.userId!))];

  if (personIds.length === 0) {
    return { teamRollups: [], memberCapacities: [], settings };
  }

  // 2. Batch resolve effective capacity
  const capacityMap = await resolveEffectiveCapacityBatch(
    workspaceId,
    personIds,
    { start: issueWindow.start, end: issueWindow.end }
  );

  // 3. Check data presence for missing-data detection
  const [contractCounts, availabilityCounts] = await Promise.all([
    prisma.capacityContract.groupBy({
      by: ["personId"],
      where: {
        workspaceId,
        personId: { in: personIds },
        effectiveFrom: { lte: issueWindow.start },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: issueWindow.start } },
        ],
      },
      _count: true,
    }),
    prisma.personAvailability.groupBy({
      by: ["personId"],
      where: {
        workspaceId,
        personId: { in: personIds },
        startDate: { lte: issueWindow.end },
        OR: [
          { endDate: null },
          { endDate: { gte: issueWindow.start } },
        ],
      },
      _count: true,
    }),
  ]);

  const contractCountMap = new Map(contractCounts.map(c => [c.personId, c._count]));
  const availabilityCountMap = new Map(availabilityCounts.map(a => [a.personId, a._count]));

  // 4. Build member capacities and group by team
  const memberCapacities: TeamMemberCapacity[] = [];
  const teamMembersMap = new Map<string, TeamMemberCapacity[]>();
  const teamInfoMap = new Map<string, { name: string; departmentId: string | null }>();

  for (const pos of activePositions) {
    const personId = pos.userId!;
    const teamId = pos.teamId!;
    const capacity = capacityMap.get(personId);
    if (!capacity) continue;

    if (!teamInfoMap.has(teamId)) {
      teamInfoMap.set(teamId, {
        name: pos.team!.name,
        departmentId: pos.team!.departmentId,
      });
    }

    const meta: PersonCapacityMeta = {
      isContractDefault: (contractCountMap.get(personId) ?? 0) === 0,
      hasAvailabilityData: (availabilityCountMap.get(personId) ?? 0) > 0,
    };

    const memberCap: TeamMemberCapacity = {
      personId,
      personName: pos.user?.name ?? personId,
      teamId,
      positionTitle: pos.title,
      capacity,
      meta,
    };

    memberCapacities.push(memberCap);

    if (!teamMembersMap.has(teamId)) {
      teamMembersMap.set(teamId, []);
    }
    teamMembersMap.get(teamId)!.push(memberCap);
  }

  // 5. Fetch team demand plans
  const teamIds = [...teamMembersMap.keys()];
  const teamPlans = teamIds.length > 0
    ? await prisma.teamCapacityPlan.findMany({
        where: { workspaceId, teamId: { in: teamIds } },
        select: { teamId: true, weeklyDemandHours: true },
      })
    : [];
  const teamPlanMap = new Map(teamPlans.map(p => [p.teamId, p]));

  // 6. Also include teams with 0 members (for CAPACITY_TEAM_NO_MEMBERS detection)
  const allActiveTeams = await prisma.orgTeam.findMany({
    where: { workspaceId, isActive: true },
    select: { id: true, name: true, departmentId: true },
  });

  // 7. Compute rollups
  const teamRollups: TeamCapacityRollup[] = [];

  for (const team of allActiveTeams) {
    const members = teamMembersMap.get(team.id) ?? [];
    const plan = teamPlanMap.get(team.id) ?? null;

    teamRollups.push(
      computeTeamCapacityRollup(
        team.id,
        team.name,
        team.departmentId,
        members,
        plan
      )
    );
  }

  return { teamRollups, memberCapacities, settings };
}
