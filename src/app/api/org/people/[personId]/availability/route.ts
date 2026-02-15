/**
 * PUT /api/org/people/[personId]/availability
 * Update availability status for a person.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { optionalEnum } from "@/server/org/validate";
import { updateAvailability } from "@/server/org/availability/write";
import { handleApiError } from "@/lib/api-errors"

const ALLOWED_STATUSES = ["UNKNOWN", "AVAILABLE", "PARTIALLY_AVAILABLE", "UNAVAILABLE"] as const;

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await ctx.params;

    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();
    const status = optionalEnum(body.status, ALLOWED_STATUSES) ?? "UNKNOWN";

    // Step 5: Update availability
    let updated;
    try {
      updated = await updateAvailability(personId, status);
    } catch (updateError: any) {
      console.error("[PUT /api/org/people/[personId]/availability] updateAvailability failed:", {
        personId,
        status,
        error: updateError?.message,
        code: updateError?.code,
        stack: updateError?.stack,
      });
      // Re-throw with more context
      throw new Error(`Failed to update availability: ${updateError?.message || 'Unknown error'}`);
    }

    // Step 6: Emit Loopbrain context (persist + trigger indexing non-blocking)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.availability.updated",
        entity: { type: "person", id: personId },
        payload: { status },
      });
    } catch (contextError: any) {
      console.warn("[PUT /api/org/people/[personId]/availability] Failed to emit context object (non-blocking):", contextError?.message);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[PUT /api/org/people/[personId]/availability] Context error details:", {
          message: contextError?.message,
          code: contextError?.code,
        });
      }
    }

    return NextResponse.json(
      {
        id: updated.id,
        availabilityStatus: updated.availabilityStatus,
        availabilityUpdatedAt: updated.availabilityUpdatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, request)
  }
}

