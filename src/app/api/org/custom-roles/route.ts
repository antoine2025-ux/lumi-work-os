import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrgPermissionContext,
  assertOrgCapability,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import type { OrgCapability } from "@/lib/org/capabilities";

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
    if (error instanceof Error && error.message.startsWith("MISSING_CAPABILITY")) {
      const status = mapPermissionErrorToStatus(error);
      return NextResponse.json(
        { error: "You are not allowed to manage custom roles." },
        { status }
      );
    }

    console.error("[GET /api/org/custom-roles] Error", error);
    return NextResponse.json(
      { error: "Something went wrong while loading custom roles." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getOrgPermissionContext();
    assertOrgCapability(context, "org:settings:manage");

    const body = await req.json();
    const key = typeof body.key === "string" ? body.key.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const capabilities = Array.isArray(body.capabilities)
      ? body.capabilities.filter((c: unknown): c is OrgCapability => typeof c === "string")
      : [];

    if (!key || !name) {
      return NextResponse.json(
        { error: "Key and name are required." },
        { status: 400 }
      );
    }

    const orgId = context!.orgId;

    const created = await prisma.orgCustomRole.create({
      data: {
        workspaceId: orgId,
        key,
        name,
        description: description || null,
        capabilities,
      },
    });

    return NextResponse.json({ role: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MISSING_CAPABILITY")) {
      const status = mapPermissionErrorToStatus(error);
      return NextResponse.json(
        { error: "You are not allowed to create custom roles." },
        { status }
      );
    }

    console.error("[POST /api/org/custom-roles] Error", error);
    return NextResponse.json(
      { error: "Something went wrong while creating custom role." },
      { status: 500 }
    );
  }
}

