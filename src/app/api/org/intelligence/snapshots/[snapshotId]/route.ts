/**
 * GET /api/org/intelligence/snapshots/[snapshotId]
 * Get a specific intelligence snapshot by ID.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getIntelligenceSnapshot } from "@/server/org/intelligence/snapshots";
import { handleApiError } from "@/lib/api-errors"

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ snapshotId: string }> }
) {
  try {
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

    // Step 4: Get snapshot
    const { snapshotId } = await ctx.params;
    const snapshot = await getIntelligenceSnapshot(snapshotId);

    if (!snapshot) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: snapshot.id,
        createdAt: snapshot.createdAt.toISOString(),
        source: snapshot.source,
        findingCount: snapshot.findingCount,
        findings: snapshot.findingsJson,
        rollups: snapshot.rollupsJson || null,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, request)
  }
}

