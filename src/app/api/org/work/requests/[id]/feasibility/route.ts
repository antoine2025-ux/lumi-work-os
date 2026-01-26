/**
 * GET /api/org/work/requests/[id]/feasibility
 * 
 * Get staffing feasibility and candidate recommendations for a work request.
 * 
 * Returns:
 * - feasibility (canStaff, capacityGapHours, explanation)
 * - recommendation (PROCEED/REASSIGN/DELAY/REQUEST_SUPPORT)
 * - ranked candidates with capacity summaries
 * - evidence (blocking issues, counts)
 * - responseMeta (assumptions, versions)
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Resolver
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";
import { resolveWorkFeasibility } from "@/lib/org/work/resolveWorkFeasibility";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Step 4: Fetch work request
    const workRequest = await prisma.workRequest.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!workRequest) {
      return NextResponse.json({ error: "Work request not found" }, { status: 404 });
    }

    // Step 5: Resolve feasibility
    const result = await resolveWorkFeasibility(workspaceId, workRequest);

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("[GET /api/org/work/requests/[id]/feasibility] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
