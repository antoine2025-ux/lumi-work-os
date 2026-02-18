import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { logOrgAuditEventStandalone } from "@/server/audit/orgAudit";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";
import { handleApiError } from "@/lib/api-errors";
import { OrgMemberUpdateRoleSchema } from "@/lib/validations/org";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return createErrorResponse(
        "UNAUTHENTICATED",
        "You must be signed in to change member roles.",
        { status: 401 }
      );
    }
    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId: auth.workspaceId, 
      scope: 'workspace', 
      requireRole: ['ADMIN', 'OWNER'] 
    });
    setWorkspaceContext(auth.workspaceId);

    const { workspaceId, membershipId, role } = OrgMemberUpdateRoleSchema.parse(
      await req.json().catch(() => ({}))
    );

    // Verify workspaceId matches authenticated workspace
    if (auth.workspaceId !== workspaceId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Organization ID mismatch."
      );
    }

    if (!prisma) {
      return createErrorResponse(
        "INTERNAL_SERVER_ERROR",
        "Database connection unavailable."
      );
    }

    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { id: membershipId },
      select: {
        id: true,
        workspaceId: true,
        role: true,
        userId: true,
      },
    });

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      return createErrorResponse(
        "NOT_FOUND",
        "Membership not found in this workspace."
      );
    }

    // If no role change, nothing to do.
    if (targetMembership.role === role) {
      return createSuccessResponse<{}>({});
    }

    // Prevent removing the last ADMIN/OWNER by demoting them.
    const isDemotingAdmin =
      (targetMembership.role === "ADMIN" || targetMembership.role === "OWNER") && (role as string) !== "ADMIN" && (role as string) !== "OWNER";

    if (isDemotingAdmin) {
      const adminCount = await prisma.workspaceMember.count({
        where: {
          workspaceId,
          role: {
            in: ["ADMIN", "OWNER"],
          },
        },
      });

      if (adminCount <= 1) {
        return createErrorResponse(
          "ORG_LAST_ADMIN",
          "You must keep at least one admin in the workspace before changing this role.",
          {
            details: {
              workspaceId,
              membershipId: targetMembership.id,
            },
          }
        );
      }
    }

    await prisma.workspaceMember.update({
      where: { id: targetMembership.id },
      data: {
        role,
      },
    });

    await logOrgAuditEventStandalone({
      workspaceId,
      actorUserId: auth.user.userId,
      targetUserId: targetMembership.userId,
      event: "MEMBER_ROLE_CHANGED",
      metadata: {
        fromRole: targetMembership.role,
        toRole: role,
      },
    });

    return createSuccessResponse<{}>({});
  } catch (error) {
    return handleApiError(error);
  }
}

