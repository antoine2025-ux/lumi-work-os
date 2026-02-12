/**
 * POST /api/org/leave-requests/[id]/approve
 * Approve or deny a leave request.
 * Requires canApproveTimeOff (manager or admin).
 * On approve: optionally create PersonAvailability for profile display.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { getProfilePermissions } from "@/lib/org/permissions/profile-permissions";
import { z } from "zod";

const LEAVE_TYPE_TO_REASON: Record<string, string> = {
  VACATION: "VACATION",
  SICK: "SICK_LEAVE",
  PERSONAL: "OTHER",
  PARENTAL: "PARENTAL_LEAVE",
  UNPAID: "OTHER",
};

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
        { error: "Leave request is no longer pending" },
        { status: 400 }
      );
    }

    const permissions = await getProfilePermissions(
      auth.user.userId,
      leaveRequest.personId,
      workspaceId
    );

    const isTeamLeadOfPerson = await prisma.orgTeam.findFirst({
      where: {
        workspaceId,
        leaderId: auth.user.userId,
        positions: {
          some: {
            userId: leaveRequest.personId,
            isActive: true,
            archivedAt: null,
          },
        },
      },
    });

    const canApprove =
      permissions.canApproveTimeOff || !!isTeamLeadOfPerson;

    if (!canApprove) {
      return NextResponse.json(
        { error: "You do not have permission to approve this leave request" },
        { status: 403 }
      );
    }

    if (validated.action === "deny") {
      if (!validated.denialReason?.trim()) {
        return NextResponse.json(
          { error: "Denial reason is required when denying a request" },
          { status: 400 }
        );
      }

      await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: validated.denialReason,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        status: "REJECTED",
      });
    }

    await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: auth.user.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const reason = LEAVE_TYPE_TO_REASON[leaveRequest.leaveType] ?? "OTHER";

    await prisma.personAvailability.create({
      data: {
        workspaceId,
        personId: leaveRequest.personId,
        type: "UNAVAILABLE",
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        reason: reason as "VACATION" | "SICK_LEAVE" | "PARENTAL_LEAVE" | "OTHER",
        note: leaveRequest.notes ?? null,
        createdById: auth.user.userId,
      },
    });

    return NextResponse.json({
      ok: true,
      status: "APPROVED",
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
