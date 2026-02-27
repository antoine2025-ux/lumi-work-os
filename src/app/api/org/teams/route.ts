import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { logOrgAudit } from "@/lib/orgAudit";
import { OrgTeamCreateSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";

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

    const teams = await prisma.orgTeam.findMany({
      where: {
        workspaceId: auth.workspaceId,
      isActive: true,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
    return NextResponse.json({ teams });
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const body = OrgTeamCreateSchema.parse(await req.json());
    const name = body.name;
    const workspaceId = auth.workspaceId;

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
    }

    // Check for duplicate team name in the same department (or unassigned)
    const existingTeam = await prisma.orgTeam.findFirst({
      where: {
        workspaceId,
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
        workspaceId,
        departmentId: body.departmentId ?? null,
        name,
        description: body.description?.trim() || null,
        isActive: true,
      },
    });

    // Audit log
    await logOrgAudit(
      {
        orgId: workspaceId,
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
    return handleApiError(error, req);
  }
}
