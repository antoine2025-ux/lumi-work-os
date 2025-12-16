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
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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
    const verifiedOrgId = context!.orgId;
    
    // Verify orgId matches
    if (verifiedOrgId !== orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "ORG_MISMATCH",
            message: "Organization ID mismatch.",
          },
        },
        { status: 403 }
      );
    }

    const body = (await req.json()) as CreateTeamBody;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "INVALID_NAME", message: "Team name is required." },
        },
        { status: 400 }
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
    } else {
      // If no departmentId, we need to create a default department or require one
      // For now, require departmentId
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DEPARTMENT_REQUIRED",
            message: "Department is required for team creation.",
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicate team name in the same department
    const existingTeam = await prisma.orgTeam.findFirst({
      where: {
        workspaceId: orgId,
        departmentId: body.departmentId!,
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

    const team = await prisma.orgTeam.create({
      data: {
        workspaceId: orgId,
        departmentId: body.departmentId!,
        name,
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
        },
      },
      req
    );

    return NextResponse.json({
      ok: true,
      data: team,
    });
  } catch (error) {
    console.error("[org-structure-team-post]", error);

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create team.",
        },
      },
      { status: 500 }
    );
  }
}

