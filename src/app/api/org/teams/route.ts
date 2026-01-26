import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { logOrgAudit } from "@/lib/orgAudit";

type CreateTeamBody = {
  name: string;
  departmentId?: string | null;
  description?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateTeamBody;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_NAME",
            message: "Team name is required.",
          },
        },
        { status: 400 }
      );
    }

    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:team:create");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
            message: "Not allowed to create teams in this org.",
          },
        },
        { status }
      );
    }

    // At this point, context is guaranteed non-null & authorized
    const orgId = context!.orgId;

    // DepartmentId is optional - teams can be unassigned (departmentId = null)
    // This allows teams to exist temporarily without a department

    if (!prisma) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Database connection unavailable.",
          },
        },
        { status: 500 }
      );
    }

    // If departmentId is provided, verify it exists and belongs to this org
    if (body.departmentId) {
      const department = await prisma.orgDepartment.findFirst({
        where: {
          id: body.departmentId,
          workspaceId: orgId,
        },
      });

      if (!department) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "INVALID_DEPARTMENT",
              message: "Department not found or does not belong to this organization.",
            },
          },
          { status: 400 }
        );
      }
    }

    // Check for duplicate team name in the same department (or unassigned)
    const existingTeam = await prisma.orgTeam.findFirst({
      where: {
        workspaceId: orgId,
        departmentId: body.departmentId ?? null,
        name,
      },
    });

    if (existingTeam) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "TEAM_EXISTS",
            message: body.departmentId 
              ? "A team with this name already exists in this department."
              : "A team with this name already exists (unassigned).",
          },
        },
        { status: 409 }
      );
    }

    // Create team (departmentId can be null for unassigned teams)
    const team = await prisma.orgTeam.create({
      data: {
        workspaceId: orgId,
        departmentId: body.departmentId ?? null,
        name,
        description: body.description?.trim() || null,
        isActive: true,
      },
    });

    // Audit log
    await logOrgAudit(
      {
        orgId,
        action: "TEAM_CREATED",
        targetType: "TEAM",
        targetId: team.id,
        meta: {
          name: team.name,
          departmentId: team.departmentId,
          description: team.description,
        },
      },
      req
    );

    return NextResponse.json({
      ok: true,
      data: team,
    });
  } catch (error) {
    console.error("[POST /api/org/teams] Error creating team:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong while creating the team.",
        },
      },
      { status: 500 }
    );
  }
}
