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
import { updateAvailability } from "@/server/org/availability/write";
import { handleApiError } from "@/lib/api-errors";
import { UpdatePersonAvailabilitySchema } from "@/lib/validations/org";

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
    const body = UpdatePersonAvailabilitySchema.parse(await request.json());
    const status = body.status;

    // Step 5: Update availability
    let updated;
    try {
      updated = await updateAvailability(personId, status);
    } catch (updateError: unknown) {
      const updateMsg = updateError instanceof Error ? updateError.message : 'Unknown error';
      const updateCode = updateError && typeof updateError === 'object' && 'code' in updateError ? (updateError as { code: string }).code : undefined;
      const updateStack = updateError instanceof Error ? updateError.stack : undefined;
      console.error("[PUT /api/org/people/[personId]/availability] updateAvailability failed:", {
        personId,
        status,
        error: updateMsg,
        code: updateCode,
        stack: updateStack,
      });
      throw new Error(`Failed to update availability: ${updateMsg}`);
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
    } catch (contextError: unknown) {
      const ctxMsg = contextError instanceof Error ? contextError.message : String(contextError);
      const ctxCode = contextError && typeof contextError === 'object' && 'code' in contextError ? (contextError as { code: string }).code : undefined;
      console.warn("[PUT /api/org/people/[personId]/availability] Failed to emit context object (non-blocking):", ctxMsg);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[PUT /api/org/people/[personId]/availability] Context error details:", {
          message: ctxMsg,
          code: ctxCode,
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
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

