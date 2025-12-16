import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getOrgContext, requireEdit } from "@/server/rbac";

type Body = {
  ids: string[]; // user IDs
  patch: {
    managerId?: string | null;
    managerName?: string | null; // optional convenience for client display
    teamName?: string | null;
  };
};

export async function POST(req: Request) {
  try {
    const ctx = await getOrgContext(req as any);
    if (!ctx.orgId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    requireEdit(ctx.canEdit);

    const workspaceId = await getCurrentWorkspaceId(req as any);
    const body = (await req.json()) as Body;

    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }
    if (!body.patch || typeof body.patch !== "object") {
      return NextResponse.json({ error: "patch is required" }, { status: 400 });
    }

    const userIds = body.ids.filter(Boolean);
    const patch = body.patch;

    // Find positions for these users in this workspace
    const positions = await prisma.orgPosition.findMany({
      where: {
        workspaceId,
        userId: { in: userIds },
        isActive: true,
      },
    });

    if (positions.length === 0) {
      return NextResponse.json({ error: "No positions found for these users" }, { status: 404 });
    }

    const positionIds = positions.map((p) => p.id);
    let updatedCount = 0;

    // Update manager (via parentId)
    if ("managerId" in patch && patch.managerId !== undefined) {
      let parentPositionId: string | null = null;

      if (patch.managerId) {
        // Find the manager's position
        const managerPosition = await prisma.orgPosition.findFirst({
          where: {
            workspaceId,
            userId: patch.managerId,
            isActive: true,
          },
        });
        if (managerPosition) {
          parentPositionId = managerPosition.id;
        }
      }

      const result = await prisma.orgPosition.updateMany({
        where: { id: { in: positionIds } },
        data: { parentId: parentPositionId },
      });
      updatedCount = result.count;
    }

    // Update team (via teamId)
    if ("teamName" in patch && patch.teamName !== undefined) {
      let teamId: string | null = null;

      if (patch.teamName) {
        // Find the team
        const team = await prisma.orgTeam.findFirst({
          where: {
            workspaceId,
            name: patch.teamName,
            isActive: true,
          },
        });
        if (team) {
          teamId = team.id;
        }
      }

      const result = await prisma.orgPosition.updateMany({
        where: { id: { in: positionIds } },
        data: { teamId },
      });
      updatedCount = result.count;
    }

    await prisma.auditLogEntry.create({
      data: {
        orgId: ctx.orgId,
        actorUserId: ctx.user?.id ?? null,
        actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
        action: "bulk_update_people",
        targetCount: updatedCount,
        summary: `Bulk updated ${updatedCount} people`,
      },
    });

    revalidateTag(`org:${ctx.orgId}:people`);
    revalidateTag(`org:${ctx.orgId}:audit`);

    return NextResponse.json({
      ok: true,
      updatedCount,
    });
  } catch (e: any) {
    const status = e?.status === 403 ? 403 : 500;
    const msg = e?.message === "FORBIDDEN" ? "Forbidden" : e?.message === "Unauthenticated" ? "Unauthenticated" : "Bulk update failed";
    return NextResponse.json({ error: msg, details: e?.message ?? String(e) }, { status });
  }
}
