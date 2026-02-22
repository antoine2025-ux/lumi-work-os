/**
 * Centralized Org Context Bundle Builder
 * 
 * Provides a single canonical function to build a complete Org context bundle
 * from Prisma entities, using strict validated serializers.
 * 
 * This bundle powers:
 * - ContextStore writes
 * - Loopbrain Org mode
 * - Org health computation
 */

import { prisma } from "@/lib/db";
import { ContextObject } from "@/lib/context/contextTypes";
import {
  buildOrgRootContext,
  buildDepartmentContext,
  buildTeamContext,
  buildPositionContext,
  buildPersonContext,
  type OrgDepartmentInput,
  type OrgTeamInput,
  type OrgPositionInput,
  type OrgPersonInput,
} from "./org-context-builder";
import {
  attachHealthToOrgContext,
  computeOrgHealthForBundle,
} from "./orgHealth";

export type OrgContextBundle = {
  org: ContextObject;
  people: ContextObject[];
  teams: ContextObject[];
  departments: ContextObject[];
  roles: ContextObject[];
  byId: Record<string, ContextObject>;
};

/**
 * Build a complete Org context bundle for a workspace.
 * 
 * Fetches all Org entities from Prisma and builds validated ContextObjects
 * using the strict serializers. Returns a normalized bundle ready for:
 * - ContextStore persistence
 * - Loopbrain Org mode
 * - Org health computation
 */
export async function buildOrgContextBundle(
  workspaceId: string
): Promise<OrgContextBundle> {
  // 1) Fetch raw entities from Prisma
  const [departments, teams, positions, memberships] = await Promise.all([
    prisma.orgDepartment.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: { order: "asc" },
    }),
    prisma.orgTeam.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: { order: "asc" },
    }),
    prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        user: true,
        team: {
          include: {
            department: true,
          },
        },
        parent: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { level: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          include: {
            orgPositions: {
              where: { workspaceId, isActive: true },
              include: {
                team: {
                  include: {
                    department: true,
                  },
                },
              },
              orderBy: {
                level: "asc",
              },
            },
          },
        },
      },
    }),
  ]);

  // 2) Build ContextObjects for departments
  const departmentContextObjects: ContextObject[] = [];
  for (const dept of departments) {
    const deptTeamsCount = teams.filter((t) => t.departmentId === dept.id).length;
    const deptPeopleCount = memberships.filter((m) =>
      m.user.orgPositions.some((pos) => pos.team?.departmentId === dept.id)
    ).length;

    const deptInput: OrgDepartmentInput = {
      id: dept.id,
      name: dept.name,
      description: dept.description,
      isActive: dept.isActive,
      workspaceId: dept.workspaceId,
      updatedAt: dept.updatedAt,
    };

    const deptContext = buildDepartmentContext(deptInput, {
      teamsCount: deptTeamsCount,
      peopleCount: deptPeopleCount,
    });

    departmentContextObjects.push(deptContext);
  }

  // 3) Build ContextObjects for teams
  const teamContextObjects: ContextObject[] = [];
  for (const team of teams) {
    const teamPositionsCount = positions.filter((p) => p.teamId === team.id).length;
    const teamPeopleCount = memberships.filter((m) =>
      m.user.orgPositions.some((pos) => pos.teamId === team.id)
    ).length;

    const teamInput: OrgTeamInput = {
      id: team.id,
      name: team.name,
      description: team.description,
      isActive: team.isActive,
      workspaceId: team.workspaceId,
      departmentId: team.departmentId,
      updatedAt: team.updatedAt,
    };

    const teamContext = buildTeamContext(teamInput, {
      positionsCount: teamPositionsCount,
      peopleCount: teamPeopleCount,
    });

    teamContextObjects.push(teamContext);
  }

  // 4) Build ContextObjects for roles/positions
  const roleContextObjects: ContextObject[] = [];
  for (const position of positions) {
    const posInput: OrgPositionInput = {
      id: position.id,
      title: position.title,
      level: position.level,
      roleDescription: position.roleDescription,
      isActive: position.isActive,
      workspaceId: position.workspaceId,
      teamId: position.teamId ?? undefined,
      userId: position.userId ?? undefined,
      parentId: position.parentId ?? undefined,
      parentUserId: position.parent?.userId ?? undefined,
      updatedAt: position.updatedAt,
    };

    const roleContext = buildPositionContext(posInput);
    roleContextObjects.push(roleContext);
  }

  // 5) Build ContextObjects for people (using workspace members + positions)
  const peopleContextObjects: ContextObject[] = [];
  for (const membership of memberships) {
    const user = membership.user;

    // Heuristic: primary position = first active orgPosition (already ordered by level)
    const primaryPosition = user.orgPositions[0] ?? null;
    const primaryTeam = primaryPosition?.team ?? null;
    const primaryDepartment = primaryTeam?.department ?? null;

    const personInput: OrgPersonInput = {
      userId: user.id,
      name: user.name,
      email: user.email,
      workspaceId,
      workspaceRole: membership.role,
      primaryPositionId: primaryPosition?.id ?? null,
      primaryTeamId: primaryTeam?.id ?? null,
      primaryDepartmentId: primaryDepartment?.id ?? null,
      updatedAt: user.updatedAt,
    };

    const personContext = buildPersonContext(personInput);
    peopleContextObjects.push(personContext);
  }

  // 6) Build root Org ContextObject (with counts)
  let org = buildOrgRootContext({
    workspaceId,
    peopleCount: peopleContextObjects.length,
    departmentsCount: departmentContextObjects.length,
    teamsCount: teamContextObjects.length,
    positionsCount: roleContextObjects.length,
  });

  // 7) Compute health and attach it to org ContextObject
  const health = computeOrgHealthForBundle({
    org,
    people: peopleContextObjects,
    teams: teamContextObjects,
    departments: departmentContextObjects,
    roles: roleContextObjects,
    byId: {}, // not used by the current health implementation
  });

  org = attachHealthToOrgContext(org, health);

  // 8) Build byId index
  const byId: Record<string, ContextObject> = {};

  const all = [
    org,
    ...peopleContextObjects,
    ...teamContextObjects,
    ...departmentContextObjects,
    ...roleContextObjects,
  ];

  for (const ctx of all) {
    byId[ctx.id] = ctx;
  }

  return {
    org,
    people: peopleContextObjects,
    teams: teamContextObjects,
    departments: departmentContextObjects,
    roles: roleContextObjects,
    byId,
  };
}

