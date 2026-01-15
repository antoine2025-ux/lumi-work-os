/**
 * GET /api/org/overview
 * Get aggregated overview data for Org Overview page.
 * 
 * Provides summary counts and readiness status in a single response
 * to eliminate client-side waterfall of multiple API calls.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;

  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Step 4: Parallel, minimal selects (no deep includes)
    const [peopleCount, teamCount, deptCount, teamAssignments] = await Promise.all([
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
      // Count team owner assignments
      (prisma as any).ownerAssignment.count({
        where: { entityType: "TEAM" },
      }),
    ]);

    // Calculate unowned entities (total - assigned)
    // Note: Currently only TEAM assignments are supported (DEPARTMENT not in OwnedEntityType enum)
    const unownedTeams = Math.max(0, teamCount - teamAssignments);
    const unownedDepts = deptCount; // All departments are unowned until DEPARTMENT is supported
    const unownedEntities = unownedTeams + unownedDepts;

    // Setup readiness summary (deterministic; keep minimal)
    const readiness = {
      people_added: peopleCount > 0,
      structure_defined: teamCount + deptCount > 0,
      ownership_assigned: (teamCount + deptCount) > 0 ? unownedEntities === 0 : false,
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
  } catch (error: any) {
    console.error("[GET /api/org/overview] Error:", error);
    console.error("[GET /api/org/overview] Error stack:", error?.stack);

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

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to access this resource."
        },
        { status: 403 }
      );
    }

    // Return empty state instead of 500 for query errors
    if (error?.code?.startsWith('P') || error?.message?.includes('prisma') || error?.message?.includes('database')) {
      console.error("[GET /api/org/overview] Database error, returning empty state:", error.message);
      return NextResponse.json(
        {
          summary: {
            peopleCount: 0,
            teamCount: 0,
            deptCount: 0,
            unownedEntities: 0,
          },
          readiness: {
            people_added: false,
            structure_defined: false,
            ownership_assigned: false,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to load overview",
        hint: error?.message || "An unexpected error occurred. Please try again."
      },
      { status: 500 }
    );
  }
}

