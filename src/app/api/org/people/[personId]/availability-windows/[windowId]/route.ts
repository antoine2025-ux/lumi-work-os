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
import { prisma } from "@/lib/db";

const ALLOWED_TYPES = ["AVAILABLE", "UNAVAILABLE", "PARTIAL"] as const;
const ALLOWED_REASONS = [
  "VACATION",
  "SICK_LEAVE",
  "PARENTAL_LEAVE",
  "SABBATICAL",
  "JURY_DUTY",
  "BEREAVEMENT",
  "TRAINING",
  "OTHER",
] as const;

type AvailabilityType = typeof ALLOWED_TYPES[number];
type AvailabilityReason = typeof ALLOWED_REASONS[number];

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
    const body = await request.json();
    
    const updateData: Record<string, unknown> = {};

    // Validate and set startDate
    if (body.startDate !== undefined) {
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json({ error: "Invalid startDate format" }, { status: 400 });
      }
      updateData.startDate = startDate;
    }

    // Validate and set endDate
    if (body.endDate !== undefined) {
      if (body.endDate === null) {
        updateData.endDate = null;
      } else {
        const endDate = new Date(body.endDate);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json({ error: "Invalid endDate format" }, { status: 400 });
        }
        updateData.endDate = endDate;
      }
    }

    // Validate startDate < endDate if both are being set or one is changing
    const effectiveStart = (updateData.startDate as Date) ?? existing.startDate;
    const effectiveEnd = updateData.endDate !== undefined 
      ? (updateData.endDate as Date | null)
      : existing.endDate;
    if (effectiveEnd && effectiveStart >= effectiveEnd) {
      return NextResponse.json({ error: "startDate must be before endDate" }, { status: 400 });
    }

    // Validate type
    if (body.type !== undefined) {
      if (!ALLOWED_TYPES.includes(body.type)) {
        return NextResponse.json(
          { error: `Invalid type. Must be one of: ${ALLOWED_TYPES.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.type = body.type;
    }

    // Validate fraction
    if (body.fraction !== undefined) {
      if (body.fraction === null) {
        updateData.fraction = null;
      } else {
        const fraction = Number(body.fraction);
        if (isNaN(fraction) || fraction < 0 || fraction > 1) {
          return NextResponse.json({ error: "fraction must be between 0 and 1" }, { status: 400 });
        }
        updateData.fraction = fraction;
      }
    }

    // Validate reason
    if (body.reason !== undefined) {
      if (body.reason === null) {
        updateData.reason = null;
      } else if (!ALLOWED_REASONS.includes(body.reason)) {
        return NextResponse.json(
          { error: `Invalid reason. Must be one of: ${ALLOWED_REASONS.join(", ")}` },
          { status: 400 }
        );
      } else {
        updateData.reason = body.reason;
      }
    }

    // Validate expectedReturnDate
    if (body.expectedReturnDate !== undefined) {
      if (body.expectedReturnDate === null) {
        updateData.expectedReturnDate = null;
      } else {
        const expectedReturnDate = new Date(body.expectedReturnDate);
        if (isNaN(expectedReturnDate.getTime())) {
          return NextResponse.json({ error: "Invalid expectedReturnDate format" }, { status: 400 });
        }
        if (expectedReturnDate < effectiveStart) {
          return NextResponse.json(
            { error: "expectedReturnDate must be on or after startDate" },
            { status: 400 }
          );
        }
        updateData.expectedReturnDate = expectedReturnDate;
      }
    }

    // Note
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
    console.error("[PATCH /api/org/people/[personId]/availability-windows/[windowId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    console.error("[DELETE /api/org/people/[personId]/availability-windows/[windowId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

