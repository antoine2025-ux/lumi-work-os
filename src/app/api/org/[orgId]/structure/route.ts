import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertOrgAccess, OrgAuthError } from "@/lib/orgAuth";
import type {
  StructureTeam,
  StructureDepartment,
  StructureRole,
} from "@/types/org";

type StructureResponse =
  | {
      ok: true;
      data: {
        teams: StructureTeam[];
        departments: StructureDepartment[];
        roles: StructureRole[];
      };
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
      };
    };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
): Promise<NextResponse<StructureResponse>> {
  const resolvedParams = await params;
  const orgId = resolvedParams.orgId;

  if (!orgId) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "MISSING_ORG_ID", message: "Organization id is required." },
      },
      { status: 400 }
    );
  }

  try {
    await assertOrgAccess(orgId, req);
    if (!prisma) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "DATABASE_ERROR", message: "Database connection unavailable." },
        },
        { status: 500 }
      );
    }
    // Departments
    const departments = await prisma.orgDepartment.findMany({
      where: { workspaceId: orgId, isActive: true },
      include: {
        teams: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Teams
    const teams = await prisma.orgTeam.findMany({
      where: { workspaceId: orgId, isActive: true },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        positions: {
          where: { isActive: true, userId: { not: null } },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: [{ level: "desc" }, { order: "asc" }],
        },
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
      orderBy: { name: "asc" },
    });

    // Roles (using OrgPosition as roles - distinct titles)
    // Get all positions and group by title to create "roles"
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId: orgId,
        isActive: true,
      },
      include: {
        team: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { title: "asc" },
    });

    // Map departments
    const mappedDepartments: StructureDepartment[] = departments.map((d) => ({
      id: d.id,
      name: d.name,
      teamCount: d.teams.length,
    }));

    // Map teams
    const mappedTeams: StructureTeam[] = teams.map((t) => {
      // Find lead: highest level position with a user
      const leadPosition = t.positions.find((pos) => pos.user !== null);
      const leadName = leadPosition?.user?.name ?? null;

      return {
        id: t.id,
        name: t.name,
        departmentId: t.department?.id ?? null,
        departmentName: t.department?.name ?? null,
        leadName,
        memberCount: t._count.positions,
      };
    });

    // Group positions by title to create "roles"
    const roleMap = new Map<
      string,
      {
        id: string;
        name: string;
        level: string | null;
        defaultTeamName: string | null;
        activePeopleCount: number;
      }
    >();

    for (const pos of positions) {
      const existing = roleMap.get(pos.title);
      if (existing) {
        // Update active people count if user is assigned
        if (pos.user) {
          existing.activePeopleCount += 1;
        }
        // Keep the first team as default if not set
        if (!existing.defaultTeamName && pos.team) {
          existing.defaultTeamName = pos.team.name;
        }
      } else {
        roleMap.set(pos.title, {
          id: pos.id, // Use first position ID as role ID
          name: pos.title,
          level: pos.level != null ? pos.level.toString() : null,
          defaultTeamName: pos.team?.name ?? null,
          activePeopleCount: pos.user ? 1 : 0,
        });
      }
    }

    const mappedRoles: StructureRole[] = Array.from(roleMap.values()).map((r) => ({
      id: r.id,
      name: r.name,
      level: r.level,
      defaultTeamName: r.defaultTeamName,
      activePeopleCount: r.activePeopleCount,
    }));

    return NextResponse.json({
      ok: true,
      data: {
        teams: mappedTeams,
        departments: mappedDepartments,
        roles: mappedRoles,
      },
    });
  } catch (error) {
    console.error("[org-structure-lists]", error);

    if (error instanceof OrgAuthError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to load org structure lists.",
        },
      },
      { status: 500 }
    );
  }
}

