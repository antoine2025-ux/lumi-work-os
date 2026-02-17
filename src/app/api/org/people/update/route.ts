// @ts-nocheck
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWorkspaceId } from "@/lib/current-workspace";
import { getOrgContext, requireEdit } from "@/server/rbac";
import { handleApiError } from "@/lib/api-errors";
import { OrgPersonPatchSchema } from "@/lib/validations/org";

export async function POST(req: Request) {
  try {
    const ctx = await getOrgContext(req as any);
    if (!ctx.orgId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    requireEdit(ctx.canEdit);

    const workspaceId = await getCurrentWorkspaceId(req as any);
    const body = OrgPersonPatchSchema.parse(await req.json());

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

    await prisma.auditLogEntry.create({
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
  } catch (error) {
    return handleApiError(error);
  }
}
