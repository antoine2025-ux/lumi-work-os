import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrgPermissionContext,
  assertOrgCapability,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { logOrgAudit } from "@/lib/orgAudit";

type Params = {
  params: Promise<{ memberId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const context = await getOrgPermissionContext();

    try {
      // Reuse whatever capability you use for managing member roles
      assertOrgCapability(context, "org:member:role.change");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return NextResponse.json(
        { error: "You are not allowed to change member roles." },
        { status }
      );
    }

    const { memberId } = await params;
    const body = await req.json().catch(() => ({} as any));
    const requestedCustomRoleId =
      typeof body.customRoleId === "string" && body.customRoleId.trim().length > 0
        ? body.customRoleId.trim()
        : null;

    const orgId = context!.orgId;

    // Load membership and ensure it belongs to this org
    // ADAPT: Using WorkspaceMember model (workspaceId = orgId)
    // PHASE 1: Use explicit select to exclude employmentStatus
    const membership = await (prisma as any).workspaceMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        role: true,
        joinedAt: true,
        customRoleId: true,
        customRole: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // Exclude employmentStatus - may not exist in database yet
      },
    });

    if (!membership || membership.workspaceId !== orgId) {
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

      const updated = await (prisma as any).workspaceMember.update({
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
          orgId,
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

    if (!customRole || customRole.workspaceId !== orgId) {
      return NextResponse.json(
        { error: "Custom role not found in this org." },
        { status: 400 }
      );
    }

    // If nothing changes, just return existing membership
    if (oldCustomRoleId === requestedCustomRoleId) {
      return NextResponse.json({ membership }, { status: 200 });
    }

    const updatedMembership = await (prisma as any).workspaceMember.update({
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
    const actorId = context!.userId;
    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, email: true },
    });

    await logOrgAudit(
      {
        orgId,
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
    console.error("[PATCH /api/org/members/[memberId]/custom-role] Error", error);
    return NextResponse.json(
      { error: "Something went wrong while updating the custom role." },
      { status: 500 }
    );
  }
}

