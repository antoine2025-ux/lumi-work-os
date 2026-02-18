import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import type { OrgCapability } from "@/lib/org/capabilities";

type Params = {
  params: Promise<{ roleId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const { roleId } = await params;
    const body = await req.json();

    const existing = await prisma.orgCustomRole.findUnique({
      where: { id: roleId },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Custom role not found in this org." },
        { status: 404 }
      );
    }

    const updates: any = {};

    if (typeof body.name === "string") {
      updates.name = body.name.trim();
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim() || null;
    }
    if (typeof body.key === "string") {
      updates.key = body.key.trim();
    }
    if (Array.isArray(body.capabilities)) {
      updates.capabilities = body.capabilities.filter(
        (c: unknown): c is OrgCapability => typeof c === "string"
      );
    }

    const updated = await prisma.orgCustomRole.update({
      where: { id: roleId },
      data: updates,
    });

    return NextResponse.json({ role: updated }, { status: 200 });
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const { roleId } = await params;

    const existing = await prisma.orgCustomRole.findUnique({
      where: { id: roleId },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Custom role not found in this org." },
        { status: 404 }
      );
    }

    // Optional: prevent deleting roles that are currently assigned
    const memberCount = await prisma.workspaceMember.count({
      where: { workspaceId, customRoleId: roleId },
    });

    if (memberCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this custom role because it is currently assigned to members.",
        },
        { status: 400 }
      );
    }

    await prisma.orgCustomRole.delete({
      where: { id: roleId },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return handleApiError(error, req);
  }
}
