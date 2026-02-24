import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { logOrgAudit } from "@/lib/orgAudit";
import { OrgDepartmentCreateSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";
import { getUnifiedAuth } from '@/lib/unified-auth';
import { assertAccess } from '@/lib/auth/assertAccess';
import { setWorkspaceContext } from '@/lib/prisma/scopingMiddleware';

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await assertAccess({ userId: auth.user.userId, workspaceId: auth.workspaceId, scope: 'workspace', requireRole: ['ADMIN'] });
    setWorkspaceContext(auth.workspaceId);

    const body = OrgDepartmentCreateSchema.parse(await req.json());
    const name = body.name;

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
    return handleApiError(error, req);
  }
}
