/**
 * POST /api/org/work/requests/[id]/close
 * 
 * Close a work request.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import {
  getOrCreateWorkspaceEffortDefaults,
  getEstimatedEffortHours,
} from "@/lib/org/work/effortDefaults";
import { getWorkRequestResponseMeta } from "@/lib/org/work/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Step 4: Check if work request exists
    const existing = await prisma.workRequest.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Already closed
    if (existing.status === "CLOSED") {
      return NextResponse.json(
        { error: "Work request is already closed" },
        { status: 400 }
      );
    }

    // Step 5: Close the work request
    const workRequest = await prisma.workRequest.update({
      where: { id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    // Get effort defaults for conversion
    const effortDefaults = await getOrCreateWorkspaceEffortDefaults(workspaceId);

    return NextResponse.json({
      ok: true,
      request: {
        id: workRequest.id,
        title: workRequest.title,
        description: workRequest.description,
        priority: workRequest.priority,
        desiredStart: workRequest.desiredStart.toISOString(),
        desiredEnd: workRequest.desiredEnd.toISOString(),
        effortType: workRequest.effortType,
        effortHours: workRequest.effortHours,
        effortTShirt: workRequest.effortTShirt,
        estimatedEffortHours: getEstimatedEffortHours(workRequest, effortDefaults),
        domainType: workRequest.domainType,
        domainId: workRequest.domainId,
        requiredRoleType: workRequest.requiredRoleType,
        requiredSeniority: workRequest.requiredSeniority,
        requesterPersonId: workRequest.requesterPersonId,
        createdById: workRequest.createdById,
        status: workRequest.status,
        closedAt: workRequest.closedAt?.toISOString() ?? null,
        createdAt: workRequest.createdAt.toISOString(),
        updatedAt: workRequest.updatedAt.toISOString(),
      },
      responseMeta: getWorkRequestResponseMeta(),
    });
  } catch (error: unknown) {
    console.error("[POST /api/org/work/requests/[id]/close] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
