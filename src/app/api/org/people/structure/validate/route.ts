import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { getOrgContext } from "@/server/rbac";

export async function GET(req: Request) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
    }

    let ctx;
    try {
      ctx = await getOrgContext(req);
    } catch (error) {
      console.error("[GET /api/org/people/structure/validate] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.orgId) {
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
        parentId: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const people = positions.map((p) => ({
      id: p.user!.id,
      positionId: p.id,
      name: p.user!.name || "Unnamed",
      managerId: p.parentId,
    }));

    const positionIdToUserId = new Map(positions.map((p) => [p.id, p.userId!]));
    const byId = new Map(people.map((p) => [p.id, p]));

    // Invalid manager edges: people whose manager doesn't exist
    const invalidManagerEdges = people.filter((p) => {
      if (!p.managerId) return false;
      const managerId = positionIdToUserId.get(p.managerId);
      return !managerId || !byId.has(managerId);
    });

    // Cycle detection: find any node that is part of a cycle by walking upwards with visited set
    const cycleMembers = new Set<string>();

    for (const p of people) {
      const visited = new Set<string>();
      let cur = p.id;

      while (true) {
        if (visited.has(cur)) {
          // cur is in a cycle; mark all visited as potential cycle members
          for (const v of visited) cycleMembers.add(v);
          break;
        }
        visited.add(cur);

        const node = byId.get(cur);
        if (!node) break;
        if (!node.managerId) break;
        
        const managerId = positionIdToUserId.get(node.managerId);
        if (!managerId || !byId.has(managerId)) break;

        cur = managerId;
      }
    }

    // Top-level leaders (no manager or invalid manager)
    const topLevel = people.filter((p) => {
      if (!p.managerId) return true;
      const managerId = positionIdToUserId.get(p.managerId);
      return !managerId || !byId.has(managerId);
    });

    return NextResponse.json({
      ok: true,
      totals: {
        people: people.length,
        invalidManagerEdges: invalidManagerEdges.length,
        cycleMembers: cycleMembers.size,
        topLevel: topLevel.length,
      },
      invalidManagerEdges: invalidManagerEdges.slice(0, 25).map((p) => ({ id: p.id, name: p.name, managerId: p.managerId })),
      cycleMembers: Array.from(cycleMembers)
        .slice(0, 50)
        .map((id) => ({ id, name: byId.get(id)?.name || "Unknown" })),
      topLevel: topLevel.slice(0, 25).map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (error: any) {
    console.error("Error validating structure:", error);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message: error.message || "Failed to validate" } },
      { status: 500 }
    );
  }
}

