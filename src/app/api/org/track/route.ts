import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";

export async function POST(req: NextRequest) {
  const routeId = "/api/org/track";

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
      return NextResponse.json(
        { error: "Not authenticated for Org Center." },
        { status: 401 }
      );
    }

    const { orgId, userId } = context;
    const body = await req.json().catch(() => ({} as any));

    const eventType =
      typeof body.type === "string" && body.type.trim().length > 0
        ? body.type.trim()
        : "ORG_CENTER_EVENT";

    const payload = {
      category: body.category ?? "org_center",
      name: body.name ?? null,
      route: body.route ?? null,
      meta: body.meta ?? null,
    };

    // Use OrgAuditLog for tracking (reusing existing audit infrastructure)
    await prisma.orgAuditLog.create({
      data: {
        workspaceId: orgId,
        userId: userId,
        action: eventType, // e.g. "ORG_CENTER_PAGE_VIEW", "ORG_CENTER_FEEDBACK"
        entityType: payload.category,
        entityId: payload.route ?? "",
        metadata: payload,
      },
    });

    await recordOrgApiHit(routeId, 200, orgId, userId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/org/track] Error", error);
    await recordOrgApiHit(routeId, 500, null, null);
    return NextResponse.json(
      { error: "Failed to track Org Center event." },
      { status: 500 }
    );
  }
}

