/**
 * GET /api/org/overview
 * Get aggregated overview data for Org Overview page.
 *
 * Provides summary counts and readiness status in a single response
 * to eliminate client-side waterfall of multiple API calls.
 *
 * Phase S: Ownership signals now sourced from canonical resolver.
 * SECURITY: workspaceId from auth only, never from query params.
 * See docs/org/intelligence-rules.md for canonical rules.
 *
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { prisma } from "@/lib/db";
import { getOrgIntelligenceSnapshot } from "@/lib/org/intelligence";

export async function GET(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;

  try {
    // Step 1: Get unified auth (includes workspaceId)
    // SECURITY: workspaceId from auth only
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[GET /api/org/overview] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        {
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
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

    // Step 4: Get snapshot and counts in parallel
    const [snapshot, peopleCount, teamCount, deptCount] = await Promise.all([
      // Phase S: Canonical ownership and structure from resolver
      getOrgIntelligenceSnapshot(workspaceId, {
        include: { ownership: true, structure: true },
      }),
      prisma.orgPosition.count({
        where: {
          userId: { not: null },
          isActive: true,
        },
      }),
      prisma.orgTeam.count({
        where: { isActive: true },
      }),
      prisma.orgDepartment.count({
        where: { isActive: true },
      }),
    ]);

    // Phase S: All ownership data from canonical snapshot (no duplicated logic)
    const unownedEntities = snapshot.ownership?.unownedEntities.length ?? 0;
    const ownershipPercent = snapshot.ownership?.coverage.overallPercent ?? 0;

    // Setup readiness summary (deterministic; derived from snapshot)
    const readiness = {
      people_added: peopleCount > 0,
      structure_defined: teamCount + deptCount > 0,
      ownership_assigned: ownershipPercent === 100,
    };

    return NextResponse.json(
      {
        summary: {
          peopleCount,
          teamCount,
          deptCount,
          unownedEntities: Math.max(0, unownedEntities), // Ensure non-negative
        },
        readiness,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

