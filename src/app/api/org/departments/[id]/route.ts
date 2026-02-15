import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { OrgDepartmentUpdateSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const workspaceId = await getCurrentWorkspaceId(_req);
    const { id } = await params;

    const department = await prisma.orgDepartment.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        teams: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          include: {
            positions: {
              where: { isActive: true },
              select: {
                id: true,
                title: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { ok: false, error: "Department not found" },
        { status: 404 }
      );
    }

    const teamDtos = department.teams.map((team) => {
      const positionsCount = team.positions.length;
      const assignedUsersCount = team.positions.filter(
        (p) => p.userId !== null
      ).length;

      return {
        id: team.id,
        name: team.name,
        description: team.description ?? "",
        color: team.color ?? null,
        isActive: team.isActive,
        positionsCount,
        assignedUsersCount,
      };
    });

    const dto = {
      id: department.id,
      name: department.name,
      description: department.description ?? "",
      color: department.color ?? null,
      isActive: department.isActive,
      createdAt: department.createdAt.toISOString(),
      updatedAt: department.updatedAt.toISOString(),
      teams: teamDtos,
      stats: {
        teamCount: teamDtos.length,
        positionsCount: teamDtos.reduce(
          (sum, t) => sum + t.positionsCount,
          0
        ),
        assignedUsersCount: teamDtos.reduce(
          (sum, t) => sum + t.assignedUsersCount,
          0
        ),
      },
    };

    return NextResponse.json({ ok: true, department: dto });
  } catch (error) {
    return handleApiError(error, _req);
  }
}

/**
 * PUT /api/org/departments/[id]
 * Update department (all fields editable: name, owner, description)
 */
export async function PUT(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const workspaceId = await getCurrentWorkspaceId(req);
    const { id } = await params;
    const body = OrgDepartmentUpdateSchema.parse(await req.json());

    // Verify department exists
    const existing = await prisma.orgDepartment.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Department not found" },
        { status: 404 }
      );
    }

    // Update department (all fields editable)
    const updated = await prisma.orgDepartment.update({
      where: { id },
      data: {
        name: body.name?.trim() || existing.name,
        description: body.description?.trim() || null,
        ownerPersonId: body.ownerPersonId || null,
      },
    });

    return NextResponse.json({ ok: true, department: updated });
  } catch (error) {
    return handleApiError(error, req);
  }
}

/**
 * DELETE /api/org/departments/[id]
 * Archive department (default action - soft-delete)
 * Optionally hard-delete if hard=true and no references exist
 */
export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  try {
    const workspaceId = await getCurrentWorkspaceId(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const hardDelete = searchParams.get("hard") === "true";

    // Verify department exists
    const department = await prisma.orgDepartment.findFirst({
      where: { id, workspaceId },
      include: {
        teams: {
          where: { isActive: true },
          select: { id: true, name: true },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { ok: false, error: "Department not found" },
        { status: 404 }
      );
    }

    // Check for teams in department (warn, offer to move)
    if (department.teams.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Cannot archive department with active teams",
          teams: department.teams.map((t) => ({ id: t.id, name: t.name })),
        },
        { status: 400 }
      );
    }

    // Get actor user ID for audit logging
    const auth = await getUnifiedAuth(req);
    const actorUserId = auth?.user?.userId || "system";

    if (hardDelete) {
      // Hard delete (admin-only): check audit logs and resolved issues
      const hasAuditLogs = await prisma.orgAuditLog.count({
        where: {
          workspaceId,
          entityType: "DEPARTMENT",
          entityId: id,
        },
      });

      // Check for resolved issues referencing this department
      const hasResolvedIssues = await prisma.orgIssueResolution.count({
        where: {
          workspaceId,
          entityType: "DEPARTMENT",
          entityId: id,
        },
      });

      if (hasAuditLogs > 0 || hasResolvedIssues > 0) {
        return NextResponse.json(
          {
            ok: false,
            error: "Cannot hard-delete: department referenced in audit logs or resolved issues. Use archive instead.",
            auditLogCount: hasAuditLogs,
            resolvedIssuesCount: hasResolvedIssues,
          },
          { status: 400 }
        );
      }

      // Log audit event before deletion (only critical fields: departmentId - set to null on delete)
      const { logOrgMutation } = await import("@/server/org/audit/write");
      await logOrgMutation({
        workspaceId,
        actorUserId,
        action: "DEPARTMENT_DELETED",
        entityType: "DEPARTMENT",
        entityId: id,
        before: { departmentId: id }, // Department existed
        after: { departmentId: null }, // Department deleted
      });

      // Hard delete
      await prisma.orgDepartment.delete({
        where: { id },
      });

      return NextResponse.json({
        ok: true,
        message: "Department permanently deleted",
      });
    } else {
      // Archive (default action - soft-delete)
      // Log audit event (only critical fields: departmentId - unchanged, just archived)
      const { logOrgMutation } = await import("@/server/org/audit/write");
      await logOrgMutation({
        workspaceId,
        actorUserId,
        action: "DEPARTMENT_ARCHIVED",
        entityType: "DEPARTMENT",
        entityId: id,
        before: { departmentId: id }, // Department active
        after: { departmentId: id }, // Department archived (still exists, just inactive)
      });

      const archived = await prisma.orgDepartment.update({
        where: { id },
        data: {
          isActive: false,
          // Note: archivedAt will be added via migration later
          // For now, we use isActive: false
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Department archived",
        department: archived,
      });
    }
  } catch (error) {
    return handleApiError(error, req);
  }
}
