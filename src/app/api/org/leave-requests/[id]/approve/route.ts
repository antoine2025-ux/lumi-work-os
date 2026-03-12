/**
 * POST /api/org/leave-requests/[id]/approve
 * Approve or deny a leave request.
 * Requires canApproveTimeOff (manager or admin) or team lead status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { z } from "zod";
import {
  processLeaveRequest,
  LeaveRequestError,
} from "@/server/org/leave/process-leave-request";

const schema = z.object({
  action: z.enum(["approve", "deny"]),
  denialReason: z.string().nullable().optional(),
});

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

    const body = await request.json();
    const validated = schema.parse(body);

    const result = await processLeaveRequest({
      leaveRequestId: id,
      workspaceId,
      actorUserId: auth.user.userId,
      action: validated.action,
      denialReason: validated.denialReason ?? undefined,
    });

    return NextResponse.json({ ok: true, status: result.status });
  } catch (error: unknown) {
    if (error instanceof LeaveRequestError) {
      const statusMap = {
        NOT_FOUND: 404,
        NOT_PENDING: 400,
        ACCESS_DENIED: 403,
        VALIDATION_ERROR: 400,
      } as const;
      return NextResponse.json(
        { error: error.message },
        { status: statusMap[error.code] }
      );
    }
    return handleApiError(error, request);
  }
}
