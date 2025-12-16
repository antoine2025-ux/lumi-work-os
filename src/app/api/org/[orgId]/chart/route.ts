import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertOrgAccess, OrgAuthError } from "@/lib/orgAuth";

type OrgChartTeam = {
  id: string;
  name: string;
  leadName: string | null;
  headcount: number;
};

type OrgChartDepartment = {
  id: string;
  name: string;
  teams: OrgChartTeam[];
};

type OrgChartResponse =
  | {
      ok: true;
      data: {
        departments: OrgChartDepartment[];
      };
    }
  | {
      ok: false;
      error: { code: string; message: string };
    };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
): Promise<NextResponse<OrgChartResponse>> {
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
    // Fetch departments with their teams and positions
    const departments = await prisma.orgDepartment.findMany({
      where: { workspaceId: orgId, isActive: true },
      include: {
        teams: {
          where: { isActive: true },
          include: {
            positions: {
              where: { isActive: true },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: [{ level: "desc" }, { order: "asc" }], // Higher level first, then by order
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const resultDepartments: OrgChartDepartment[] = departments.map((dept) => ({
      id: dept.id,
      name: dept.name,
      teams: dept.teams.map((team) => {
        // Find lead: first position with a user, or highest level position with user
        const leadPosition = team.positions.find((pos) => pos.user !== null);
        const leadName = leadPosition?.user?.name ?? null;

        // Headcount: count positions with users assigned
        const headcount = team.positions.filter((pos) => pos.user !== null).length;

        return {
          id: team.id,
          name: team.name,
          leadName,
          headcount,
        };
      }),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        departments: resultDepartments,
      },
    });
  } catch (error) {
    console.error("[org-chart]", error);

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
          message: "Failed to load org chart structure.",
        },
      },
      { status: 500 }
    );
  }
}

