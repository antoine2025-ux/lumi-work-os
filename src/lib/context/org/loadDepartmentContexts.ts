// src/lib/context/org/loadDepartmentContexts.ts

import { prisma } from "@/lib/db";
import {
  buildDepartmentContext,
  type DepartmentContextInput,
} from "./buildDepartmentContext";
import type { DepartmentContextObject } from "./departmentContextTypes";

/**
 * Load department-level context for ALL active departments in a workspace.
 *
 * For each department:
 *  - Compute number of teams
 *  - Compute positions + filled positions
 *  - Compute number of people (workspace members associated to the department)
 *  - Build DepartmentContextObject via buildDepartmentContext(...)
 */
export async function loadDepartmentContexts(
  workspaceId: string
): Promise<DepartmentContextObject[]> {
  if (!workspaceId) {
    throw new Error("loadDepartmentContexts: workspaceId is required");
  }

  // 1) Fetch all active departments for this workspace
  const departments = await prisma.orgDepartment.findMany({
    where: {
      workspaceId,
      isActive: true,
    },
    select: {
      id: true,
      workspaceId: true,
      name: true,
      description: true,
      color: true,
      order: true,
      isActive: true,
    },
    orderBy: {
      order: "asc",
    },
  });

  if (departments.length === 0) {
    return [];
  }

  const departmentIds = departments.map((d) => d.id);

  // 2) Compute metrics per department in as few queries as possible

  // Teams per department
  const teamsByDepartment = await prisma.orgTeam.groupBy({
    by: ["departmentId"],
    where: {
      workspaceId,
      isActive: true,
      departmentId: {
        in: departmentIds,
      },
    },
    _count: { id: true },
  });

  // Positions per department (via team.departmentId)
  const positionsByDepartment = await prisma.orgPosition.groupBy({
    by: ["teamId"],
    where: {
      workspaceId,
      isActive: true,
      team: {
        departmentId: {
          in: departmentIds,
        },
      },
    },
    _count: { id: true },
  });

  // Filled positions per department (positions with userId not null)
  const filledPositionsByDepartment = await prisma.orgPosition.groupBy({
    by: ["teamId"],
    where: {
      workspaceId,
      isActive: true,
      userId: {
        not: null,
      },
      team: {
        departmentId: {
          in: departmentIds,
        },
      },
    },
    _count: { id: true },
  });

  // People per department:
  // We approximate: all workspace members whose orgPosition.team.departmentId matches.
  //
  // This requires joining workspace_members -> users -> org_positions (userId)
  // -> org_team -> org_department. Prisma's groupBy can't easily cross multiple relations,
  // so we do a simple aggregate using findMany and reduce in memory.
  const positionsWithUsersAndTeam = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      userId: {
        not: null,
      },
      team: {
        departmentId: {
          in: departmentIds,
        },
      },
    },
    select: {
      id: true,
      teamId: true,
      userId: true,
      team: {
        select: {
          departmentId: true,
        },
      },
    },
  });

  // Helper maps
  const teamsCountMap = new Map<string, number>();
  const positionsCountMap = new Map<string, number>();
  const filledPositionsCountMap = new Map<string, number>();
  const peopleCountMap = new Map<string, number>();

  // Map teamsByDepartment -> teamsCountMap
  for (const row of teamsByDepartment) {
    if (row.departmentId) {
      teamsCountMap.set(row.departmentId, row._count.id);
    }
  }

  // Map positionsByDepartment -> positionsCountMap
  // positionsByDepartment is grouped by teamId; we need to derive departmentId.
  // We'll fetch teams for those teamIds first.
  const teamIdsForPositions = positionsByDepartment.map((p) => p.teamId).filter((id): id is string => id !== null);
  const teamsForPositions = teamIdsForPositions.length
    ? await prisma.orgTeam.findMany({
        where: { id: { in: teamIdsForPositions } },
        select: { id: true, departmentId: true },
      })
    : [];

  const teamIdToDepartmentId = new Map<string, string>();
  for (const t of teamsForPositions) {
    if (t.departmentId) {
      teamIdToDepartmentId.set(t.id, t.departmentId);
    }
  }

  for (const row of positionsByDepartment) {
    if (!row.teamId) continue;
    const departmentId = teamIdToDepartmentId.get(row.teamId);
    if (!departmentId) continue;
    const prev = positionsCountMap.get(departmentId) ?? 0;
    positionsCountMap.set(departmentId, prev + row._count.id);
  }

  // Map filledPositionsByDepartment similarly
  const teamIdsForFilled = filledPositionsByDepartment.map((p) => p.teamId).filter((id): id is string => id !== null);
  const teamsForFilled = teamIdsForFilled.length
    ? await prisma.orgTeam.findMany({
        where: { id: { in: teamIdsForFilled } },
        select: { id: true, departmentId: true },
      })
    : [];

  const teamIdToDepartmentIdForFilled = new Map<string, string>();
  for (const t of teamsForFilled) {
    if (t.departmentId) {
      teamIdToDepartmentIdForFilled.set(t.id, t.departmentId);
    }
  }

  for (const row of filledPositionsByDepartment) {
    if (!row.teamId) continue;
    const departmentId = teamIdToDepartmentIdForFilled.get(row.teamId);
    if (!departmentId) continue;
    const prev = filledPositionsCountMap.get(departmentId) ?? 0;
    filledPositionsCountMap.set(departmentId, prev + row._count.id);
  }

  // People per department: dedupe by userId per department
  const peoplePerDepartmentUsers = new Map<string, Set<string>>();
  for (const pos of positionsWithUsersAndTeam) {
    const departmentId = pos.team?.departmentId;
    const userId = pos.userId;
    if (!departmentId || !userId) continue;

    if (!peoplePerDepartmentUsers.has(departmentId)) {
      peoplePerDepartmentUsers.set(departmentId, new Set<string>());
    }

    peoplePerDepartmentUsers.get(departmentId)!.add(userId);
  }

  for (const [departmentId, usersSet] of peoplePerDepartmentUsers.entries()) {
    peopleCountMap.set(departmentId, usersSet.size);
  }

  // 3) Build DepartmentContextObject for each department
  const results: DepartmentContextObject[] = [];

  for (const dept of departments) {
    const teamsCount = teamsCountMap.get(dept.id) ?? 0;
    const positionsCount = positionsCountMap.get(dept.id) ?? 0;
    const filledPositionsCount = filledPositionsCountMap.get(dept.id) ?? 0;
    const peopleCount = peopleCountMap.get(dept.id) ?? 0;

    // Simple heuristic for initial health
    const hasStructure =
      teamsCount > 0 || positionsCount > 0 || peopleCount > 0;

    const healthStatusLabel: DepartmentContextInput["healthStatusLabel"] =
      !hasStructure
        ? "incomplete"
        : peopleCount === 0
        ? "incomplete"
        : "ok";

    const healthNotes =
      !hasStructure
        ? "Department has no teams/positions/people configured yet."
        : peopleCount === 0
        ? "Department has structural entities, but no people assigned."
        : "Department has teams and people; detailed health to be refined later.";

    const input: DepartmentContextInput = {
      workspaceId,
      departmentId: dept.id,
      departmentName: dept.name,
      departmentDescription: dept.description ?? null,
      departmentColor: dept.color ?? null,
      departmentOrder: dept.order ?? null,
      departmentIsActive: dept.isActive,
      teamsCount,
      positionsCount,
      filledPositionsCount,
      peopleCount,
      healthStatusLabel,
      healthNotes,
      tags: [],
    };

    const contextObject = buildDepartmentContext(input);
    results.push(contextObject);
  }

  return results;
}

