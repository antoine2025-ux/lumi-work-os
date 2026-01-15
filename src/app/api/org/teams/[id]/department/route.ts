import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateDepartmentBody = {
  departmentId: string | null;
};

/**
 * PATCH /api/org/teams/[id]/department
 * Update a team's department assignment.
 * Setting departmentId to null unassigns the team.
 */
export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const context = await getOrgPermissionContext(req);
    if (!context) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Not authenticated.",
          },
        },
        { status: 401 }
      );
    }

    try {
      assertOrgCapability(context, "org:team:update");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
            message: "Not allowed to update teams in this org.",
          },
        },
        { status }
      );
    }

    const workspaceId = context.orgId;
    const { id } = await params;
    const body = (await req.json()) as UpdateDepartmentBody;

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

    // Verify team exists and belongs to this org
    const team = await prisma.orgTeam.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!team) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "TEAM_NOT_FOUND",
            message: "Team not found or does not belong to this organization.",
          },
        },
        { status: 404 }
      );
    }

    // If departmentId is provided, verify it exists and belongs to this org
    if (body.departmentId !== null && body.departmentId !== undefined) {
      const department = await prisma.orgDepartment.findFirst({
        where: {
          id: body.departmentId,
          workspaceId,
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

      // Check for duplicate team name in the target department
      const existingTeam = await prisma.orgTeam.findFirst({
        where: {
          workspaceId,
          departmentId: body.departmentId,
          name: team.name,
          id: { not: id }, // Exclude current team
        },
      });

      if (existingTeam) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: "TEAM_EXISTS",
              message: "A team with this name already exists in the target department.",
            },
          },
          { status: 409 }
        );
      }
    }

    // Update team department (can be null to unassign)
    // Note: departmentId is nullable in schema but types are stale - run prisma generate
    const updatedTeam = await (prisma.orgTeam.update as Function)({
      where: { id },
      data: {
        departmentId: body.departmentId ?? null,
      },
      select: {
        id: true,
        name: true,
        departmentId: true,
      },
    }) as { id: string; name: string; departmentId: string | null };

    return NextResponse.json({
      ok: true,
      team: {
        id: updatedTeam.id,
        name: updatedTeam.name,
        departmentId: updatedTeam.departmentId,
      },
    });
  } catch (error: any) {
    console.error("Error updating team department:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error?.message || "Failed to update team department.",
        },
      },
      { status: 500 }
    );
  }
}

