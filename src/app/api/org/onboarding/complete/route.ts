import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrgPermissionContext,
  assertOrgCapability,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";

export async function POST() {
  try {
    const context = await getOrgPermissionContext();

    try {
      assertOrgCapability(context, "org:org:update");
    } catch (err) {
      return NextResponse.json(
        { error: "Only owners or admins can complete onboarding." },
        { status: mapPermissionErrorToStatus(err) }
      );
    }

    if (!prisma) {
      return NextResponse.json(
        { error: "Database not available." },
        { status: 500 }
      );
    }

    const updated = await (prisma as any).workspace.update({
      where: { id: context!.orgId },
      data: { orgCenterOnboardingCompletedAt: new Date() },
    });

    return NextResponse.json({ ok: true, org: updated }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/org/onboarding/complete] Error:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding." },
      { status: 500 }
    );
  }
}

