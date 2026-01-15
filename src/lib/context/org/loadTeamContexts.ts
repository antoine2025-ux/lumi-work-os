// src/lib/context/org/loadTeamContexts.ts

import { prisma } from "@/lib/db";
import {
  buildTeamContext,
  type TeamContextInput,
} from "./buildTeamContext";
import type { TeamContextObject } from "./teamContextTypes";

/**
 * Load team-level context for ALL active teams in a workspace.
 *
 * For each team:
 *  - Compute positionsCount, filledPositionsCount, peopleCount
 *  - Compute projectsCount, activeTasksCount, blockedTasksCount
 *  - Attach department info (id + name)
 *  - Build TeamContextObject via buildTeamContext(...)
 */
export async function loadTeamContexts(
  workspaceId: string
): Promise<TeamContextObject[]> {
  if (!workspaceId) {
    throw new Error("loadTeamContexts: workspaceId is required");
  }

  // 1) Fetch all active teams for this workspace, with their departments
  const teams = await prisma.orgTeam.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    select: {
      id: true,
      workspaceId: true,
      departmentId: true,
      name: true,
      description: true,
      color: true,
      order: true,
      isActive: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      order: "asc",
    },
  });

  if (teams.length === 0) {
    return [];
  }

  const teamIds = teams.map((t) => t.id);
  const teamNames = teams.map((t) => t.name);

  // 2) Compute structure metrics per team

  // Positions per team
  const positionsByTeam = await prisma.orgPosition.groupBy({
    by: ["teamId"],
    where: {
      workspaceId,
      isActive: true,
      teamId: {
        in: teamIds,
      },
    },
    _count: { id: true },
  });

  // Filled positions per team (positions with userId not null)
  const filledPositionsByTeam = await prisma.orgPosition.groupBy({
    by: ["teamId"],
    where: {
      workspaceId,
      isActive: true,
      userId: {
        not: null,
      },
      teamId: {
        in: teamIds,
      },
    },
    _count: { id: true },
  });

  // People per team:
  // We dedupe userIds per team, based on positions with userId + teamId.
  const positionsWithUsers = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      userId: {
        not: null,
      },
      teamId: {
        in: teamIds,
      },
    },
    select: {
      teamId: true,
      userId: true,
    },
  });

  const positionsCountMap = new Map<string, number>();
  const filledPositionsCountMap = new Map<string, number>();
  const peopleCountMap = new Map<string, number>();

  // Map positionsByTeam -> positionsCountMap
  for (const row of positionsByTeam) {
    if (!row.teamId) continue;
    positionsCountMap.set(row.teamId, row._count.id);
  }

  // Map filledPositionsByTeam -> filledPositionsCountMap
  for (const row of filledPositionsByTeam) {
    if (!row.teamId) continue;
    filledPositionsCountMap.set(row.teamId, row._count.id);
  }

  // People per team: dedupe userId per teamId
  const peoplePerTeamUsers = new Map<string, Set<string>>();
  for (const pos of positionsWithUsers) {
    const teamId = pos.teamId;
    const userId = pos.userId;
    if (!teamId || !userId) continue;

    if (!peoplePerTeamUsers.has(teamId)) {
      peoplePerTeamUsers.set(teamId, new Set<string>());
    }

    peoplePerTeamUsers.get(teamId)!.add(userId);
  }

  for (const [teamId, usersSet] of peoplePerTeamUsers.entries()) {
    peopleCountMap.set(teamId, usersSet.size);
  }

  // 3) Workload metrics per team (projects + tasks).
  //
  // We rely on Project.team (string) to align with OrgTeam.name.
  // This is a pragmatic approximation that will work if your
  // project.team field uses the same naming as orgTeams.name.

  // Projects by team name
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      team: {
        in: teamNames,
      },
      isArchived: false,
    },
    select: {
      id: true,
      team: true,
      status: true,
    },
  });

  const projectsCountByTeamName = new Map<string, number>();
  for (const project of projects) {
    const teamName = project.team ?? "";
    if (!teamName) continue;
    const prev = projectsCountByTeamName.get(teamName) ?? 0;
    projectsCountByTeamName.set(teamName, prev + 1);
  }

  // Tasks by team name, via project.team
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      project: {
        team: {
          in: teamNames,
        },
      },
    },
    select: {
      id: true,
      status: true,
      project: {
        select: {
          team: true,
        },
      },
    },
  });

  const activeTasksByTeamName = new Map<string, number>();
  const blockedTasksByTeamName = new Map<string, number>();

  const ACTIVE_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW"];
  const BLOCKED_STATUS = "BLOCKED";

  for (const t of tasks) {
    const teamName = t.project?.team ?? "";
    if (!teamName) continue;

    if (ACTIVE_STATUSES.includes(t.status)) {
      const prev = activeTasksByTeamName.get(teamName) ?? 0;
      activeTasksByTeamName.set(teamName, prev + 1);
    }

    if (t.status === BLOCKED_STATUS) {
      const prev = blockedTasksByTeamName.get(teamName) ?? 0;
      blockedTasksByTeamName.set(teamName, prev + 1);
    }
  }

  // 4) Build TeamContextObject for each team
  const results: TeamContextObject[] = [];

  for (const team of teams) {
    const teamId = team.id;
    const teamName = team.name;
    const departmentId = team.department?.id ?? team.departmentId ?? null;
    const departmentName = team.department?.name ?? null;

    const positionsCount = positionsCountMap.get(teamId) ?? 0;
    const filledPositionsCount = filledPositionsCountMap.get(teamId) ?? 0;
    const peopleCount = peopleCountMap.get(teamId) ?? 0;

    const projectsCount = projectsCountByTeamName.get(teamName) ?? 0;
    const activeTasksCount = activeTasksByTeamName.get(teamName) ?? 0;
    const blockedTasksCount = blockedTasksByTeamName.get(teamName) ?? 0;

    // Simple heuristic for initial health
    const hasStructure = positionsCount > 0 || peopleCount > 0;
    const hasWorkload = projectsCount > 0 || activeTasksCount > 0;

    const healthStatusLabel: TeamContextInput["healthStatusLabel"] =
      !hasStructure
        ? "incomplete"
        : hasWorkload
        ? "ok"
        : "incomplete";

    const healthNotes =
      !hasStructure
        ? "Team has no positions/people configured yet."
        : !hasWorkload
        ? "Team has structure but no active projects/tasks."
        : "Team has structure and active work; detailed health to be refined later.";

    const input: TeamContextInput = {
      workspaceId,
      teamId,
      teamName,
      teamDescription: team.description ?? null,
      teamColor: team.color ?? null,
      teamOrder: team.order ?? null,
      teamIsActive: team.isActive,
      departmentId,
      departmentName,
      positionsCount,
      filledPositionsCount,
      peopleCount,
      projectsCount,
      activeTasksCount,
      blockedTasksCount,
      healthStatusLabel,
      healthNotes,
      tags: [],
    };

    const contextObject = buildTeamContext(input);
    results.push(contextObject);
  }

  return results;
}

