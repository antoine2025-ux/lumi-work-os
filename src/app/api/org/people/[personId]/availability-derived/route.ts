/**
 * GET /api/org/people/[personId]/availability-derived
 * Returns computed availability using derivePersonAvailability().
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import {
  derivePersonAvailability,
  type AvailabilityWindow,
  type EmploymentStatus,
} from "@/lib/org/deriveAvailability";

/**
 * Get availability label from fraction.
 * Explicit and deterministic - only uses fraction value.
 */
function getAvailabilityLabel(fraction: number): string {
  if (fraction === 1) return "Available";
  if (fraction > 0 && fraction < 1) return "Limited";
  return "Unavailable"; // fraction === 0
}

export async function GET(
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

    // Step 5: Get employment status from workspace member
    const member = await prisma.workspaceMember.findUnique({
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

    const employmentStatus = (member?.employmentStatus as EmploymentStatus) ?? "ACTIVE";

    // Step 6: Fetch availability windows
    const windowsRaw = await prisma.personAvailability.findMany({
      where: {
        workspaceId,
        personId: position.userId,
      },
      orderBy: {
        startDate: "desc",
      },
      select: {
        type: true,
        startDate: true,
        endDate: true,
        fraction: true,
        reason: true,
        expectedReturnDate: true,
        note: true,
      },
    });

    // Convert to AvailabilityWindow format
    const windows: AvailabilityWindow[] = windowsRaw.map((w) => ({
      type: w.type === "UNAVAILABLE" ? "unavailable" : "partial",
      startDate: w.startDate,
      endDate: w.endDate ?? undefined,
      fraction: w.fraction ?? undefined,
      reason: w.reason as AvailabilityWindow["reason"],
      expectedReturnDate: w.expectedReturnDate ?? undefined,
      note: w.note ?? undefined,
    }));

    // Step 7: Derive availability
    const derived = derivePersonAvailability({
      personId: position.userId,
      employmentStatus,
      windows,
    });

    // Compute label from effective capacity
    const label = getAvailabilityLabel(derived.effectiveCapacity);

    return NextResponse.json({
      ok: true,
      derived: {
        personId: position.userId,
        employmentStatus: derived.employmentStatus,
        status: derived.availability.status,
        label,
        fraction: derived.effectiveCapacity,
        reason: derived.availability.reason ?? null,
        expectedReturnDate: derived.availability.expectedReturnDate?.toISOString() ?? null,
        isWorking: derived.isWorking,
        computedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/people/[personId]/availability-derived] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
