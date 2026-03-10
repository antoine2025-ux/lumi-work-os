/**
 * DELETE /api/org/work/[id]/impact/[impactId]
 *
 * Phase J: Delete an explicit impact and return fresh resolution
 *
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Delete → Resolver
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { resolveWorkImpact } from "@/lib/org/impact/resolveWorkImpact";
import { deleteExplicitImpact } from "@/lib/org/impact/read";

type RouteParams = { params: Promise<{ id: string; impactId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workRequestId, impactId } = await params;

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

    // Step 4: Verify work request exists
    const workRequest = await prisma.workRequest.findFirst({
      where: {
        id: workRequestId,
        workspaceId,
      },
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Step 5: Verify impact exists and belongs to this work request
    const existingImpact = await prisma.workImpact.findFirst({
      where: {
        id: impactId,
        workspaceId,
        workRequestId,
      },
    });

    if (!existingImpact) {
      return NextResponse.json({ error: "Impact not found" }, { status: 404 });
    }

    // Step 6: Delete the impact
    const deletedImpact = await deleteExplicitImpact(workspaceId, impactId);

    if (!deletedImpact) {
      return NextResponse.json({ error: "Failed to delete impact" }, { status: 500 });
    }

    // Step 7: Re-resolve the full impact graph
    const result = await resolveWorkImpact(workspaceId, workRequest);

    return NextResponse.json({
      ok: true,
      deleted: {
        id: deletedImpact.id,
        impactKey: deletedImpact.impactKey,
      },
      ...result,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
