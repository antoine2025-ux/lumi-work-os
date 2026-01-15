import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrgPermissionContext,
  assertOrgCapability,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import type { OrgCapability } from "@/lib/org/capabilities";

type Params = {
  params: Promise<{ roleId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const context = await getOrgPermissionContext();
    assertOrgCapability(context, "org:settings:manage");

    const { roleId } = await params;
    const body = await req.json();

    const orgId = context!.orgId;

    const existing = await prisma.orgCustomRole.findUnique({
      where: { id: roleId },
    });

    if (!existing || existing.workspaceId !== orgId) {
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
    if (error instanceof Error && error.message.startsWith("MISSING_CAPABILITY")) {
      const status = mapPermissionErrorToStatus(error);
      return NextResponse.json(
        { error: "You are not allowed to update custom roles." },
        { status }
      );
    }

    console.error("[PATCH /api/org/custom-roles/[roleId]] Error", error);
    return NextResponse.json(
      { error: "Something went wrong while updating custom role." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const context = await getOrgPermissionContext();
    assertOrgCapability(context, "org:settings:manage");

    const { roleId } = await params;
    const orgId = context!.orgId;

    const existing = await prisma.orgCustomRole.findUnique({
      where: { id: roleId },
    });

    if (!existing || existing.workspaceId !== orgId) {
      return NextResponse.json(
        { error: "Custom role not found in this org." },
        { status: 404 }
      );
    }

    // Optional: prevent deleting roles that are currently assigned
    const memberCount = await prisma.workspaceMember.count({
      where: { workspaceId: orgId, customRoleId: roleId },
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
    if (error instanceof Error && error.message.startsWith("MISSING_CAPABILITY")) {
      const status = mapPermissionErrorToStatus(error);
      return NextResponse.json(
        { error: "You are not allowed to delete custom roles." },
        { status }
      );
    }

    console.error("[DELETE /api/org/custom-roles/[roleId]] Error", error);
    return NextResponse.json(
      { error: "Something went wrong while deleting custom role." },
      { status: 500 }
    );
  }
}

