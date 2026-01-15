// src/lib/context/org/loadPersonContexts.ts

import { prisma } from "@/lib/db";
import {
  buildPersonContext,
  type PersonContextInput,
} from "./buildPersonContext";
import type { PersonContextObject } from "./personContextTypes";

/**
 * Load person-level context for ALL active users in a workspace.
 *
 * For each person:
 *  - Join to OrgPosition + OrgTeam + OrgDepartment
 *  - Resolve manager + direct reports (via OrgPosition)
 *  - Compute workload metrics (projects + tasks)
 *  - Build PersonContextObject via buildPersonContext(...)
 */
export async function loadPersonContexts(
  workspaceId: string
): Promise<PersonContextObject[]> {
  if (!workspaceId) {
    throw new Error("loadPersonContexts: workspaceId is required");
  }

  // 1) Fetch all active workspace members + associated user records
  //    (We treat workspace membership as the canonical "in org" filter)
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
    },
    select: {
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
        },
      },
    },
  });

  if (members.length === 0) {
    return [];
  }

  const userIds = members
    .map((m) => m.user?.id)
    .filter((id): id is string => Boolean(id));

  if (userIds.length === 0) {
    return [];
  }

  // 2) Fetch OrgPosition records for these users in this workspace
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      isActive: true,
      userId: {
        in: userIds,
      },
    },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      title: true,
      level: true,
      teamId: true,
      parentId: true,
      responsibilities: true,
      keyMetrics: true,
    },
  });

  // Map: userId -> OrgPosition
  const positionByUserId = new Map<string, (typeof positions)[number]>();
  for (const pos of positions) {
    if (!pos.userId) continue;
    // If multiple positions per user exist, we keep the first; we can refine later.
    if (!positionByUserId.has(pos.userId)) {
      positionByUserId.set(pos.userId, pos);
    }
  }

  const positionIds = positions.map((p) => p.id);

  // 3) Fetch teams referenced by positions
  const teamIds = positions
    .map((p) => p.teamId)
    .filter((id): id is string => Boolean(id));

  const teams = teamIds.length
    ? await prisma.orgTeam.findMany({
        where: {
          workspaceId,
          id: {
            in: teamIds,
          },
        },
        select: {
          id: true,
          name: true,
          departmentId: true,
        },
      })
    : [];

  const teamById = new Map<string, (typeof teams)[number]>();
  for (const team of teams) {
    teamById.set(team.id, team);
  }

  // 4) Fetch departments for referenced teams
  const departmentIdsFromTeams = teams
    .map((t) => t.departmentId)
    .filter((id): id is string => Boolean(id));

  const departmentIds = Array.from(new Set(departmentIdsFromTeams));

  const departments = departmentIds.length
    ? await prisma.orgDepartment.findMany({
        where: {
          workspaceId,
          id: {
            in: departmentIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      })
    : [];

  const departmentById = new Map<string, (typeof departments)[number]>();
  for (const dept of departments) {
    departmentById.set(dept.id, dept);
  }

  // 5) Resolve manager relationships via OrgPosition.parentId
  //
  // We assume:
  //  - OrgPosition.parentId -> another OrgPosition.id (the manager's position)
  //  - manager's userId -> the "manager person"
  //
  // Build position-by-id map to follow parentId.
  const positionById = new Map<string, (typeof positions)[number]>();
  for (const pos of positions) {
    positionById.set(pos.id, pos);
  }

  // Map: userId -> managerUserId
  const managerByUserId = new Map<string, string>();
  // Map: managerUserId -> directReportUserIds[]
  const directReportsByUserId = new Map<string, string[]>();

  for (const pos of positions) {
    const userId = pos.userId;
    if (!userId) continue;

    const parentId = pos.parentId;
    if (!parentId) continue;

    const managerPos = positionById.get(parentId);
    const managerUserId = managerPos?.userId;

    if (!managerUserId) continue;

    managerByUserId.set(userId, managerUserId);

    if (!directReportsByUserId.has(managerUserId)) {
      directReportsByUserId.set(managerUserId, []);
    }
    directReportsByUserId.get(managerUserId)!.push(userId);
  }

  // 6) Fetch manager names for enrichment
  const managerUserIds = Array.from(new Set(managerByUserId.values()));
  const managerUsers =
    managerUserIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: managerUserIds,
            },
          },
          select: {
            id: true,
            name: true,
          },
        })
      : [];

  const managerNameById = new Map<string, string | null>();
  for (const manager of managerUsers) {
    managerNameById.set(manager.id, manager.name);
  }

  // 7) Compute workload metrics per user (projects + tasks)
  //
  // We approximate using:
  //  - ProjectAssignee: which projects a user is assigned to
  //  - Task.assigneeId: active & blocked tasks
  //  - Recently updated tasks: last 7 days activity (simple heuristic)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Projects per user
  const projectAssignments = await prisma.projectAssignee.findMany({
    where: {
      userId: {
        in: userIds,
      },
      project: {
        workspaceId,
        isArchived: false,
      },
    },
    select: {
      userId: true,
      projectId: true,
    },
  });

  const activeProjectsByUserId = new Map<string, Set<string>>();
  for (const pa of projectAssignments) {
    const uId = pa.userId;
    if (!activeProjectsByUserId.has(uId)) {
      activeProjectsByUserId.set(uId, new Set<string>());
    }
    activeProjectsByUserId.get(uId)!.add(pa.projectId);
  }

  // Tasks per user
  const tasks = await prisma.task.findMany({
    where: {
      workspaceId,
      assigneeId: {
        in: userIds,
      },
    },
    select: {
      id: true,
      assigneeId: true,
      status: true,
      updatedAt: true,
    },
  });

  const activeTasksByUserId = new Map<string, number>();
  const blockedTasksByUserId = new Map<string, number>();
  const recentlyUpdatedTasksByUserId = new Map<string, number>();

  const ACTIVE_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW"];
  const BLOCKED_STATUS = "BLOCKED";

  for (const t of tasks) {
    const uId = t.assigneeId;
    if (!uId) continue;

    // Active tasks
    if (ACTIVE_STATUSES.includes(t.status)) {
      const prev = activeTasksByUserId.get(uId) ?? 0;
      activeTasksByUserId.set(uId, prev + 1);
    }

    // Blocked tasks
    if (t.status === BLOCKED_STATUS) {
      const prev = blockedTasksByUserId.get(uId) ?? 0;
      blockedTasksByUserId.set(uId, prev + 1);
    }

    // Recently updated tasks (7 days)
    if (t.updatedAt >= sevenDaysAgo) {
      const prev = recentlyUpdatedTasksByUserId.get(uId) ?? 0;
      recentlyUpdatedTasksByUserId.set(uId, prev + 1);
    }
  }

  // 8) Build PersonContextObject for each member
  const results: PersonContextObject[] = [];

  for (const member of members) {
    const user = member.user;
    if (!user) continue;

    const userId = user.id;
    const position = positionByUserId.get(userId) ?? null;

    const teamId = position?.teamId ?? null;
    const team = teamId ? teamById.get(teamId) ?? null : null;

    const departmentId = team?.departmentId ?? null;
    const department = departmentId ? departmentById.get(departmentId) ?? null : null;

    const managerUserId = managerByUserId.get(userId) ?? null;
    const managerName = managerUserId ? managerNameById.get(managerUserId) ?? null : null;

    const directReportIds = directReportsByUserId.get(userId) ?? [];

    const activeProjectsCount =
      activeProjectsByUserId.get(userId)?.size ?? 0;

    const activeTasksCount = activeTasksByUserId.get(userId) ?? 0;

    const blockedTasksCount = blockedTasksByUserId.get(userId) ?? 0;

    const recentlyUpdatedTasksCount =
      recentlyUpdatedTasksByUserId.get(userId) ?? 0;

    const responsibilities = position?.responsibilities ?? [];
    const keyMetrics = position?.keyMetrics ?? [];

    // Very simple workload-based health signal. Will be refined later.
    let healthStatusLabel: PersonContextInput["healthStatusLabel"] = "unknown";
    let healthNotes: string | null = null;

    if (activeTasksCount === 0 && activeProjectsCount === 0) {
      healthStatusLabel = "underutilized";
      healthNotes = "No active projects or tasks detected.";
    } else if (blockedTasksCount > 5) {
      healthStatusLabel = "risky";
      healthNotes = "High number of blocked tasks.";
    } else if (activeTasksCount > 20) {
      healthStatusLabel = "overloaded";
      healthNotes = "High active task count; may be overloaded.";
    } else {
      healthStatusLabel = "balanced";
      healthNotes = "Workload appears roughly balanced.";
    }

    const input: PersonContextInput = {
      workspaceId,
      userId,
      name: user.name,
      email: user.email,
      image: user.image,
      isActive: true, // We treat all workspace members as active for now.
      joinedAt: user.createdAt.toISOString(),
      positionId: position?.id ?? null,
      positionTitle: position?.title ?? null,
      positionLevel: position?.level ?? null,
      teamId: team?.id ?? position?.teamId ?? null,
      teamName: team?.name ?? null,
      departmentId,
      departmentName: department?.name ?? null,
      managerId: managerUserId,
      managerName,
      directReportIds,
      totalReportsCount: null, // can be refined later with deeper tree traversal
      activeProjectsCount,
      activeTasksCount,
      blockedTasksCount,
      recentlyUpdatedTasksCount,
      responsibilitiesSummary:
        responsibilities.length > 0 ? responsibilities[0] : null,
      responsibilities,
      keyMetrics,
      peerIds: [], // can later be derived via team membership
      healthStatusLabel,
      healthNotes,
      tags: [],
    };

    const contextObject = buildPersonContext(input);
    results.push(contextObject);
  }

  return results;
}

