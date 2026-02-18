import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const { searchParams } = new URL(req.url);
    const minConf = Number(searchParams.get("minConf") || "0.8");

    const rows = await prisma.orgDuplicateCandidate.findMany({
      where: { orgId: workspaceId, status: "OPEN", confidence: { gte: minConf } },
      orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
      take: 200,
    });

    // Pull minimal person info via OrgPosition
    const ids = Array.from(new Set(rows.flatMap((r) => [r.personAId, r.personBId])));
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        id: { in: ids },
        isActive: true,
        archivedAt: null, // Exclude archived people
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const byId = new Map<string, any>();
    for (const pos of positions) {
      const posUser = pos.user;
      const team = pos.team;
      const manager = pos.parent?.user;
      byId.set(pos.id, {
        id: pos.id,
        name: posUser?.name || "Unnamed",
        email: posUser?.email || null,
        title: pos.title,
        role: pos.title,
        teamName: team?.name || null,
        team: team?.name || null,
        managerId: manager?.id || null,
        managerName: manager?.name || null,
      });
    }

    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({
        candidate: r,
        a: byId.get(r.personAId) || { id: r.personAId, name: "Unknown" },
        b: byId.get(r.personBId) || { id: r.personBId, name: "Unknown" },
      })),
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
