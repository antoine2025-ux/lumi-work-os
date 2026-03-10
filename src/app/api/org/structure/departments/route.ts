import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

type OrgDepartmentStructureRow = {
  id: string;
  name: string;
  lead?: { id: string; name: string; title?: string | null } | null;
  teamsCount: number;
  peopleCount: number;
};

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;

    // 1) Departments (ordered)
    const departments = await prisma.orgDepartment.findMany({
      where: { workspaceId, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    const deptIds = departments.map((d) => d.id);

    if (deptIds.length === 0) {
      return NextResponse.json({ departments: [] satisfies OrgDepartmentStructureRow[] });
    }

    // 2) Teams count grouped by department
    const teamsByDept = await prisma.orgTeam.groupBy({
      by: ["departmentId"],
      where: {
        workspaceId,
        isActive: true,
        departmentId: { in: deptIds },
      },
      _count: { _all: true },
    });

    const teamsCountMap = new Map<string, number>();
    for (const row of teamsByDept) {
      if (row.departmentId) {
        teamsCountMap.set(row.departmentId, row._count._all);
      }
    }

    /**
     * 3) People count grouped by department + best-guess department lead
     *
     * Source of truth (current schema):
     * - People are represented as `OrgPosition` rows with `userId` set.
     * - Positions attach to a team via `teamId`, and teams attach to a department.
     *
     * Lead heuristic:
     * - Highest-level (max `level`) filled position in the department.
     * - Ties broken by lowest `order`.
     */
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
        team: {
          is: {
            isActive: true,
            departmentId: { in: deptIds },
          },
        },
      },
      select: {
        level: true,
        order: true,
        title: true,
        user: { select: { id: true, name: true } },
        team: { select: { departmentId: true } },
      },
    });

    const peopleSetByDept = new Map<string, Set<string>>();
    const leadCandidateByDept = new Map<
      string,
      { level: number; order: number; userId: string; userName: string; title: string | null }
    >();

    for (const pos of positions) {
      const deptId = pos.team?.departmentId;
      if (!deptId || !pos.user) continue;

      // peopleCount (distinct users per department)
      const set = peopleSetByDept.get(deptId) ?? new Set<string>();
      set.add(pos.user.id);
      peopleSetByDept.set(deptId, set);

      // lead (best candidate per department)
      const level = typeof pos.level === "number" ? pos.level : 0;
      const order = typeof pos.order === "number" ? pos.order : 0;
      const candidate = {
        level,
        order,
        userId: pos.user.id,
        userName: pos.user.name ?? "Unnamed",
        title: pos.title ?? null,
      };

      const existing = leadCandidateByDept.get(deptId);
      if (!existing) {
        leadCandidateByDept.set(deptId, candidate);
        continue;
      }

      const isBetter =
        candidate.level > existing.level ||
        (candidate.level === existing.level && candidate.order < existing.order);

      if (isBetter) {
        leadCandidateByDept.set(deptId, candidate);
      }
    }

    const payload: OrgDepartmentStructureRow[] = departments.map((d) => {
      const leadCandidate = leadCandidateByDept.get(d.id);
      const lead = leadCandidate
        ? { id: leadCandidate.userId, name: leadCandidate.userName, title: leadCandidate.title }
        : null;

      return {
        id: d.id,
        name: d.name,
        lead,
        teamsCount: teamsCountMap.get(d.id) ?? 0,
        peopleCount: peopleSetByDept.get(d.id)?.size ?? 0,
      };
    });

    return NextResponse.json({ departments: payload });
  } catch (error) {
    return handleApiError(error);
  }
}


