import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";
import { logOrgAuditEvent } from "@/server/audit/orgAudit";
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
        "You must be signed in to delete a workspace."
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null;

    if (!workspaceId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing workspace id (workspaceId)."
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

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!workspace) {
      return createErrorResponse(
        "NOT_FOUND",
        "Workspace not found."
      );
    }

    if (workspace.ownerId !== auth.user.userId) {
      return createErrorResponse(
        "ORG_OWNER_ONLY",
        "Only the owner can delete this workspace."
      );
    }

    await prisma.$transaction(async (tx) => {
      await logOrgAuditEvent(tx as any, {
        workspaceId,
        actorUserId: auth.user.userId,
        event: "ORG_DELETED",
        metadata: {},
      });

      await tx.workspace.delete({
        where: { id: workspaceId },
      });
    });

    return createSuccessResponse<{}>({});
  } catch (err: any) {
    console.error("[ORG_DELETE_ERROR]", err);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "Unable to delete the workspace. There might be related data preventing deletion."
    );
  }
}

