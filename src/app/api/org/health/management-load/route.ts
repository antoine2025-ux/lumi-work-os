import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { isOrgManagementLoadEnabled } from "@/lib/org/feature-flags";

/**
 * Management Load Health
 * Returns span-of-control metrics, overloaded managers, and orphaned people.
 * 
 * Assumptions:
 * - Reporting line: OrgPosition.parentId (manager relationship)
 * - People are represented as active OrgPosition rows with userId set
 */

type ManagementLoadResponse = {
  totals: {
    managers: number;
    totalReports: number;
    avgSpan: number;
    maxSpan: number;
    unassignedReports: number;
  };
  threshold: { overloadedSpan: number };
  topManagers: Array<{
    id: string;
    name: string;
    title?: string | null;
    departmentName?: string | null;
    directReports: number;
    isOverloaded: boolean;
  }>;
  orphans: Array<{ id: string; name: string; title?: string | null }>;
};

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    // Check if management load feature is enabled
    const managementLoadEnabled = await isOrgManagementLoadEnabled(workspaceId);
    if (!managementLoadEnabled) {
      return NextResponse.json(
        { error: "Management load features are not enabled for this workspace." },
        { status: 403 }
      );
    }
    const overloadedSpan = 8;

    // Fetch all active positions with users (these are our "people")
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        isActive: true,
        userId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        title: true,
        parentId: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        team: {
          select: {
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Count direct reports per manager (by parentId)
    const reportsCount = new Map<string, number>();
    const orphans: Array<{ id: string; name: string; title?: string | null }> = [];

    for (const pos of positions) {
      const managerId = pos.parentId;
      if (!managerId) {
        // Person has no manager - count as orphan
        orphans.push({
          id: pos.user!.id,
          name: pos.user!.name || "Unnamed",
          title: pos.title ?? null,
        });
      } else {
        // Count this person as a direct report of their manager
        reportsCount.set(managerId, (reportsCount.get(managerId) ?? 0) + 1);
      }
    }

    // Build manager list with their direct report counts
    const managers = Array.from(reportsCount.entries()).map(([managerPositionId, directReports]) => {
      // Find the manager's position to get their user info
      const managerPos = positions.find((p) => p.id === managerPositionId);
      const managerUser = managerPos?.user;

      return {
        id: managerUser?.id || managerPositionId,
        name: managerUser?.name || "Unknown",
        title: managerPos?.title ?? null,
        departmentName: managerPos?.team?.department?.name ?? null,
        directReports,
        isOverloaded: directReports >= overloadedSpan,
      };
    });

    // Sort by direct reports (descending)
    managers.sort((a, b) => b.directReports - a.directReports);

    const totalReports = managers.reduce((s, m) => s + m.directReports, 0);
    const managersCount = managers.length;
    const avgSpan = managersCount > 0 ? Number((totalReports / managersCount).toFixed(2)) : 0;
    const maxSpan = managersCount > 0 ? Math.max(...managers.map((m) => m.directReports)) : 0;

    const payload: ManagementLoadResponse = {
      totals: {
        managers: managersCount,
        totalReports,
        avgSpan,
        maxSpan,
        unassignedReports: orphans.length,
      },
      threshold: { overloadedSpan },
      topManagers: managers.slice(0, 10),
      orphans: orphans.slice(0, 10),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return handleApiError(error, req);
  }
}
