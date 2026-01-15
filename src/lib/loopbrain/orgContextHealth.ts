import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export type OrgContextHealthIssue = {
  code:
    | "TEAM_WITHOUT_DEPARTMENT"
    | "POSITION_WITHOUT_TEAM"
    | "POSITION_WITH_USER_BUT_NO_PERSON_CONTEXT"
    | "USER_WITHOUT_POSITION"
    | "MISSING_CONTEXTITEM_FOR_DEPARTMENT"
    | "MISSING_CONTEXTITEM_FOR_TEAM"
    | "MISSING_CONTEXTITEM_FOR_POSITION"
    | "MISSING_CONTEXTITEM_FOR_PERSON";
  message: string;
  details?: Record<string, unknown>;
};

export type OrgContextHealthReport = {
  workspaceId: string;
  summary: {
    ok: boolean;
    totalIssues: number;
  };
  counts: {
    prisma: {
      departments: number;
      teams: number;
      positions: number;
      workspaceMembers: number;
    };
    contextItems: {
      department: number;
      team: number;
      role: number;
      person: number;
    };
  };
  issues: OrgContextHealthIssue[];
};

/**
 * Run a set of Org → Loopbrain context health checks
 * for the current workspace.
 */
export async function runOrgContextHealthChecks(): Promise<OrgContextHealthReport> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) {
    throw new Error('No workspace found');
  }

  // --- Prisma side ---
  const [departments, teams, positions, members] = await Promise.all([
    prisma.orgDepartment.findMany({
      where: { workspaceId },
      select: { id: true },
    }),
    prisma.orgTeam.findMany({
      where: { workspaceId },
      select: { id: true, departmentId: true },
    }),
    prisma.orgPosition.findMany({
      where: { workspaceId },
      select: { id: true, teamId: true, userId: true },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    }),
  ]);

  // --- ContextItem side ---
  const contextItems = await prisma.contextItem.findMany({
    where: {
      workspaceId,
      type: { in: ["department", "team", "role", "person"] },
    },
    select: { id: true, type: true, contextId: true },
  });

  const contextByType = {
    department: new Map<string, string>(),
    team: new Map<string, string>(),
    role: new Map<string, string>(),
    person: new Map<string, string>(),
  };

  for (const item of contextItems) {
    if (item.type === "department" || item.type === "team" || item.type === "role" || item.type === "person") {
      contextByType[item.type].set(item.contextId, item.id);
    }
  }

  const issues: OrgContextHealthIssue[] = [];

  // Helper to push issues
  function addIssue(issue: OrgContextHealthIssue) {
    issues.push(issue);
  }

  // --- Check 1: Teams without departments ---
  for (const team of teams) {
    if (!team.departmentId) {
      addIssue({
        code: "TEAM_WITHOUT_DEPARTMENT",
        message: `OrgTeam ${team.id} has no departmentId.`,
        details: { teamId: team.id },
      });
    }
  }

  // --- Check 2: Positions without teams ---
  for (const pos of positions) {
    if (!pos.teamId) {
      addIssue({
        code: "POSITION_WITHOUT_TEAM",
        message: `OrgPosition ${pos.id} has no teamId.`,
        details: { positionId: pos.id },
      });
    }
  }

  // Build helper sets for cross-checking
  const departmentIds = new Set(departments.map((d) => d.id));
  const teamIds = new Set(teams.map((t) => t.id));
  const positionIds = new Set(positions.map((p) => p.id));
  const userIds = new Set(members.map((m) => m.userId));

  // --- Check 3: Prisma departments have ContextItems (type: department) ---
  for (const deptId of departmentIds) {
    if (!contextByType.department.has(deptId)) {
      addIssue({
        code: "MISSING_CONTEXTITEM_FOR_DEPARTMENT",
        message: `OrgDepartment ${deptId} has no ContextItem of type "department".`,
        details: { departmentId: deptId },
      });
    }
  }

  // --- Check 4: Prisma teams have ContextItems (type: team) ---
  for (const tId of teamIds) {
    if (!contextByType.team.has(tId)) {
      addIssue({
        code: "MISSING_CONTEXTITEM_FOR_TEAM",
        message: `OrgTeam ${tId} has no ContextItem of type "team".`,
        details: { teamId: tId },
      });
    }
  }

  // --- Check 5: Prisma positions have ContextItems (type: role) ---
  for (const posId of positionIds) {
    if (!contextByType.role.has(posId)) {
      addIssue({
        code: "MISSING_CONTEXTITEM_FOR_POSITION",
        message: `OrgPosition ${posId} has no ContextItem of type "role".`,
        details: { positionId: posId },
      });
    }
  }

  // --- Check 6: Workspace members have person context (type: person) ---
  for (const uId of userIds) {
    if (!contextByType.person.has(uId)) {
      addIssue({
        code: "MISSING_CONTEXTITEM_FOR_PERSON",
        message: `Workspace member user ${uId} has no ContextItem of type "person".`,
        details: { userId: uId },
      });
    }
  }

  // --- Check 7: Positions with userId but missing person context ---
  for (const pos of positions) {
    if (pos.userId && !contextByType.person.has(pos.userId)) {
      addIssue({
        code: "POSITION_WITH_USER_BUT_NO_PERSON_CONTEXT",
        message: `OrgPosition ${pos.id} has userId ${pos.userId} but no matching person ContextItem.`,
        details: { positionId: pos.id, userId: pos.userId },
      });
    }
  }

  // --- Check 8: Users without any position (optional "soft" issue) ---
  const usersWithPositions = new Set<string>();
  for (const pos of positions) {
    if (pos.userId) {
      usersWithPositions.add(pos.userId);
    }
  }

  for (const uId of userIds) {
    if (!usersWithPositions.has(uId)) {
      addIssue({
        code: "USER_WITHOUT_POSITION",
        message: `Workspace user ${uId} has no OrgPosition assignment.`,
        details: { userId: uId },
      });
    }
  }

  const counts = {
    prisma: {
      departments: departments.length,
      teams: teams.length,
      positions: positions.length,
      workspaceMembers: members.length,
    },
    contextItems: {
      department: contextByType.department.size,
      team: contextByType.team.size,
      role: contextByType.role.size,
      person: contextByType.person.size,
    },
  };

  const totalIssues = issues.length;

  return {
    workspaceId,
    summary: {
      ok: totalIssues === 0,
      totalIssues,
    },
    counts,
    issues,
  };
}

