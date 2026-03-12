/**
 * PATCH/DELETE /api/org/people/[personId]/availability-windows/[windowId]
 * Update or delete a single availability window.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { UpdateAvailabilityWindowSchema } from "@/lib/validations/org";


export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string; windowId: string }> }
) {
  try {
    const { personId, windowId } = await ctx.params;

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

    // Step 4: Get the user ID from position
    // Handle both OrgPosition ID and User ID (personId might be either)
    let position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    // If not found by ID, personId might be a User ID - try to find by userId
    if (!position) {
      position = await prisma.orgPosition.findFirst({
        where: {
          userId: personId,
          workspaceId,
          isActive: true,
        },
        select: {
          userId: true,
        },
      });
    }

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Step 5: Check window exists and belongs to this person
    const existing = await prisma.personAvailability.findFirst({
      where: {
        id: windowId,
        workspaceId,
        personId: position.userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Availability window not found" }, { status: 404 });
    }

    // Step 6: Parse and validate request body
    const body = UpdateAvailabilityWindowSchema.parse(await request.json());
    
    const updateData: Record<string, unknown> = {};

    if (body.startDate !== undefined) {
      updateData.startDate = new Date(body.startDate);
    }

    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }

    if (body.type !== undefined) {
      updateData.type = body.type;
    }

    if (body.fraction !== undefined) {
      updateData.fraction = body.fraction;
    }

    if (body.reason !== undefined) {
      updateData.reason = body.reason;
    }

    if (body.expectedReturnDate !== undefined) {
      updateData.expectedReturnDate = body.expectedReturnDate ? new Date(body.expectedReturnDate) : null;
    }

    if (body.note !== undefined) {
      updateData.note = body.note;
    }

    // Step 7: Update the window
    const updated = await prisma.personAvailability.update({
      where: { id: windowId },
      data: updateData,
      select: {
        id: true,
        type: true,
        startDate: true,
        endDate: true,
        fraction: true,
        reason: true,
        expectedReturnDate: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      window: {
        id: updated.id,
        type: updated.type,
        startDate: updated.startDate.toISOString(),
        endDate: updated.endDate?.toISOString() ?? null,
        fraction: updated.fraction,
        reason: updated.reason,
        expectedReturnDate: updated.expectedReturnDate?.toISOString() ?? null,
        note: updated.note,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string; windowId: string }> }
) {
  try {
    const { personId, windowId } = await ctx.params;

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

    // Step 4: Get the user ID from position
    // Handle both OrgPosition ID and User ID (personId might be either)
    let position = await prisma.orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    // If not found by ID, personId might be a User ID - try to find by userId
    if (!position) {
      position = await prisma.orgPosition.findFirst({
        where: {
          userId: personId,
          workspaceId,
          isActive: true,
        },
        select: {
          userId: true,
        },
      });
    }

    if (!position || !position.userId) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    // Step 5: Check window exists and belongs to this person
    const existing = await prisma.personAvailability.findFirst({
      where: {
        id: windowId,
        workspaceId,
        personId: position.userId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Availability window not found" }, { status: 404 });
    }

    // Step 6: Delete the window
    await prisma.personAvailability.delete({
      where: { id: windowId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

