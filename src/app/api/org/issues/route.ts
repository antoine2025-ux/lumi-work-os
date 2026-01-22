import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgContext } from "@/server/rbac";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";

export async function GET(req: NextRequest) {
  const ctx = await getOrgContext(req);
  if (!ctx.orgId) return NextResponse.json({ ok: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const types = searchParams.getAll("type");
  const minDays = Number(searchParams.get("minDays") || "0");

  const now = Date.now();
  const minMs = minDays > 0 ? minDays * 24 * 60 * 60 * 1000 : 0;

  const workspaceId = await getCurrentWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ ok: false, error: "Workspace required" }, { status: 400 });

  // Support multiple types or default to all if none specified
  const whereTypes = types.length > 0 ? { in: types } : undefined;

  const issues = await prisma.orgPersonIssue.findMany({
    where: {
      orgId: ctx.orgId,
      ...(whereTypes ? { type: whereTypes } : {}),
      resolvedAt: null,
      ...(minMs
        ? {
            firstSeenAt: { lte: new Date(now - minMs) },
          }
        : {}),
    },
    orderBy: { firstSeenAt: "asc" },
    take: 500,
  });

  // Fetch positions (people) for those issues
  // personId in OrgPersonIssue refers to OrgPosition.id
  const positionIds = issues.map((i) => i.personId);
  const positions = await prisma.orgPosition.findMany({
    where: {
      workspaceId,
      id: { in: positionIds },
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
      _count: {
        select: {
          children: true,
        },
      },
    },
  });

  const positionsById = new Map(positions.map((p) => [p.id, p]));
  const rows = issues.map((i) => {
    const pos = positionsById.get(i.personId);
    if (!pos) {
      return {
        issue: i,
        person: { id: i.personId, name: "Unknown person", title: null, role: null, teamName: null, team: null, managerId: null, managerName: null, directReportCount: 0 },
      };
    }

    const user = pos.user;
    const team = pos.team;
    const manager = pos.parent?.user;

    return {
      issue: i,
      person: {
        id: pos.id, // Use position ID for consistency with People page
        name: user?.name || "Unnamed",
        email: user?.email || null,
        title: pos.title,
        role: pos.title,
        teamName: team?.name || null,
        team: team?.name || null,
        managerId: manager?.id || null,
        managerName: manager?.name || null,
        directReportCount: pos._count.children,
      },
    };
  });

  return NextResponse.json({ ok: true, rows });
}

