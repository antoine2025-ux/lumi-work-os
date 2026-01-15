import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getOrgContext, requireEdit } from "@/server/rbac";

type Body = {
  id: string; // user ID
  patch: {
    managerId?: string | null;
    managerName?: string | null;
    teamName?: string | null;
  };
};

export async function POST(req: Request) {
  try {
    const ctx = await getOrgContext(req as any);
    if (!ctx.orgId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    requireEdit(ctx.canEdit);

    const workspaceId = await getCurrentWorkspaceId(req as any);
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 401 });
    }
    const body = (await req.json()) as Body;

    if (!body?.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    if (!body.patch || typeof body.patch !== "object") {
      return NextResponse.json({ error: "patch is required" }, { status: 400 });
    }

    const patch = body.patch;

    // Find the user's position in this workspace
    const position = await prisma.orgPosition.findFirst({
      where: {
        workspaceId,
        userId: body.id,
        isActive: true,
      },
    });

    if (!position) {
      return NextResponse.json({ error: "Position not found for this user" }, { status: 404 });
    }

    const updateData: { parentId?: string | null; teamId?: string | null } = {};

    // Update manager (via parentId)
    if ("managerId" in patch && patch.managerId !== undefined) {
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
          updateData.parentId = managerPosition.id;
        } else {
          return NextResponse.json({ error: "Manager position not found" }, { status: 404 });
        }
      } else {
        updateData.parentId = null;
      }
    }

    // Update team (via teamId)
    if ("teamName" in patch && patch.teamName !== undefined) {
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
          updateData.teamId = team.id;
        } else {
          return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }
      } else {
        updateData.teamId = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No supported fields in patch" }, { status: 400 });
    }

    const updated = await prisma.orgPosition.update({
      where: { id: position.id },
      data: updateData,
    });

    await (prisma as any).auditLogEntry.create({
      data: {
        orgId: ctx.orgId,
        actorUserId: ctx.user?.id ?? null,
        actorLabel: ctx.user?.name || ctx.user?.email || "Unknown user",
        action: "update_person",
        targetCount: 1,
        summary: `Updated person (${body.id})`,
      },
    });

    revalidateTag(`org:${ctx.orgId}:people`);
    revalidateTag(`org:${ctx.orgId}:audit`);

    return NextResponse.json({ ok: true, position: updated });
  } catch (e: any) {
    const status = e?.status === 403 ? 403 : 500;
    const msg = e?.message === "FORBIDDEN" ? "Forbidden" : e?.message === "Unauthenticated" ? "Unauthenticated" : "Update failed";
    return NextResponse.json({ error: msg, details: e?.message ?? String(e) }, { status });
  }
}
