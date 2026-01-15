import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import type { ContextObject } from "./contextTypes";
import {
  buildOrgContextBundleForCurrentWorkspace,
  type OrgContextBundle,
} from "./orgContextBuilder";
import {
  OrgDepartmentSource,
  OrgTeamSource,
  OrgPositionSource,
  OrgPersonSource,
  mapDepartmentToContextObject,
  mapTeamToContextObject,
  mapPositionToContextObject,
  mapPersonToContextObject,
} from "./orgContextMapper";

/**
 * Derive ContextItem.contextId from a ContextObject.id.
 *
 * Rule:
 * - If id is "org" → contextId = "org"
 * - Else, if id contains ":" → contextId = part after the first colon (e.g. "department:abc" → "abc")
 * - Else → contextId = id
 */
function deriveContextIdFromContextObject(obj: ContextObject): string {
  if (obj.id === "org") return "org";

  const colonIndex = obj.id.indexOf(":");
  if (colonIndex === -1) return obj.id;

  return obj.id.slice(colonIndex + 1);
}

/**
 * Upsert a single ContextObject into ContextItem for a given workspace.
 *
 * - Uses (workspaceId, contextId, type) as the logical uniqueness triple.
 * - If an existing ContextItem is found, it is updated.
 * - Otherwise, a new ContextItem is created.
 */
async function upsertContextItemForOrgObject(
  workspaceId: string,
  obj: ContextObject
) {
  const contextId = deriveContextIdFromContextObject(obj);
  const type = obj.type;

  const existing = await prisma.contextItem.findFirst({
    where: {
      workspaceId,
      contextId,
      type,
    },
  });

  if (existing) {
    await prisma.contextItem.update({
      where: {
        id: existing.id,
      },
      data: {
        title: obj.title,
        summary: obj.summary,
        data: obj,
      },
    });
  } else {
    await prisma.contextItem.create({
      data: {
        workspaceId,
        contextId,
        type,
        title: obj.title,
        summary: obj.summary,
        data: obj,
      },
    });
  }
}

/**
 * Upsert all Org ContextObjects (departments, teams, positions, people)
 * for the current workspace into ContextItem.
 *
 * NOTE:
 * - This does not modify ContextEmbedding or ContextSummary yet.
 * - It is safe to call multiple times; uses logical upsert behavior.
 */
export async function syncOrgContextBundleToContextStore(): Promise<{
  workspaceId: string;
  counts: {
    departments: number;
    teams: number;
    positions: number;
    people: number;
    total: number;
  };
}> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }
  const bundle: OrgContextBundle = await buildOrgContextBundleForCurrentWorkspace();

  const { departments, teams, positions, people } = bundle;

  const allObjects: ContextObject[] = [
    ...departments,
    ...teams,
    ...positions,
    ...people,
  ];

  for (const obj of allObjects) {
    await upsertContextItemForOrgObject(workspaceId, obj);
  }

  return {
    workspaceId,
    counts: {
      departments: departments.length,
      teams: teams.length,
      positions: positions.length,
      people: people.length,
      total: allObjects.length,
    },
  };
}

async function fetchDepartmentSourceById(
  workspaceId: string,
  departmentId: string
): Promise<OrgDepartmentSource | null> {
  const dept = await prisma.orgDepartment.findFirst({
    where: { id: departmentId, workspaceId },
    include: {
      teams: true,
    },
  });

  if (!dept) return null;

  return {
    id: dept.id,
    workspaceId: dept.workspaceId,
    name: dept.name,
    description: dept.description,
    isActive: dept.isActive,
    updatedAt: dept.updatedAt,
    teamCount: dept.teams?.length ?? 0,
  };
}

async function fetchTeamSourceById(
  workspaceId: string,
  teamId: string
): Promise<OrgTeamSource | null> {
  const team = await prisma.orgTeam.findFirst({
    where: { id: teamId, workspaceId },
    include: {
      department: true,
      positions: true,
    },
  });

  if (!team) return null;

  return {
    id: team.id,
    workspaceId: team.workspaceId,
    name: team.name,
    description: team.description,
    isActive: team.isActive,
    departmentId: team.departmentId,
    departmentName: team.department?.name ?? null,
    updatedAt: team.updatedAt,
    memberCount: team.positions?.filter((p) => p.isActive).length ?? 0,
  };
}

async function fetchPositionSourceById(
  workspaceId: string,
  positionId: string
): Promise<OrgPositionSource | null> {
  const pos = await prisma.orgPosition.findFirst({
    where: { id: positionId, workspaceId },
    include: {
      team: {
        include: {
          department: true,
        },
      },
      user: true,
    },
  });

  if (!pos) return null;

  return {
    id: pos.id,
    workspaceId: pos.workspaceId,
    title: pos.title || 'Untitled Position',
    level: pos.level,
    isActive: pos.isActive,
    teamId: pos.teamId,
    teamName: pos.team?.name ?? null,
    departmentId: pos.team?.departmentId ?? null,
    departmentName: pos.team?.department?.name ?? null,
    userId: pos.userId,
    userName: pos.user?.name ?? pos.user?.email ?? null,
    updatedAt: pos.updatedAt,
    roleDescription: pos.roleDescription ?? null,
    responsibilities: pos.responsibilities ?? [],
    requiredSkills: pos.requiredSkills ?? [],
    preferredSkills: pos.preferredSkills ?? [],
  };
}

async function fetchPersonSourceByUserId(
  workspaceId: string,
  userId: string
): Promise<OrgPersonSource | null> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId },
    include: {
      user: true,
    },
  });

  if (!membership || !membership.user) return null;

  const user = membership.user;

  // Find primary position for this user in this workspace
  const primaryPositionRecord = await prisma.orgPosition.findFirst({
    where: {
      workspaceId,
      userId: user.id,
    },
    include: {
      team: {
        include: {
          department: true,
        },
      },
      user: true,
    },
    orderBy: [
      { level: "asc" },
      { order: "asc" },
    ],
  });

  let primaryPosition: OrgPositionSource | null = null;

  if (primaryPositionRecord) {
    primaryPosition = {
      id: primaryPositionRecord.id,
      workspaceId: primaryPositionRecord.workspaceId,
      title: primaryPositionRecord.title || 'Untitled Position',
      level: primaryPositionRecord.level,
      isActive: primaryPositionRecord.isActive,
      teamId: primaryPositionRecord.teamId,
      teamName: primaryPositionRecord.team?.name ?? null,
      departmentId: primaryPositionRecord.team?.departmentId ?? null,
      departmentName: primaryPositionRecord.team?.department?.name ?? null,
      userId: primaryPositionRecord.userId,
      userName:
        primaryPositionRecord.user?.name ??
        primaryPositionRecord.user?.email ??
        null,
      updatedAt: primaryPositionRecord.updatedAt,
      roleDescription: primaryPositionRecord.roleDescription ?? null,
      responsibilities: primaryPositionRecord.responsibilities ?? [],
      requiredSkills: primaryPositionRecord.requiredSkills ?? [],
      preferredSkills: primaryPositionRecord.preferredSkills ?? [],
    };
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    updatedAt: user.updatedAt,
    primaryPosition,
  };
}

export async function syncDepartmentContextItem(departmentId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }
  const source = await fetchDepartmentSourceById(workspaceId, departmentId);
  if (!source) {
    // If the department no longer exists, we currently do nothing.
    // A later step can add deletion support.
    return { workspaceId, departmentId, synced: false, reason: "not_found" };
  }

  const contextObject = mapDepartmentToContextObject(source);
  await upsertContextItemForOrgObject(workspaceId, contextObject);

  return { workspaceId, departmentId, synced: true };
}

export async function syncTeamContextItem(teamId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }
  const source = await fetchTeamSourceById(workspaceId, teamId);
  if (!source) {
    return { workspaceId, teamId, synced: false, reason: "not_found" };
  }

  const contextObject = mapTeamToContextObject(source);
  await upsertContextItemForOrgObject(workspaceId, contextObject);

  return { workspaceId, teamId, synced: true };
}

export async function syncPositionContextItem(positionId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }
  const source = await fetchPositionSourceById(workspaceId, positionId);
  if (!source) {
    return { workspaceId, positionId, synced: false, reason: "not_found" };
  }

  const contextObject = mapPositionToContextObject(source);
  await upsertContextItemForOrgObject(workspaceId, contextObject);

  return { workspaceId, positionId, synced: true };
}

export async function syncPersonContextItem(userId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }
  const source = await fetchPersonSourceByUserId(workspaceId, userId);
  if (!source) {
    return { workspaceId, userId, synced: false, reason: "not_found" };
  }

  const contextObject = mapPersonToContextObject(source);
  await upsertContextItemForOrgObject(workspaceId, contextObject);

  return { workspaceId, userId, synced: true };
}

