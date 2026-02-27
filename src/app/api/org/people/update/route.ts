import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { OrgPersonPatchSchema } from "@/lib/validations/org";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;
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
        orgId: auth.workspaceId,
        actorUserId: auth.user.userId,
        actorLabel: auth.user.name || auth.user.email || "Unknown user",
        action: "update_person",
        targetCount: 1,
        summary: `Updated person (${body.id})`,
      },
    });

    revalidateTag(`org:${auth.workspaceId}:people`);
    revalidateTag(`org:${auth.workspaceId}:audit`);

    return NextResponse.json({ ok: true, position: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
