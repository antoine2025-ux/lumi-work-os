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

const ALLOWED_ROLES = ["ADMIN", "MEMBER"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

type Body = {
  workspaceId?: string;
  membershipId?: string;
  role?: string;
};

export async function POST(req: NextRequest) {
  try {
    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:member:role.change");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return createErrorResponse(
        status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        "You are not allowed to change member roles in this org.",
        { status }
      );
    }

    const auth = await getUnifiedAuth(req);
    const body = (await req.json().catch(() => ({}))) as Body;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null;
    const membershipId =
      typeof body.membershipId === "string" ? body.membershipId : null;
    const role = typeof body.role === "string" ? body.role : null;

    if (!workspaceId || !membershipId || !role) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing workspaceId, membershipId, or role."
      );
    }

    if (!ALLOWED_ROLES.includes(role as AllowedRole)) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Invalid role."
      );
    }

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

    // If no role change, nothing to do.
    if (targetMembership.role === role) {
      return createSuccessResponse<{}>({});
    }

    // Prevent removing the last ADMIN/OWNER by demoting them.
    const isDemotingAdmin =
      (targetMembership.role === "ADMIN" || targetMembership.role === "OWNER") && role !== "ADMIN" && role !== "OWNER";

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
        role: role as AllowedRole,
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
  } catch (err) {
    console.error("[ORG_MEMBER_UPDATE_ROLE_ERROR]", err);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "Something went wrong while updating the member role."
    );
  }
}

