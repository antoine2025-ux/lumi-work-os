import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";

export async function POST(req: NextRequest) {
  const routeId = "/api/org/preferences/update";

  try {
    if (isOrgCenterForceDisabled()) {
      await recordOrgApiHit(routeId, 503, null, null);
      return NextResponse.json(
        { error: "Org Center is temporarily unavailable." },
        { status: 503 }
      );
    }

    const context = await getOrgPermissionContext();
    if (!context) {
      await recordOrgApiHit(routeId, 401, null, null);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const preferences = body.preferences ?? {};

    await prisma.workspaceMember.updateMany({
      where: { workspaceId: context.orgId, userId: context.userId },
      data: { preferences },
    });

    await recordOrgApiHit(routeId, 200, context.orgId, context.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/org/preferences/update] Error", error);
    await recordOrgApiHit(routeId, 500, null, null);
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

