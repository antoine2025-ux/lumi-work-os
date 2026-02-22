import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
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

    await assertAccess({ 
      userId: auth.user.userId, 
      workspaceId, 
      scope: 'workspace', 
      requireRole: ['OWNER'] 
    });
    setWorkspaceContext(workspaceId);

    await prisma.$transaction(async (tx) => {
      await logOrgAuditEvent(tx as Parameters<typeof logOrgAuditEvent>[0], {
        workspaceId,
        actorUserId: auth.user.userId,
        event: "ORG_DELETED",
        metadata: {},
      });

      await tx.workspace.delete({
        where: { id: workspaceId },
      });
    });

    return createSuccessResponse<Record<string, never>>({});
  } catch (err: unknown) {
    console.error("[ORG_DELETE_ERROR]", err);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "Unable to delete the workspace. There might be related data preventing deletion."
    );
  }
}

