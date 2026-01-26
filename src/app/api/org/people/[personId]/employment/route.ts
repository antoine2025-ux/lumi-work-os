/**
 * PATCH /api/org/people/[personId]/employment
 * Update employment status for a person.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

const ALLOWED_STATUSES = ["ACTIVE", "ON_LEAVE", "TERMINATED", "CONTRACTOR"] as const;
type EmploymentStatus = typeof ALLOWED_STATUSES[number];

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await ctx.params;

    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();

    // Validate employmentStatus
    const employmentStatus = body.employmentStatus as EmploymentStatus | undefined;
    if (employmentStatus && !ALLOWED_STATUSES.includes(employmentStatus)) {
      return NextResponse.json(
        { error: `Invalid employmentStatus. Must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Parse optional dates
    const employmentStartDate = body.employmentStartDate
      ? new Date(body.employmentStartDate)
      : body.employmentStartDate === null
      ? null
      : undefined;

    const employmentEndDate = body.employmentEndDate
      ? new Date(body.employmentEndDate)
      : body.employmentEndDate === null
      ? null
      : undefined;

    // Validate dates if provided
    if (employmentStartDate && isNaN(employmentStartDate.getTime())) {
      return NextResponse.json({ error: "Invalid employmentStartDate format" }, { status: 400 });
    }
    if (employmentEndDate && isNaN(employmentEndDate.getTime())) {
      return NextResponse.json({ error: "Invalid employmentEndDate format" }, { status: 400 });
    }

    // Step 5: Find the workspace member record for this person
    // personId here refers to OrgPosition.id, need to get the user and find their membership
    const position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Step 6: Update the workspace member
    const updateData: Record<string, unknown> = {};
    if (employmentStatus !== undefined) {
      updateData.employmentStatus = employmentStatus;
    }
    if (employmentStartDate !== undefined) {
      updateData.employmentStartDate = employmentStartDate;
    }
    if (employmentEndDate !== undefined) {
      updateData.employmentEndDate = employmentEndDate;
    }

    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: position.userId,
        },
      },
      data: updateData,
      select: {
        userId: true,
        employmentStatus: true,
        employmentStartDate: true,
        employmentEndDate: true,
      },
    });

    return NextResponse.json({
      ok: true,
      userId: updated.userId,
      employmentStatus: updated.employmentStatus,
      employmentStartDate: updated.employmentStartDate?.toISOString() ?? null,
      employmentEndDate: updated.employmentEndDate?.toISOString() ?? null,
    });
  } catch (error: unknown) {
    console.error("[PATCH /api/org/people/[personId]/employment] Error:", error);

    if (error && typeof error === "object" && "status" in error) {
      const err = error as { status: number; message?: string };
      return NextResponse.json(
        { error: err.message || "Unauthorized" },
        { status: err.status }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

