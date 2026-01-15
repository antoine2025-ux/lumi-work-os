import { NextRequest, NextResponse } from "next/server";
import {
  getOrgPermissionContext,
  assertOrgCapability,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { getOrgInsightsSnapshot } from "@/lib/org/insights";

export async function GET(req: NextRequest) {
  try {
    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:insights:view");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
            message: "You are not allowed to view Org Insights for this org.",
          },
        },
        { status }
      );
    }

    const orgId = context!.orgId;

    const snapshot = await getOrgInsightsSnapshot(orgId, context, {
      period: "month",
      periods: 6,
    });

    return NextResponse.json({ ok: true, snapshot }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/org/insights] Error:", error);
    
    // If it's a permission error, return appropriate status
    const status = mapPermissionErrorToStatus(error);
    if (status !== 500) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
            message: "You are not allowed to view Org Insights for this org.",
          },
        },
        { status }
      );
    }

    // Otherwise, it's a server error
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Something went wrong while loading Org Insights.",
        },
      },
      { status: 500 }
    );
  }
}

