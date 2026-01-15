import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { logOrgAudit } from "@/lib/orgAudit";
import { logger } from "@/lib/logger"
import { buildLogContextFromRequest } from "@/lib/request-context"

// Helper to hash workspaceId for logging (privacy/correlation protection)
function hashWorkspaceId(workspaceId: string | null): string | undefined {
  if (!workspaceId) return undefined
  return workspaceId.slice(-6)
}

type CreateDepartmentBody = {
  name: string;
  description?: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateDepartmentBody;
    const name = body.name?.trim();

    const dbStartTime = performance.now()
    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_NAME",
            message: "Department name is required.",
          },
        },
        { status: 400 }
      );
    }

    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:department:create");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
            message: "Not allowed to create departments in this org.",
          },
        },
        { status }
      );
    }

    const orgId = context!.orgId;

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

    // Check for duplicate department name
    const existingDepartment = await prisma.orgDepartment.findFirst({
      where: {
        workspaceId: orgId,
        name,
      },
    });

    if (existingDepartment) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DEPARTMENT_EXISTS",
            message: "A department with this name already exists.",
          },
        },
        { status: 409 }
      );
    }

    // TODO: adjust model/field names as needed.
    const department = await prisma.orgDepartment.create({
      data: {
        workspaceId: orgId,
        name,
        description: body.description?.trim() || null,
        isActive: true,
      },
    });

    // Audit log
    await logOrgAudit(
      {
        orgId,
        action: "DEPARTMENT_CREATED",
        targetType: "DEPARTMENT",
        targetId: department.id,
        meta: {
          name: department.name,
          description: department.description,
        },
      },
      req
    );

    return NextResponse.json({
      ok: true,
      data: department,
    });
  } catch (error) {
    console.error("[POST /api/org/departments] Error creating department:", error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong while creating the department.",
        },
      },
      { status: 500 }
    );
  }
}

