import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrgPermissionContext,
  assertOrgCapability,
} from "@/lib/org/permissions.server";
import { OrgCustomRoleCreateSchema } from "@/lib/validations/org";
import { handleApiError } from "@/lib/api-errors";

export async function GET() {
  try {
    const context = await getOrgPermissionContext();
    assertOrgCapability(context, "org:settings:manage");

    const orgId = context!.orgId;

    // ADAPT: After running migrations, this will work
    // The model name matches your Prisma schema (OrgCustomRole → orgCustomRole)
    const roles = await prisma.orgCustomRole.findMany({
      where: { workspaceId: orgId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ roles }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getOrgPermissionContext();
    assertOrgCapability(context, "org:settings:manage");

    const { key, name, description, capabilities } = OrgCustomRoleCreateSchema.parse(
      await req.json()
    );

    const orgId = context!.orgId;

    const created = await prisma.orgCustomRole.create({
      data: {
        workspaceId: orgId,
        key,
        name,
        description: description || null,
        capabilities: capabilities ?? [],
      },
    });

    return NextResponse.json({ role: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error, req);
  }
}

