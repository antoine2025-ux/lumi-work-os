import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

/**
 * Ownership Coverage Health
 * Returns owned vs unowned counts for departments, teams, and positions.
 * 
 * Ownership inference:
 * - Department: owned if any team in dept has >=1 active filled position
 * - Team: owned if team has >=1 active filled position
 * - Position: owned if userId is set (has a person assigned)
 */

type OwnershipHealthResponse = {
  totals: {
    people: number;
    positions: number;
    teams: number;
    departments: number;
    ownedPositions: number;
    unownedPositions: number;
    ownedTeams: number;
    unownedTeams: number;
    ownedDepartments: number;
    unownedDepartments: number;
  };
  unowned: {
    positions: Array<{ id: string; name: string; departmentName?: string | null; teamName?: string | null }>;
    teams: Array<{ id: string; name: string; departmentName?: string | null }>;
    departments: Array<{ id: string; name: string }>;
  };
};

function hasOwner(value: any) {
  return value !== null && value !== undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    // ----- PEOPLE -----
    // Count distinct users with active positions
    const peopleWithPositions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      select: {
        userId: true,
      },
    });
    const peopleCount = new Set(peopleWithPositions.map((p) => p.userId).filter(Boolean)).size;

    // ----- DEPARTMENTS -----
    const departments = await prisma.orgDepartment.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    // Get teams per department to check ownership
    const teamsByDept = await prisma.orgTeam.findMany({
      where: {
        workspaceId,
        isActive: true,
        departmentId: { in: departments.map((d) => d.id) },
      },
      select: {
        id: true,
        departmentId: true,
        _count: {
          select: {
            positions: {
              where: {
                isActive: true,
                userId: { not: null },
              },
            },
          },
        },
      },
    });

    // Department is owned if any team in it has >=1 active filled position
    const deptOwnershipMap = new Map<string, boolean>();
    for (const team of teamsByDept) {
      if (!team.departmentId) continue;
      const isOwned = team._count.positions > 0;
      if (!deptOwnershipMap.has(team.departmentId) || isOwned) {
        deptOwnershipMap.set(team.departmentId, isOwned);
      }
    }

    const unownedDepartments = departments
      .filter((d) => !deptOwnershipMap.get(d.id))
      .slice(0, 10)
      .map((d) => ({ id: d.id, name: d.name }));

    const ownedDepartmentsCount = departments.length - unownedDepartments.length;

    // ----- TEAMS -----
    const teams = await prisma.orgTeam.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: { select: { name: true } },
        _count: {
          select: {
            positions: {
              where: {
                isActive: true,
                userId: { not: null },
              },
            },
          },
        },
      },
    });

    const unownedTeams = teams
      .filter((t) => t._count.positions === 0)
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        name: t.name,
        departmentName: t.department?.name ?? null,
      }));

    const ownedTeamsCount = teams.length - unownedTeams.length;

    // ----- POSITIONS -----
    const positions = await prisma.orgPosition.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        userId: true,
        team: {
          select: {
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const positionsCount = positions.length;
    const unownedPositions = positions
      .filter((p) => !hasOwner(p.userId))
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.title || "Untitled position",
        departmentName: p.team?.department?.name ?? null,
        teamName: p.team?.name ?? null,
      }));

    const ownedPositionsCount = positionsCount - unownedPositions.length;

    const payload: OwnershipHealthResponse = {
      totals: {
        people: peopleCount,
        positions: positionsCount,
        teams: teams.length,
        departments: departments.length,
        ownedPositions: ownedPositionsCount,
        unownedPositions: unownedPositions.length,
        ownedTeams: ownedTeamsCount,
        unownedTeams: unownedTeams.length,
        ownedDepartments: ownedDepartmentsCount,
        unownedDepartments: unownedDepartments.length,
      },
      unowned: {
        positions: unownedPositions,
        teams: unownedTeams,
        departments: unownedDepartments,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, req);
  }
}
