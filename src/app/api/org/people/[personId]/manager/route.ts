/**
 * PUT /api/org/people/[personId]/manager
 * Set the manager (reporting line) for a person.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { optionalString } from "@/server/org/validate";
import { setOrgPersonManager } from "@/server/org/people/write";

export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  let personId: string | undefined;
  let managerId: string | null | undefined;

  try {
    const params = await ctx.params;
    personId = params.personId;

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
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();
    managerId = optionalString(body.managerId);

    // Step 5: Set manager
    const updated = await setOrgPersonManager(personId, managerId);

    // Step 6: Emit Loopbrain context (persist + trigger indexing non-blocking)
    // Wrap in try-catch to prevent Loopbrain errors from breaking the response
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.person.manager_set",
        entity: { type: "person", id: updated.id },
        payload: { managerId },
      });
    } catch (loopbrainError: any) {
      // Log but don't fail the request if Loopbrain fails
      console.error("[PUT /api/org/people/[personId]/manager] Loopbrain error (non-fatal):", loopbrainError);
    }

    return NextResponse.json(
      { id: updated.id, managerId: updated.managerId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[PUT /api/org/people/[personId]/manager] Error:", error);
    console.error("[PUT /api/org/people/[personId]/manager] Error details:", {
      message: error?.message,
      stack: error?.stack,
      personId,
      managerId,
    });

    if (error?.message?.includes("Manager cannot be self")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error?.message?.includes("Person not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error?.message?.includes("Manager not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ 
      error: error?.message || "Internal server error",
      hint: "Check server logs for details"
    }, { status: 500 });
  }
}

