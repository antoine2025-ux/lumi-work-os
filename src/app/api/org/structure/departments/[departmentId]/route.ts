/**
 * DELETE /api/org/structure/departments/[departmentId]
 * Hard delete a department.
 * 
 * Requires OWNER/ADMIN role.
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors"
import { logOrgAudit } from "@/lib/audit/org-audit"

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ departmentId: string }> }
) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[DELETE /api/org/structure/departments/[departmentId]] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          ok: false,
          error: "UNAUTHORIZED",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert OWNER/ADMIN access (only workspace owners/admins can delete departments)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["OWNER", "ADMIN"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Get departmentId and verify department exists
    const { departmentId } = await ctx.params;
    
    // Check if department exists and get its name and teams
    const department = await prisma.orgDepartment.findFirst({
      where: {
        id: departmentId,
        workspaceId: workspaceId,
      },
      include: {
        teams: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!department) {
      return NextResponse.json(
        { 
          ok: false,
          error: "NOT_FOUND",
          hint: "The requested department does not exist or you don't have access to it."
        },
        { status: 404 }
      );
    }

    // Block deletion if department has teams
    if (department.teams.length > 0) {
      return NextResponse.json(
        { 
          ok: false,
          error: "HAS_TEAMS",
          hint: `Department has ${department.teams.length} team${department.teams.length === 1 ? "" : "s"}. Move or delete teams first.`
        },
        { status: 400 }
      );
    }

    // Step 5: Delete department (no teams, safe to delete).
    // SECURITY: $executeRaw tagged template parameterizes ${} values (no SQL injection).
    await prisma.$transaction(async (tx) => {
      // Delete department owner assignments if they exist
      await tx.$executeRaw`
        DELETE FROM owner_assignments
        WHERE "entityId" = ${departmentId} 
        AND "workspaceId" = ${workspaceId}
        AND "entityType" = 'DEPARTMENT'
      `;

      // Finally, delete the department
      await tx.orgDepartment.delete({
        where: {
          id: departmentId,
        },
      });
    });

    // Step 6: Log audit entry (fire-and-forget)
    logOrgAudit({
      workspaceId,
      entityType: "DEPARTMENT",
      entityId: departmentId,
      entityName: department.name,
      action: "DELETED",
      actorId: userId,
    }).catch((e) => console.error("[DELETE /api/org/structure/departments/[departmentId]] Audit error:", e));

    console.log(`[DELETE /api/org/structure/departments/[departmentId]] Deleted department ${departmentId} by user ${userId}`);

    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, request)
  }
}

