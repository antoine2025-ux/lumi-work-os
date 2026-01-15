import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import type { ContextObject, ContextRelation } from "./contextTypes";
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
import {
  buildTeamOrgRelations,
  buildDepartmentOrgRelations,
} from "./orgRelationsMapper";

/**
 * OrgContextBundle
 *
 * In-memory snapshot of Org-related ContextObjects for a single workspace.
 * No persistence in ContextItem yet – this is purely a builder.
 */
export type OrgContextBundle = {
  departments: ContextObject[];
  teams: ContextObject[];
  positions: ContextObject[];
  people: ContextObject[];
};

async function fetchOrgDepartmentSources(
  workspaceId: string
): Promise<OrgDepartmentSource[]> {
  const departments = await prisma.orgDepartment.findMany({
    where: { 
      workspaceId,
      isActive: true, // Only fetch active departments for accurate org context
    },
    include: {
      teams: {
        where: { isActive: true }, // Only include active teams in department
      },
    },
    orderBy: { order: "asc" },
  });

  return departments.map((dept) => ({
    id: dept.id,
    workspaceId: dept.workspaceId,
    name: dept.name,
    description: dept.description,
    isActive: dept.isActive,
    updatedAt: dept.updatedAt,
    teamCount: dept.teams?.length ?? 0,
  }));
}

async function fetchOrgTeamSources(
  workspaceId: string
): Promise<OrgTeamSource[]> {
  const teams = await prisma.orgTeam.findMany({
    where: { 
      workspaceId,
      isActive: true, // Only fetch active teams for accurate org context
    },
    include: {
      department: true,
      positions: {
        where: { isActive: true },
        include: {
          user: true,
        },
      },
    },
    orderBy: [
      { department: { order: "asc" } },
      { order: "asc" },
    ],
  });

  return teams.map((team) => ({
    id: team.id,
    workspaceId: team.workspaceId,
    name: team.name,
    description: team.description,
    isActive: team.isActive,
    departmentId: team.departmentId,
    departmentName: team.department?.name ?? null,
    updatedAt: team.updatedAt,
    memberCount: team.positions?.filter((p) => p.isActive && p.userId).length ?? 0,
    // Store member user IDs for relation building
    // Only include active positions with assigned users, and deduplicate userIds
    memberUserIds: Array.from(
      new Set(
        team.positions
          .filter((p) => p.isActive && p.userId && p.teamId === team.id)
          .map((p) => p.userId!)
          .filter((id): id is string => !!id)
      )
    ),
  }));
}

async function fetchOrgPositionSources(
  workspaceId: string
): Promise<OrgPositionSource[]> {
  const positions = await prisma.orgPosition.findMany({
    where: { 
      workspaceId,
      isActive: true, // Only fetch active positions for accurate org context
    },
    include: {
      team: {
        include: {
          department: true,
        },
      },
      user: true,
      parent: {
        include: {
          user: true,
        },
      },
    },
    orderBy: [
      { level: "asc" },
      { order: "asc" },
    ],
  });

  return positions.map((pos) => ({
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
    parentId: pos.parentId ?? null,
    parentTitle: pos.parent?.title ?? null,
    parentUserId: pos.parent?.userId ?? null,
    updatedAt: pos.updatedAt,
    roleDescription: pos.roleDescription ?? null,
    responsibilities: pos.responsibilities ?? [],
    requiredSkills: pos.requiredSkills ?? [],
    preferredSkills: pos.preferredSkills ?? [],
  }));
}

async function fetchOrgPersonSources(
  workspaceId: string,
  positionSources: OrgPositionSource[]
): Promise<OrgPersonSource[]> {
  // Workspace members (users) – minimal join
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: true,
    },
  });

  // Index positions by userId to find primary position per person
  // Only use active positions to ensure team/department membership is accurate
  const positionsByUserId = new Map<string, OrgPositionSource>();

  for (const pos of positionSources) {
    if (pos.userId && pos.isActive && !positionsByUserId.has(pos.userId)) {
      positionsByUserId.set(pos.userId, pos);
    }
  }

  const people: OrgPersonSource[] = [];

  for (const member of members) {
    const user = member.user;

    if (!user) continue;

    const primaryPosition = positionsByUserId.get(user.id) ?? null;

    people.push({
      id: user.id,
      name: user.name,
      email: user.email,
      updatedAt: user.updatedAt,
      primaryPosition,
    });
  }

  return people;
}

/**
 * Build an in-memory Org Context bundle for the current workspace.
 *
 * NOTE: This does NOT persist anything to ContextItem yet – it only returns
 * ContextObjects in memory, ready for future upsert logic.
 */
export async function buildOrgContextBundleForCurrentWorkspace(): Promise<OrgContextBundle> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }

  // 1) Fetch raw sources
  const [departmentSources, teamSources, positionSources] = await Promise.all([
    fetchOrgDepartmentSources(workspaceId),
    fetchOrgTeamSources(workspaceId),
    fetchOrgPositionSources(workspaceId),
  ]);

  const personSources = await fetchOrgPersonSources(workspaceId, positionSources);

  // 2) Build relations for teams and departments
  // Build team relations
  const teamRelationsMap = new Map<string, ContextRelation[]>();
  for (const team of teamSources) {
    const relations = buildTeamOrgRelations({
      teamId: team.id,
      departmentId: team.departmentId,
      departmentName: team.departmentName ?? null,
      memberUserIds: team.memberUserIds ?? [],
    });
    teamRelationsMap.set(team.id, relations);
  }

  // Build department relations
  // Group teams by department - only include active teams
  const teamsByDepartment = new Map<string, { teamId: string; teamName: string }[]>();
  const teamNameMap = new Map<string, string>();
  
  for (const team of teamSources) {
    // Only include active teams that belong to a department
    if (team.departmentId && team.isActive) {
      if (!teamsByDepartment.has(team.departmentId)) {
        teamsByDepartment.set(team.departmentId, []);
      }
      teamsByDepartment.get(team.departmentId)!.push({
        teamId: team.id,
        teamName: team.name,
      });
      teamNameMap.set(team.id, team.name);
    }
  }

  // Collect people by department (via teams)
  const peopleByDepartment = new Map<string, Set<string>>();
  for (const person of personSources) {
    const deptId = person.primaryPosition?.departmentId;
    if (deptId) {
      if (!peopleByDepartment.has(deptId)) {
        peopleByDepartment.set(deptId, new Set());
      }
      peopleByDepartment.get(deptId)!.add(person.id);
    }
  }

  const departmentRelationsMap = new Map<string, ContextRelation[]>();
  for (const dept of departmentSources) {
    const teamsInDept = teamsByDepartment.get(dept.id) ?? [];
    const peopleInDept = Array.from(peopleByDepartment.get(dept.id) ?? []);
    
    const relations = buildDepartmentOrgRelations({
      departmentId: dept.id,
      teamIds: teamsInDept.map((t) => t.teamId),
      teamNames: new Map(teamsInDept.map((t) => [t.teamId, t.teamName])),
      peopleUserIds: peopleInDept, // Include people for has_person relations
    });
    departmentRelationsMap.set(dept.id, relations);
  }

  // 3) Map to ContextObjects with relations
  const departments: ContextObject[] = departmentSources.map((dept) =>
    mapDepartmentToContextObject(dept, departmentRelationsMap.get(dept.id))
  );

  const teams: ContextObject[] = teamSources.map((team) =>
    mapTeamToContextObject(team, teamRelationsMap.get(team.id))
  );

  const positions: ContextObject[] = positionSources.map((pos) =>
    mapPositionToContextObject(pos)
  );

  const people: ContextObject[] = personSources.map((person) =>
    mapPersonToContextObject(person)
  );

  return {
    departments,
    teams,
    positions,
    people,
  };
}

