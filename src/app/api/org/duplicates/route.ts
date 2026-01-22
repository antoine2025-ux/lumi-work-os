import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const minConf = Number(searchParams.get("minConf") || "0.8");

  const workspaceId = await getCurrentWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });

  const rows = await prisma.orgDuplicateCandidate.findMany({
    where: { orgId: ctx.orgId, status: "OPEN", confidence: { gte: minConf } },
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
    const user = pos.user;
    const team = pos.team;
    const manager = pos.parent?.user;
    byId.set(pos.id, {
      id: pos.id,
      name: user?.name || "Unnamed",
      email: user?.email || null,
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
}

