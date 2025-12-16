import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";
import { logOrgAuditEventStandalone } from "@/server/audit/orgAudit";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";

type Body = {
  workspaceId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);

    if (!auth.isAuthenticated || !auth.user.userId) {
      return createErrorResponse(
        "UNAUTHENTICATED",
        "You must be signed in to leave a workspace."
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null;

    if (!workspaceId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing workspaceId."
      );
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: auth.user.userId,
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!membership) {
      return createErrorResponse(
        "ORG_NOT_MEMBER",
        "You are not a member of this workspace."
      );
    }

    // Prevent leaving if this user is the last ADMIN/OWNER.
    if (membership.role === "ADMIN" || membership.role === "OWNER") {
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
          "You are the last admin in this workspace. Assign another admin before leaving.",
          {
            details: {
              workspaceId,
              membershipId: membership.id,
            },
          }
        );
      }
    }

    await prisma.workspaceMember.delete({
      where: { id: membership.id },
    });

    await logOrgAuditEventStandalone({
      workspaceId,
      actorUserId: auth.user.userId,
      targetUserId: auth.user.userId,
      event: "MEMBER_REMOVED",
      metadata: {
        via: "SELF_LEAVE",
        previousRole: membership.role,
      },
    });

    return createSuccessResponse<{}>({});
  } catch (err) {
    console.error("[ORG_MEMBER_LEAVE_ERROR]", err);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "Something went wrong while leaving the workspace."
    );
  }
}

