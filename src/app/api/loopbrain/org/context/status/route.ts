// src/app/api/loopbrain/org/context/status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { assertAccess } from "@/lib/auth/assertAccess";
import { handleApiError } from "@/lib/api-errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/loopbrain/org/context/status
 *
 * Diagnostic endpoint to check org context sync status.
 * Returns:
 * - Count of org data in Prisma (OrgPosition, OrgTeam, OrgDepartment)
 * - Count of ContextItems by type
 * - Whether sync is required
 *
 * Auth: getUnifiedAuth → assertAccess (workspace MEMBER).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.workspaceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No workspace found",
          detail: "User must have an active workspace",
        },
        { status: 400 }
      );
    }
    setWorkspaceContext(auth.workspaceId);
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["MEMBER"],
    });

    const workspaceId = auth.workspaceId;

    // Count org data in Prisma
    const [orgPositionCount, orgTeamCount, orgDepartmentCount] = await Promise.all([
      prisma.orgPosition.count({
        where: { workspaceId, isActive: true },
      }),
      prisma.orgTeam.count({
        where: { workspaceId, isActive: true },
      }),
      prisma.orgDepartment.count({
        where: { workspaceId, isActive: true },
      }),
    ]);

    // Count ContextItems by type
    const contextItemCounts = await prisma.contextItem.groupBy({
      by: ["type"],
      where: {
        workspaceId,
        type: { in: ["org", "person", "team", "department", "role"] },
      },
      _count: { _all: true },
    });

    const contextItemsByType: Record<string, number> = {};
    contextItemCounts.forEach((item) => {
      contextItemsByType[item.type] = item._count._all;
    });

    const totalPrismaRecords = orgPositionCount + orgTeamCount + orgDepartmentCount;
    const totalContextItems = contextItemCounts.reduce(
      (sum, item) => sum + item._count._all,
      0
    );

    // Sync is required if:
    // 1. We have Prisma org data but no ContextItems, OR
    // 2. We have fewer ContextItems than expected (rough heuristic)
    const syncRequired =
      (totalPrismaRecords > 0 && totalContextItems === 0) ||
      (totalPrismaRecords > 0 &&
        totalContextItems < orgPositionCount + orgTeamCount + orgDepartmentCount);

    // Get most recent sync timestamp
    const mostRecentContextItem = await prisma.contextItem.findFirst({
      where: {
        workspaceId,
        type: { in: ["org", "person", "team", "department", "role"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    return NextResponse.json(
      {
        ok: true,
        workspaceId,
        prismaData: {
          positions: orgPositionCount,
          teams: orgTeamCount,
          departments: orgDepartmentCount,
          total: totalPrismaRecords,
        },
        contextItems: {
          byType: contextItemsByType,
          total: totalContextItems,
        },
        syncRequired,
        lastSyncAt: mostRecentContextItem?.updatedAt?.toISOString() ?? null,
        syncEndpoint: "/api/loopbrain/org/context/sync",
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, req)
  }
}
