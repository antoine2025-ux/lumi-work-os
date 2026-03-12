import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertWorkspaceAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getOrgContext } from "@/server/rbac";

export async function GET(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    // Assert user has workspace access (MEMBER+ can view org structure)
    await assertWorkspaceAccess(auth.user.userId, auth.workspaceId, ['MEMBER']);
    setWorkspaceContext(auth.workspaceId);

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error: unknown) {
      console.error("[GET /api/org/people/structure] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.workspaceId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }

    const workspaceId = auth.workspaceId;

    // Get all positions with users
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
            name: true,
          },
        },
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const people = positions.map((p) => ({
      id: p.user!.id,
      positionId: p.id,
      name: p.user!.name || "Unnamed",
      managerId: p.parentId,
      teamName: p.team?.name || null,
      roleName: p.title || null,
    }));

    const positionIdToUserId = new Map(positions.map((p) => [p.id, p.userId!]));
    const byId = new Map(people.map((p) => [p.id, p]));

    // Count direct reports per manager (using positionId)
    const directReportsCount = new Map<string, number>();
    for (const p of people) {
      if (!p.managerId) continue;
      const managerId = positionIdToUserId.get(p.managerId);
      if (managerId) {
        directReportsCount.set(managerId, (directReportsCount.get(managerId) || 0) + 1);
      }
    }

    const managers = people
      .filter((p) => (directReportsCount.get(p.id) || 0) > 0)
      .map((p) => ({ id: p.id, name: p.name, reports: directReportsCount.get(p.id) || 0 }))
      .sort((a, b) => b.reports - a.reports);

    // Top-level: no manager or manager doesn't exist
    const topLevel = people
      .filter((p) => {
        if (!p.managerId) return true;
        const managerId = positionIdToUserId.get(p.managerId);
        return !managerId || !byId.has(managerId);
      })
      .map((p) => ({ id: p.id, name: p.name, teamName: p.teamName, roleName: p.roleName }))
      .slice(0, 20);

    // Orphan detection: people whose managerId points to invalid position
    const invalidManagerRoots = people
      .filter((p) => {
        if (!p.managerId) return false;
        const managerId = positionIdToUserId.get(p.managerId);
        return !managerId || !byId.has(managerId);
      })
      .map((p) => ({ id: p.id, name: p.name, managerId: p.managerId }));

    // Cluster analysis
    const rootKey = (id: string) => `root:${id}`;
    const cycleKey = (id: string) => `cycle:${id}`;
    const orphanKey = (id: string) => `orphan:${id}`;

    const seenRoot = new Map<string, string>();

    function findRoot(personId: string): string {
      if (seenRoot.has(personId)) return seenRoot.get(personId)!;

      const visited = new Set<string>();
      let cur = personId;

      while (true) {
        if (visited.has(cur)) {
          // cycle detected
          const k = cycleKey(cur);
          seenRoot.set(personId, k);
          return k;
        }
        visited.add(cur);

        const p = byId.get(cur);
        if (!p) {
          const k = orphanKey(cur);
          seenRoot.set(personId, k);
          return k;
        }

        if (!p.managerId) {
          const k = rootKey(cur);
          seenRoot.set(personId, k);
          return k;
        }

        const managerId = positionIdToUserId.get(p.managerId);
        if (!managerId || !byId.has(managerId)) {
          const k = orphanKey(cur);
          seenRoot.set(personId, k);
          return k;
        }

        cur = managerId;
      }
    }

    const clusterCounts = new Map<string, number>();
    for (const p of people) {
      const r = findRoot(p.id);
      clusterCounts.set(r, (clusterCounts.get(r) || 0) + 1);
    }

    const clusters = Array.from(clusterCounts.entries())
      .map(([key, size]) => ({ key, size }))
      .sort((a, b) => b.size - a.size);

    const orphanClusters = clusters.filter((c) => c.key.startsWith("orphan:"));
    const cycleClusters = clusters.filter((c) => c.key.startsWith("cycle:"));

    return NextResponse.json({
      ok: true,
      totals: {
        people: people.length,
        managers: managers.length,
        topLevel: topLevel.length,
        orphanRoots: invalidManagerRoots.length,
        orphanClusters: orphanClusters.length,
        cycleClusters: cycleClusters.length,
      },
      managers: managers.slice(0, 12),
      topLevel,
      orphans: invalidManagerRoots.slice(0, 20),
      clusters: clusters.slice(0, 12),
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

