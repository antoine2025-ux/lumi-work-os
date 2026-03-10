import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";
import { OrgTrackEventSchema } from '@/lib/validations/org';

export async function POST(req: NextRequest) {
  const routeId = "/api/org/track";

  try {
    if (isOrgCenterForceDisabled()) {
      await recordOrgApiHit(routeId, 204, null, null).catch(() => {});
      return new NextResponse(null, { status: 204 }); // No Content - optional endpoint
    }

    // Use unified auth — this is a soft-fail tracking endpoint; any auth failure returns 204
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      await recordOrgApiHit(routeId, 204, null, null).catch(() => {});
      return new NextResponse(null, { status: 204 }); // No Content - optional endpoint
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const userId = user.userId;
    const body = OrgTrackEventSchema.parse(await req.json().catch(() => ({})));

    const eventType = body.type || "ORG_CENTER_EVENT";

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
          metadata: payload as any,
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

