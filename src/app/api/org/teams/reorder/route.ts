import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { assertOrgCapability, mapPermissionErrorToStatus } from "@/lib/org/permissions.server";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";

export async function POST(req: NextRequest) {
  const routeId = "/api/org/teams/reorder";

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

    try {
      assertOrgCapability(context, "org:team:update");
    } catch (err) {
      const status = mapPermissionErrorToStatus(err);
      await recordOrgApiHit(routeId, status, context.orgId, context.userId);
      return NextResponse.json(
        { error: "You don't have permission to reorder teams." },
        { status }
      );
    }

    const body = await req.json();
    const updates: { id: string; position: number }[] = body.updates ?? [];

    // Update teams in a transaction
    await Promise.all(
      updates.map((u) =>
        prisma.orgTeam.update({
          where: { id: u.id, workspaceId: context.orgId },
          data: { order: u.position },
        })
      )
    );

    await recordOrgApiHit(routeId, 200, context.orgId, context.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/org/teams/reorder] Error", error);
    await recordOrgApiHit(routeId, 500, null, null);
    return NextResponse.json({ error: "Failed to reorder teams" }, { status: 500 });
  }
}

