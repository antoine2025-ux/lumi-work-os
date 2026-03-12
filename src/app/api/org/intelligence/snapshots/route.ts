/**
 * GET /api/org/intelligence/snapshots
 * List intelligence snapshots (most recent first).
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { listIntelligenceSnapshots } from "@/server/org/intelligence/snapshots";
import { handleApiError } from "@/lib/api-errors"

export async function GET(request: NextRequest) {
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

    // Step 4: List snapshots
    const snapshots = await listIntelligenceSnapshots(20);

    return NextResponse.json(
      {
        snapshots: snapshots.map((s) => ({
          id: s.id,
          createdAt: s.createdAt.toISOString(),
          source: s.source,
          findingCount: s.findingCount,
          rollups: s.rollupsJson || null,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

