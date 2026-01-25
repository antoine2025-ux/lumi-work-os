/**
 * POST /api/org/intelligence/snapshots/create
 * Create a new intelligence snapshot (on-demand).
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 * 
 * Computes current intelligence findings and persists them with Loopbrain indexing.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { createIntelligenceSnapshot } from "@/server/org/intelligence/snapshots";
import { emitOrgContextObject } from "@/server/org/loopbrain";

export async function POST(request: NextRequest) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Step 2: Assert access (verifies workspace membership and role)
    // Using MEMBER role since snapshot creation creates persistent records and triggers indexing
    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    // Step 3: Set workspace context (enables automatic Prisma scoping)
    setWorkspaceContext(workspaceId);

    // Step 4: Create snapshot (computes findings and persists them)
    const snapshot = await createIntelligenceSnapshot({ source: "on_demand", workspaceId });

    // Step 5: Emit Loopbrain context (persist + trigger indexing non-blocking)
    await emitOrgContextObject({
      workspaceId,
      actorUserId: userId,
      action: "org.intelligence.snapshot_created",
      entity: { type: "org", id: snapshot.id } as any,
      payload: {
        snapshotId: snapshot.id,
        findingCount: snapshot.findingCount,
        source: "on_demand",
      },
    });

    return NextResponse.json(
      {
        id: snapshot.id,
        createdAt: snapshot.createdAt.toISOString(),
        findingCount: snapshot.findingCount,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/org/intelligence/snapshots/create] Error:", error);

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

