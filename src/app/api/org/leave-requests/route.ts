/**
 * POST /api/org/leave-requests
 * Create a leave request with status PENDING.
 * Requires canRequestTimeOff (self or admin).
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { getProfilePermissions } from "@/lib/org/permissions/profile-permissions";
import { z } from "zod";
import { differenceInDays } from "date-fns";

const LEAVE_TYPES = ["VACATION", "SICK", "PERSONAL", "PARENTAL", "UNPAID"] as const;

const schema = z.object({
  personId: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  leaveType: z.enum(LEAVE_TYPES),
  notes: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getUnifiedAuth(request);
    const workspaceId = auth.workspaceId ?? "";

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

    const permissions = await getProfilePermissions(
      auth.user.userId,
      validated.personId,
      workspaceId
    );

    if (!permissions.canRequestTimeOff) {
      return NextResponse.json(
        { error: "You do not have permission to request time off for this person" },
        { status: 403 }
      );
    }

    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    const totalDays = differenceInDays(endDate, startDate) + 1;

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        workspaceId,
        personId: validated.personId,
        requesterId: auth.user.userId,
        startDate,
        endDate,
        totalDays,
        leaveType: validated.leaveType,
        status: "PENDING",
        notes: validated.notes ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      leaveRequest: {
        id: leaveRequest.id,
        status: leaveRequest.status,
        startDate: leaveRequest.startDate.toISOString(),
        endDate: leaveRequest.endDate.toISOString(),
        totalDays: leaveRequest.totalDays,
        leaveType: leaveRequest.leaveType,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
