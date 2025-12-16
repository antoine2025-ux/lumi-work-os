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

    // DepartmentId is required by schema, but we allow it to be optional in the UI
    // If not provided, we'll return a helpful error
    if (!body.departmentId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DEPARTMENT_REQUIRED",
            message: "Department is required. Please select a department or create one first.",
          },
        },
        { status: 400 }
      );
    }

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

    // Verify department exists and belongs to this org
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

    // Check for duplicate team name in the same department
    const existingTeam = await prisma.orgTeam.findFirst({
      where: {
        workspaceId: orgId,
        departmentId: body.departmentId,
        name,
      },
    });

    if (existingTeam) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "TEAM_EXISTS",
            message: "A team with this name already exists in this department.",
          },
        },
        { status: 409 }
      );
    }

    // TODO: adapt model/field names to your schema.
    const team = await prisma.orgTeam.create({
      data: {
        workspaceId: orgId,
        departmentId: body.departmentId,
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
