/**
 * POST /api/org/leave-requests/[id]/cancel
 * Cancel a pending leave request. Only the requester can cancel.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getUnifiedAuth(request);
    const workspaceId = auth.workspaceId ?? "";
    const { id } = await ctx.params;

    if (!auth.user?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId: auth.user.userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    setWorkspaceContext(workspaceId);

    const leaveRequest = await prisma.leaveRequest.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!leaveRequest) {
      return NextResponse.json(
        { error: "Leave request not found" },
        { status: 404 }
      );
    }

    if (leaveRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending requests can be cancelled" },
        { status: 400 }
      );
    }

    if (leaveRequest.requesterId !== auth.user.userId) {
      return NextResponse.json(
        { error: "You can only cancel your own requests" },
        { status: 403 }
      );
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, status: "CANCELLED" });
  } catch (error) {
    return handleApiError(error, request);
  }
}
