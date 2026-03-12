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
      console.error("[GET /api/org/people/structure/detail] Error getting org context:", error);
      return NextResponse.json({ ok: false, error: "Failed to get organization context" }, { status: 500 });
    }

    if (!ctx.workspaceId) {
      return NextResponse.json({ ok: false, error: "No organization membership" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const rootKey = searchParams.get("rootKey"); // e.g. "orphan:<id>" | "cycle:<id>" | "root:<id>"
    
    if (!rootKey) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "rootKey is required" } },
        { status: 400 }
      );
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

    function findRootKey(personId: string): string {
      const visited = new Set<string>();
      let cur = personId;

      while (true) {
        if (visited.has(cur)) return `cycle:${cur}`;
        visited.add(cur);

        const p = byId.get(cur);
        if (!p) return `orphan:${cur}`;

        if (!p.managerId) return `root:${cur}`;
        
        const managerId = positionIdToUserId.get(p.managerId);
        if (!managerId || !byId.has(managerId)) return `orphan:${cur}`;

        cur = managerId;
      }
    }

    const members = people.filter((p) => findRootKey(p.id) === rootKey);

    // For orphan details, include a hint of invalid manager references if any
    const invalidEdges = members
      .filter((m) => {
        if (!m.managerId) return false;
        const managerId = positionIdToUserId.get(m.managerId);
        return !managerId || !byId.has(managerId);
      })
      .map((m) => ({ id: m.id, name: m.name, managerId: m.managerId }));

    return NextResponse.json({
      ok: true,
      rootKey,
      members: members.map((m) => {
        const managerId = m.managerId ? positionIdToUserId.get(m.managerId) : null;
        return {
          id: m.id,
          name: m.name,
          teamName: m.teamName,
          roleName: m.roleName,
          managerId: managerId || null,
          managerName: managerId && byId.has(managerId) ? byId.get(managerId)!.name : null,
        };
      }),
      invalidEdges,
    });
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

