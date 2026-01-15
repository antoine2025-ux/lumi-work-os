import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";

export async function POST(req: NextRequest) {
  const routeId = "/api/org/track";

  try {
    if (isOrgCenterForceDisabled()) {
      await recordOrgApiHit(routeId, 204, null, null).catch(() => {});
      return new NextResponse(null, { status: 204 }); // No Content - optional endpoint
    }

    // Use unified auth instead of old permission context
    const auth = await getUnifiedAuth(req).catch(() => null);
    if (!auth?.workspaceId || !auth?.user?.userId) {
      await recordOrgApiHit(routeId, 204, null, null).catch(() => {});
      return new NextResponse(null, { status: 204 }); // No Content - optional endpoint
    }

    const workspaceId = auth.workspaceId;
    const userId = auth.user.userId;
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
    // Wrap in try-catch to never fail the request
    try {
      await prisma.orgAuditLog.create({
        data: {
          workspaceId: workspaceId,
          userId: userId,
          action: eventType, // e.g. "ORG_CENTER_PAGE_VIEW", "ORG_CENTER_FEEDBACK"
          entityType: payload.category,
          entityId: payload.route ?? "",
          metadata: payload,
        },
      });
      await recordOrgApiHit(routeId, 200, workspaceId, userId).catch(() => {});
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (dbError) {
      // Log but don't fail - tracking is optional
      console.error("[POST /api/org/track] Database error (non-blocking):", dbError);
      await recordOrgApiHit(routeId, 204, workspaceId, userId).catch(() => {});
      return new NextResponse(null, { status: 204 }); // No Content
    }
  } catch (error) {
    // Never return 500 - tracking is optional
    console.error("[POST /api/org/track] Error (non-blocking):", error);
    await recordOrgApiHit(routeId, 204, null, null).catch(() => {});
    return new NextResponse(null, { status: 204 }); // No Content
  }
}

