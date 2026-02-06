import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getOrgPermissionContext,
  assertOrgCapability,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";

/**
 * POST /api/org/onboarding/complete
 *
 * Sets orgCenterOnboardingCompletedAt on the workspace.
 * Idempotent: if already set, returns ok without overwriting.
 * Auth: OWNER / ADMIN only (org:settings:manage).
 */
export async function POST() {
  try {
    const context = await getOrgPermissionContext();

    try {
      assertOrgCapability(context, "org:settings:manage");
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

    // Idempotent: if already set, return ok without overwriting the timestamp
    const workspace = await prisma.workspace.findUnique({
      where: { id: context!.orgId },
      select: { orgCenterOnboardingCompletedAt: true },
    });

    if (workspace?.orgCenterOnboardingCompletedAt) {
      return NextResponse.json({ ok: true, alreadyCompleted: true }, { status: 200 });
    }

    await prisma.workspace.update({
      where: { id: context!.orgId },
      data: { orgCenterOnboardingCompletedAt: new Date() },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/org/onboarding/complete] Error:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding." },
      { status: 500 }
    );
  }
}

