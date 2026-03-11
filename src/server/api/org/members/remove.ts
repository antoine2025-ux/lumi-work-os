import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { logOrgAuditEventStandalone } from "@/server/audit/orgAudit";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";
import { handleApiError } from "@/lib/api-errors";
import { OrgMemberRemoveSchema } from "@/lib/validations/org";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return createErrorResponse(
        "UNAUTHENTICATED",
        "You must be signed in to remove members.",
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

    const { workspaceId, membershipId } = OrgMemberRemoveSchema.parse(
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

    // For now, prevent removing yourself via this endpoint.
    if (targetMembership.userId === auth.user.userId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "You cannot remove yourself this way. Use the \"Leave organization\" action instead."
      );
    }

    // Prevent removing the last ADMIN/OWNER.
    if (targetMembership.role === "ADMIN" || targetMembership.role === "OWNER") {
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
          "You must keep at least one admin in the workspace before removing this member.",
          {
            details: {
              workspaceId,
              membershipId: targetMembership.id,
            },
          }
        );
      }
    }

    await prisma.workspaceMember.delete({
      where: { id: targetMembership.id },
    });

    await logOrgAuditEventStandalone({
      workspaceId,
      actorUserId: auth.user.userId,
      targetUserId: targetMembership.userId,
      event: "MEMBER_REMOVED",
      metadata: {
        via: "ADMIN_REMOVE",
        previousRole: targetMembership.role,
      },
    });

    return createSuccessResponse<Record<string, never>>({});
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

