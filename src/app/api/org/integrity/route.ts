/**
 * GET /api/org/integrity
 * 
 * Returns data integrity issues that need to be fixed.
 * Used by the Issues Inbox, "Fix required" banner, and Org Chart markers.
 * 
 * Implements derive + overlay pattern:
 * 1. Compute current issues (derived facts)
 * 2. Fetch persisted resolutions by matching key
 * 3. Overlay resolution state onto derived issues
 * 4. Return combined result
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

export type IntegrityIssue = {
  issueKey: string;
  type: string;
  entityType: "person" | "team" | "department" | "position";
  entityId: string;
  entityName: string;
  severity: "error" | "warning";
  message: string;
  fixUrl?: string;
  resolution: "PENDING" | "ACKNOWLEDGED" | "FALSE_POSITIVE" | "RESOLVED";
  resolutionNote: string | null;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  firstSeenAt: string | null;
};

export type IntegrityResponse = {
  ok: boolean;
  totalIssues: number;
  issues: IntegrityIssue[];
  summary: {
    person_missing_team: number;
    person_missing_department: number;
    person_missing_manager: number;
    team_missing_department: number;
    team_missing_owner: number;
    department_missing_owner: number;
    manager_cycle: number;
  };
};

// Build deterministic issue key for matching
function buildIssueKey(entityType: string, entityId: string, issueType: string): string {
  return `${entityType}:${entityId}:${issueType}`;
}

export async function GET(request: NextRequest) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    const issues: IntegrityIssue[] = [];

    // Step 4: Parse query params
    const { searchParams } = new URL(request.url);
    const resolutionFilter = searchParams.get("resolution"); // PENDING, ACKNOWLEDGED, etc.
    const includeResolved = searchParams.get("includeResolved") === "true";

    // Step 5: Derive current issues
    const derivedIssues: Array<{
      type: string;
      entityType: "person" | "team" | "department" | "position";
      entityId: string;
      entityName: string;
      severity: "error" | "warning";
      message: string;
      fixUrl?: string;
    }> = [];

    // 1. Check for people missing team
    const peopleWithoutTeam = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        teamId: null,
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    for (const person of peopleWithoutTeam) {
      const name = person.user?.name || person.user?.email || "Unknown";
      derivedIssues.push({
        type: "person_missing_team",
        entityType: "person",
        entityId: person.id,
        entityName: name,
        severity: "error",
        message: `${name} is missing a team assignment`,
        fixUrl: `/org/people/${person.id}?focus=team`,
      });
    }

    // 2. Check for people missing department (via team)
    const peopleWithoutDepartment = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        OR: [
          { teamId: null },
          {
            team: {
              departmentId: null,
            },
          },
        ],
      },
      select: {
        id: true,
        userId: true,
        teamId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            departmentId: true,
          },
        },
      },
    });

    for (const person of peopleWithoutDepartment) {
      // Skip if already flagged for missing team
      if (!person.teamId) continue;

      const name = person.user?.name || person.user?.email || "Unknown";
      derivedIssues.push({
        type: "person_missing_department",
        entityType: "person",
        entityId: person.id,
        entityName: name,
        severity: "error",
        message: `${name}'s team is missing a department`,
        fixUrl: `/org/people/${person.id}?focus=team`,
      });
    }

    // 3. Check for people missing manager
    const peopleWithoutManager = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        parentId: null,
      },
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Only flag if there are multiple people (single person org doesn't need manager)
    const totalPeople = await prisma.orgPosition.count({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
    });

    if (totalPeople > 1) {
      for (const person of peopleWithoutManager) {
        const name = person.user?.name || person.user?.email || "Unknown";
        derivedIssues.push({
          type: "person_missing_manager",
          entityType: "person",
          entityId: person.id,
          entityName: name,
          severity: "warning",
          message: `${name} is missing a manager`,
          fixUrl: `/org/people/${person.id}?focus=manager`,
        });
      }
    }

    // 4. Check for teams missing department
    const teamsWithoutDepartment = await prisma.orgTeam.findMany({
      where: {
        workspaceId,
        isActive: true,
        departmentId: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    for (const team of teamsWithoutDepartment) {
      derivedIssues.push({
        type: "team_missing_department",
        entityType: "team",
        entityId: team.id,
        entityName: team.name,
        severity: "error",
        message: `Team "${team.name}" is missing a department`,
        fixUrl: `/org/structure?tab=teams&teamId=${team.id}`,
      });
    }

    // 5. Check for teams missing owner
    const teamsWithoutOwner = await prisma.orgTeam.findMany({
      where: {
        workspaceId,
        isActive: true,
        ownerPersonId: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    for (const team of teamsWithoutOwner) {
      derivedIssues.push({
        type: "team_missing_owner",
        entityType: "team",
        entityId: team.id,
        entityName: team.name,
        severity: "warning",
        message: `Team "${team.name}" is missing an owner`,
        fixUrl: `/org/structure?tab=teams&teamId=${team.id}`,
      });
    }

    // 6. Check for departments missing owner (via OwnerAssignment)
    const departments = await prisma.orgDepartment.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    const departmentOwners = await prisma.ownerAssignment.findMany({
      where: {
        workspaceId,
        entityType: "DEPARTMENT",
        entityId: { in: departments.map((d) => d.id) },
      },
      select: {
        entityId: true,
      },
    });

    const ownedDepartmentIds = new Set(departmentOwners.map((o) => o.entityId));

    for (const dept of departments) {
      if (!ownedDepartmentIds.has(dept.id)) {
        derivedIssues.push({
          type: "department_missing_owner",
          entityType: "department",
          entityId: dept.id,
          entityName: dept.name,
          severity: "warning",
          message: `Department "${dept.name}" is missing an owner`,
          fixUrl: `/org/structure?tab=departments&departmentId=${dept.id}`,
        });
      }
    }

    // 7. Check for manager cycles
    const allPositions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        parentId: { not: null },
      },
      select: {
        id: true,
        parentId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Build a map of position -> manager position
    const managerMap = new Map<string, string>();
    for (const pos of allPositions) {
      if (pos.parentId) {
        managerMap.set(pos.id, pos.parentId);
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (posId: string): string[] | null => {
      if (recStack.has(posId)) {
        const cycle: string[] = [posId];
        let current = managerMap.get(posId);
        while (current && current !== posId) {
          cycle.push(current);
          current = managerMap.get(current);
          if (cycle.length > 100) break;
        }
        return cycle.length > 1 ? cycle : null;
      }

      if (visited.has(posId)) {
        return null;
      }

      visited.add(posId);
      recStack.add(posId);

      const managerId = managerMap.get(posId);
      if (managerId) {
        const cycle = hasCycle(managerId);
        if (cycle) {
          recStack.delete(posId);
          return cycle;
        }
      }

      recStack.delete(posId);
      return null;
    };

    const cyclePositions = new Set<string>();
    for (const pos of allPositions) {
      if (!visited.has(pos.id)) {
        const cycle = hasCycle(pos.id);
        if (cycle) {
          cycle.forEach((id) => cyclePositions.add(id));
        }
      }
    }

    for (const posId of cyclePositions) {
      const pos = allPositions.find((p) => p.id === posId);
      if (pos) {
        const name = pos.user?.name || pos.user?.email || "Unknown";
        derivedIssues.push({
          type: "manager_cycle",
          entityType: "person",
          entityId: pos.id,
          entityName: name,
          severity: "error",
          message: `${name} is part of a manager cycle`,
          fixUrl: `/org/people/${pos.id}?focus=manager`,
        });
      }
    }

    // Step 6: Fetch persisted resolutions for overlay
    // Build issue keys for all derived issues
    const issueKeys = derivedIssues.map((issue) =>
      buildIssueKey(issue.entityType, issue.entityId, issue.type)
    );

    // Fetch matching persisted issues
    const persistedIssues = await prisma.orgPersonIssue.findMany({
      where: {
        orgId: workspaceId,
      },
    });

    // Fetch resolver names for issues that have resolvedById
    const resolverIds = persistedIssues
      .map((pi) => pi.resolvedById)
      .filter((id): id is string => id !== null);
    
    const resolvers = resolverIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: resolverIds } },
          select: { id: true, name: true },
        })
      : [];
    
    const resolverMap = new Map(resolvers.map((r) => [r.id, r.name]));

    // Build lookup map by composite key
    const persistedByKey = new Map<string, typeof persistedIssues[0]>();
    for (const pi of persistedIssues) {
      // OrgPersonIssue uses personId for entityId and type for issueType
      // entityType is inferred as "person" for this model
      const key = buildIssueKey("person", pi.personId, pi.type);
      persistedByKey.set(key, pi);
    }

    // Step 7: Overlay resolution state onto derived issues
    const issuesWithResolution: IntegrityIssue[] = derivedIssues.map((issue) => {
      const key = buildIssueKey(issue.entityType, issue.entityId, issue.type);
      const persisted = persistedByKey.get(key);

      return {
        issueKey: key,
        ...issue,
        resolution: (persisted?.resolution as IntegrityIssue["resolution"]) ?? "PENDING",
        resolutionNote: persisted?.resolutionNote ?? null,
        resolvedById: persisted?.resolvedById ?? null,
        resolvedByName: persisted?.resolvedById ? (resolverMap.get(persisted.resolvedById) ?? null) : null,
        resolvedAt: persisted?.resolvedAt?.toISOString() ?? null,
        firstSeenAt: persisted?.firstSeenAt?.toISOString() ?? persisted?.createdAt?.toISOString() ?? null,
      };
    });

    // Step 8: Apply resolution filter
    let filteredIssues = issuesWithResolution;

    if (resolutionFilter) {
      // Explicit filter by resolution status
      filteredIssues = issuesWithResolution.filter(
        (issue) => issue.resolution === resolutionFilter
      );
    } else if (!includeResolved) {
      // Default: only PENDING issues
      filteredIssues = issuesWithResolution.filter(
        (issue) => issue.resolution === "PENDING"
      );
    }

    // Build summary (from all derived issues, not filtered)
    const summary = {
      person_missing_team: derivedIssues.filter((i) => i.type === "person_missing_team").length,
      person_missing_department: derivedIssues.filter((i) => i.type === "person_missing_department").length,
      person_missing_manager: derivedIssues.filter((i) => i.type === "person_missing_manager").length,
      team_missing_department: derivedIssues.filter((i) => i.type === "team_missing_department").length,
      team_missing_owner: derivedIssues.filter((i) => i.type === "team_missing_owner").length,
      department_missing_owner: derivedIssues.filter((i) => i.type === "department_missing_owner").length,
      manager_cycle: derivedIssues.filter((i) => i.type === "manager_cycle").length,
    };

    return NextResponse.json({
      ok: true,
      totalIssues: filteredIssues.length,
      issues: filteredIssues,
      summary,
    } as IntegrityResponse);
  } catch (error: unknown) {
    console.error("[GET /api/org/integrity] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to check integrity",
      },
      { status: 500 }
    );
  }
}

