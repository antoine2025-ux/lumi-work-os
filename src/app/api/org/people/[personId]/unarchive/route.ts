/**
 * PATCH /api/org/people/[personId]/unarchive
 * Unarchive a person (restore).
 * 
 * Validates person belongs to workspace and is currently archived.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ personId: string }> }
) {
  try {
    // Step 1: Get unified auth
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access (TODO: add org:write/admin permission check)
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"], // TODO: restrict to admin/write permissions
    });

    // Step 3: Set workspace context
    setWorkspaceContext(workspaceId);

    // Step 4: Get personId
    const { personId } = await ctx.params;

    // Step 5: Verify person exists and belongs to workspace
    const position = await (prisma as any).orgPosition.findFirst({
      where: {
        id: personId,
        workspaceId,
        userId: { not: null },
      },
      select: {
        id: true,
        archivedAt: true,
      },
    });

    if (!position) {
      return NextResponse.json(
        { 
          error: "Person not found",
          hint: "The requested person does not exist or you don't have access to them."
        },
        { status: 404 }
      );
    }

    // Check if not archived
    if (!position.archivedAt) {
      return NextResponse.json(
        { 
          ok: true,
          message: "Person is not archived",
        },
        { status: 200 }
      );
    }

    // Step 6: Unarchive the person
    const updated = await (prisma as any).orgPosition.update({
      where: { id: personId },
      data: {
        archivedAt: null,
        archivedById: null,
      },
      select: {
        id: true,
        archivedAt: true,
      },
    });

    return NextResponse.json(
      { 
        ok: true,
        person: {
          id: updated.id,
          archivedAt: updated.archivedAt?.toISOString() || null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[PATCH /api/org/people/[personId]/unarchive] Error:", error);

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to perform this action.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to unarchive person",
        hint: error?.message || "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}

