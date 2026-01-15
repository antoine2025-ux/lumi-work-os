import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { ContextObject } from "@/lib/context/contextTypes";
import {
  OrgDepartmentInput,
  OrgTeamInput,
  OrgPositionInput,
  OrgPersonInput,
  buildOrgRootContext,
  buildDepartmentContext,
  buildTeamContext,
  buildPositionContext,
  buildPersonContext,
} from "./org-context-builder";

export type OrgContextBundle = {
  root: ContextObject;
  items: ContextObject[];
  byId: Record<string, ContextObject>;
};

/**
 * Load all Org entities for a workspace and return a normalized OrgContextBundle.
 * This is a pure in-memory representation (no persistence).
 */
export async function buildOrgContextBundleForWorkspace(
  workspaceId: string
): Promise<OrgContextBundle> {
  // Load core entities
  const [departments, teams, positions, memberships] = await Promise.all([
    prisma.orgDepartment.findMany({
      where: { 
        workspaceId,
        isActive: true, // Only fetch active departments for accurate org context
      },
    }),
    prisma.orgTeam.findMany({
      where: { 
        workspaceId,
        isActive: true, // Only fetch active teams for accurate org context
      },
    }),
    prisma.orgPosition.findMany({
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
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          include: {
            orgPositions: {
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

  const peopleCount = memberships.length;
  const departmentsCount = departments.length;
  const teamsCount = teams.length;
  const positionsCount = positions.length;

  // Root org object
  const root = buildOrgRootContext({
    workspaceId,
    peopleCount,
    departmentsCount,
    teamsCount,
    positionsCount,
  });

  const items: ContextObject[] = [];
  const byId: Record<string, ContextObject> = {};

  function add(obj: ContextObject) {
    items.push(obj);
    byId[obj.id] = obj;
  }

  // Departments
  for (const dept of departments) {
    const deptInput: OrgDepartmentInput = {
      id: dept.id,
      name: dept.name,
      description: dept.description,
      isActive: dept.isActive,
      workspaceId: dept.workspaceId,
      updatedAt: dept.updatedAt,
    };

    const deptTeamsCount = teams.filter((t) => t.departmentId === dept.id).length;
    const deptPeopleCount = memberships.filter((m) =>
      m.user.orgPositions.some((pos) => pos.team?.departmentId === dept.id)
    ).length;

    const deptContext = buildDepartmentContext(deptInput, {
      teamsCount: deptTeamsCount,
      peopleCount: deptPeopleCount,
    });

    add(deptContext);
  }

  // Teams
  for (const team of teams) {
    const teamInput: OrgTeamInput = {
      id: team.id,
      name: team.name,
      description: team.description,
      isActive: team.isActive,
      workspaceId: team.workspaceId,
      departmentId: team.departmentId,
      updatedAt: team.updatedAt,
    };

    const teamPositionsCount = positions.filter((p) => p.teamId === team.id).length;
    const teamPeopleCount = memberships.filter((m) =>
      m.user.orgPositions.some((pos) => pos.teamId === team.id)
    ).length;

    const teamContext = buildTeamContext(teamInput, {
      positionsCount: teamPositionsCount,
      peopleCount: teamPeopleCount,
    });

    add(teamContext);
  }

  // Positions
  for (const position of positions) {
    const posInput: OrgPositionInput = {
      id: position.id,
      title: position.title,
      level: position.level,
      roleDescription: position.roleDescription,
      isActive: position.isActive,
      workspaceId: position.workspaceId,
      teamId: position.teamId,
      userId: position.userId ?? undefined,
      parentId: position.parentId ?? undefined,
      parentUserId: position.parent?.userId ?? undefined,
      updatedAt: position.updatedAt,
    };

    const posContext = buildPositionContext(posInput);
    add(posContext);
  }

  // People (workspace members)
  for (const membership of memberships) {
    const user = membership.user;

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
    add(personContext);
  }

  return {
    root,
    items,
    byId,
  };
}

/**
 * Convenience helper: build OrgContextBundle for the *current* workspace.
 */
export async function buildOrgContextBundleForCurrentWorkspace(): Promise<OrgContextBundle> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }
  return buildOrgContextBundleForWorkspace(workspaceId);
}

// Re-export the new canonical bundle builder
export { buildOrgContextBundle, type OrgContextBundle as CanonicalOrgContextBundle } from "./orgContextBundle";

// Re-export Context Store sync helpers
export {
  writeOrgContextBundleToStore,
  rebuildOrgContextForWorkspace,
} from "./orgContextStoreSync";

// Re-export safe rebuild helper
export { safeRebuildOrgContext } from "./orgContextRebuild";

// Re-export diagnostics helper
export {
  getOrgContextDiagnostics,
  type OrgContextDiagnosticsSummary,
} from "./orgContextDiagnostics";

// Re-export org health helpers
export {
  computeOrgHealthForBundle,
  attachHealthToOrgContext,
  type OrgHealthSummary,
  type OrgHealthLabel,
} from "./orgHealth";

