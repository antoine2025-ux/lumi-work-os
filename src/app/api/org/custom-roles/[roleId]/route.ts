import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import type { OrgCapability } from "@/lib/org/capabilities";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { computeChanges } from "@/lib/audit/diff";
import { UpdateCustomRoleSchema } from "@/lib/validations/org";

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
    const body = UpdateCustomRoleSchema.parse(await req.json());

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

    if (body.name !== undefined) {
      updates.name = body.name;
    }
    if (body.description !== undefined) {
      updates.description = body.description;
    }
    if (body.key !== undefined) {
      updates.key = body.key;
    }
    if (body.capabilities !== undefined) {
      updates.capabilities = body.capabilities.filter(
        (c: unknown): c is OrgCapability => typeof c === "string"
      );
    }

    const updated = await prisma.orgCustomRole.update({
      where: { id: roleId },
      data: updates,
    });

    // Log audit entry (fire-and-forget)
    const changes = computeChanges(
      existing,
      updated,
      ["name", "description", "key", "capabilities"]
    );
    if (changes) {
      logOrgAudit({
        workspaceId,
        entityType: "CUSTOM_ROLE",
        entityId: updated.id,
        entityName: updated.name,
        action: "UPDATED",
        actorId: user.userId,
        changes,
      }).catch((e) => console.error("[PATCH /api/org/custom-roles/[roleId]] Audit error:", e));
    }

    return NextResponse.json({ role: updated }, { status: 200 });
  } catch (error: unknown) {
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

    // Log audit entry (fire-and-forget)
    logOrgAudit({
      workspaceId,
      entityType: "CUSTOM_ROLE",
      entityId: roleId,
      entityName: existing.name,
      action: "DELETED",
      actorId: user.userId,
    }).catch((e) => console.error("[DELETE /api/org/custom-roles/[roleId]] Audit error:", e));

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
