import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { logOrgAudit } from "@/lib/orgAudit";
import { handleApiError } from "@/lib/api-errors";

type Params = {
  params: Promise<{ memberId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
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

    const { memberId } = await params;
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const requestedCustomRoleId =
      typeof body.customRoleId === "string" && body.customRoleId.trim().length > 0
        ? body.customRoleId.trim()
        : null;

    const workspaceId = auth.workspaceId;

    // Load membership and ensure it belongs to this org
    // ADAPT: Using WorkspaceMember model (workspaceId = orgId)
    const membership = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        customRole: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Member not found in this org." },
        { status: 404 }
      );
    }

    const oldCustomRoleId = membership.customRoleId;

    // If the request is to remove the custom role
    if (!requestedCustomRoleId) {
      if (!oldCustomRoleId) {
        // No-op
        return NextResponse.json({ membership }, { status: 200 });
      }

      const updated = await prisma.workspaceMember.update({
        where: { id: memberId },
        data: { customRoleId: null },
        include: {
          customRole: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log the change with enriched payload
      const oldRole = oldCustomRoleId
        ? await (prisma as any).orgCustomRole.findUnique({ where: { id: oldCustomRoleId } })
        : null;

      await logOrgAudit(
        {
          workspaceId,
          action: "MEMBER_CUSTOM_ROLE_UPDATED",
          targetType: "MEMBER",
          targetId: memberId,
          meta: {
            memberId,
            memberName: membership.user?.name || null,
            memberEmail: membership.user?.email || null,
            oldCustomRoleId,
            oldCustomRoleName: oldRole?.name || null,
            newCustomRoleId: null,
            newCustomRoleName: null,
          },
        },
        req
      );

      return NextResponse.json({ membership: updated }, { status: 200 });
    }

    // Validate new custom role belongs to same org
    // ADAPT: Using OrgCustomRole model
    const customRole = await (prisma as any).orgCustomRole.findUnique({
      where: { id: requestedCustomRoleId },
    });

    if (!customRole || customRole.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Custom role not found in this org." },
        { status: 400 }
      );
    }

    // If nothing changes, just return existing membership
    if (oldCustomRoleId === requestedCustomRoleId) {
      return NextResponse.json({ membership }, { status: 200 });
    }

    const updatedMembership = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { customRoleId: requestedCustomRoleId },
      include: {
        customRole: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the change with enriched payload
    const oldRole = oldCustomRoleId
      ? await (prisma as any).orgCustomRole.findUnique({ where: { id: oldCustomRoleId } })
      : null;

    // Get actor info for enriched payload
    const actorId = auth.user.userId;
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, email: true },
    });

    await logOrgAudit(
      {
        workspaceId,
        action: "MEMBER_CUSTOM_ROLE_UPDATED",
        targetType: "MEMBER",
        targetId: memberId,
        meta: {
          memberId,
          memberName: membership.user?.name || null,
          memberEmail: membership.user?.email || null,
          oldCustomRoleId,
          oldCustomRoleName: oldRole?.name || null,
          newCustomRoleId: requestedCustomRoleId,
          newCustomRoleName: customRole.name || null,
          actorName: actor?.name || null,
          actorEmail: actor?.email || null,
        },
      },
      req
    );

    return NextResponse.json({ membership: updatedMembership }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

