import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";
import { logOrgAuditEventStandalone } from "@/server/audit/orgAudit";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { handleApiError } from "@/lib/api-errors";
import { OrgMemberRemoveSchema } from "@/lib/validations/org";

export async function POST(req: NextRequest) {
  try {
    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:member:remove");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return createErrorResponse(
        status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        "You are not allowed to remove members from this org.",
        { status }
      );
    }

    const auth = await getUnifiedAuth(req);
    const { workspaceId, membershipId } = OrgMemberRemoveSchema.parse(
      await req.json().catch(() => ({}))
    );

    // Verify workspaceId matches context
    if (context!.orgId !== workspaceId) {
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

    return createSuccessResponse<{}>({});
  } catch (error) {
    return handleApiError(error);
  }
}

