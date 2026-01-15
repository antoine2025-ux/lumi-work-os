import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { prisma } from "@/lib/db";
import { logOrgAuditEventStandalone } from "@/server/audit/orgAudit";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";

type Body = {
  workspaceId?: string;
  targetMembershipId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);

    if (!auth.isAuthenticated || !auth.user.userId) {
      return createErrorResponse(
        "UNAUTHENTICATED",
        "You must be signed in to transfer ownership."
      );
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null;
    const targetMembershipId =
      typeof body.targetMembershipId === "string" ? body.targetMembershipId : null;

    if (!workspaceId || !targetMembershipId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing workspaceId or targetMembershipId."
      );
    }

    const actingMembership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId: auth.user.userId,
      },
      select: {
        id: true,
        role: true,
        userId: true,
      },
    });

    if (!actingMembership) {
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
        "Only the current owner can transfer ownership."
      );
    }

    const targetMembership = await prisma.workspaceMember.findUnique({
      where: { id: targetMembershipId },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        role: true,
      },
    });

    if (!targetMembership || targetMembership.workspaceId !== workspaceId) {
      return createErrorResponse(
        "NOT_FOUND",
        "Target membership not found in this workspace."
      );
    }

    if (targetMembership.userId === auth.user.userId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "You are already the owner of this workspace."
      );
    }

    const updates: any[] = [];

    if (targetMembership.role !== "ADMIN" && targetMembership.role !== "OWNER") {
      updates.push(
        prisma.workspaceMember.update({
          where: { id: targetMembership.id },
          data: { role: "ADMIN" },
        })
      );
    }

    updates.push(
      prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          ownerId: targetMembership.userId,
        },
      })
    );

    await prisma.$transaction(updates);

    await logOrgAuditEventStandalone({
      workspaceId,
      actorUserId: auth.user.userId,
      targetUserId: targetMembership.userId,
      event: "ORG_OWNERSHIP_TRANSFERRED",
      metadata: {
        fromUserId: auth.user.userId,
        toUserId: targetMembership.userId,
      },
    });

    return createSuccessResponse<{}>({});
  } catch (err) {
    console.error("[ORG_OWNERSHIP_TRANSFER_ERROR]", err);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "Something went wrong while transferring ownership."
    );
  }
}

