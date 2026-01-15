/**
 * PUT /api/org/people/[personId]/name
 * Update the name (fullName) for a person.
 * This updates the underlying User.name field.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { requireNonEmptyString } from "@/server/org/validate";
import { prisma } from "@/lib/db";

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
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse and validate request body
    const body = await request.json();
    const name = requireNonEmptyString(body.name, "name");

    // Step 5: Verify person exists and get userId
    const position = await prisma.orgPosition.findUnique({
      where: { id: personId },
      select: { id: true, userId: true, workspaceId: true },
    });

    if (!position) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    if (!position.userId) {
      return NextResponse.json({ error: "Person is not linked to a user" }, { status: 400 });
    }

    // Step 6: Update User.name (not OrgPosition)
    const updatedUser = await prisma.user.update({
      where: { id: position.userId },
      data: { name },
      select: { id: true, name: true },
    });

    // Step 7: Emit Loopbrain context (persist + trigger indexing non-blocking)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.person.updated",
        entity: { type: "person", id: personId },
        payload: { name },
      });
    } catch (loopbrainError: any) {
      // Log but don't fail the request if Loopbrain indexing fails
      console.error("[PUT /api/org/people/[personId]/name] Loopbrain indexing error (non-fatal):", loopbrainError);
    }

    return NextResponse.json(
      { id: personId, fullName: updatedUser.name },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[PUT /api/org/people/[personId]/name] Error:", error);
    console.error("[PUT /api/org/people/[personId]/name] Error stack:", error?.stack);
    console.error("[PUT /api/org/people/[personId]/name] Error details:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    });

    if (error?.message?.includes("Person not found") || error?.message?.includes("not linked")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error?.message?.includes("Invalid name") || error?.message?.includes("must be a non-empty string")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    // Return more detailed error message in development
    const errorMessage = process.env.NODE_ENV === "development"
      ? `${error?.message || "Internal server error"} (${error?.code || "unknown"})`
      : "Internal server error";

    return NextResponse.json(
      { 
        error: errorMessage,
        hint: error?.message || "An unexpected error occurred. Please check the server logs.",
      },
      { status: 500 }
    );
  }
}

