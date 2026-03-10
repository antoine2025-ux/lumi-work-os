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
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";
import { UpdatePersonEmploymentSchema } from "@/lib/validations/org";

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
    const body = UpdatePersonEmploymentSchema.parse(await request.json());

    const employmentStatus = body.employmentStatus;
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

    // Step 5: Find the workspace member record for this person (fetch before state for audit)
    // personId here refers to OrgPosition.id, need to get the user and find their membership
    const position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Get before state from workspace member
    const memberBefore = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: position.userId,
        },
      },
      select: {
        employmentStatus: true,
        employmentStartDate: true,
        employmentEndDate: true,
      },
    });

    const before = {
      employmentStatus: memberBefore?.employmentStatus ?? null,
      employmentStartDate: memberBefore?.employmentStartDate?.toISOString() ?? null,
      employmentEndDate: memberBefore?.employmentEndDate?.toISOString() ?? null,
    };

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

    // Compute changes and log audit
    const after = {
      employmentStatus: updated.employmentStatus ?? null,
      employmentStartDate: updated.employmentStartDate?.toISOString() ?? null,
      employmentEndDate: updated.employmentEndDate?.toISOString() ?? null,
    };
    
    const changes = computeChanges(before, after, ['employmentStatus', 'employmentStartDate', 'employmentEndDate']);
    
    logOrgAudit({
      workspaceId,
      entityType: "PERSON",
      entityId: personId,
      entityName: position.user?.name ?? undefined,
      action: "UPDATED",
      actorId: userId,
      changes: changes ?? undefined,
    }).catch((e) => console.error("[PATCH /api/org/people/[personId]/employment] Audit log error (non-fatal):", e));

    return NextResponse.json({
      ok: true,
      userId: updated.userId,
      employmentStatus: updated.employmentStatus,
      employmentStartDate: updated.employmentStartDate?.toISOString() ?? null,
      employmentEndDate: updated.employmentEndDate?.toISOString() ?? null,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

