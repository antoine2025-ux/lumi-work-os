import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { logOrgAuditEventStandalone } from "@/server/audit/orgAudit";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";
import { handleApiError } from "@/lib/api-errors";
import { OrgMemberLeaveSchema } from "@/lib/validations/org";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);

    if (!auth.isAuthenticated || !auth.user.userId) {
      return createErrorResponse(
        "UNAUTHENTICATED",
        "You must be signed in to leave a workspace."
      );
    }

    const { workspaceId } = OrgMemberLeaveSchema.parse(
      await req.json().catch(() => ({}))
    );

    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    });
    setWorkspaceContext(workspaceId);

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

    return createSuccessResponse<Record<string, never>>({});
  } catch (error) {
    return handleApiError(error);
  }
}

