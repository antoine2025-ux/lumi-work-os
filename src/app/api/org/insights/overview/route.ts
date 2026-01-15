import { NextRequest, NextResponse } from "next/server";
import { getOrgPermissionContext } from "@/lib/org/permissions.server";
import { getOrgInsightsSnapshot } from "@/lib/org/insights";
import { hasOrgCapability } from "@/lib/org/capabilities";
import { logOrgApiEvent } from "@/lib/org/observability.server";

/**
 * API route for loading Org Insights data asynchronously.
 * 
 * This endpoint:
 * - Resolves auth and org context using the same mechanisms as other Org API routes
 * - Calls the existing getOrgInsightsSnapshot loader
 * - Returns data as JSON with a clear shape
 * - Handles "no org" and "no permissions" cleanly
 * 
 * PERFORMANCE: The insights loader is already wrapped with TTL caching (5 min)
 * from the previous optimization step, so repeated calls within the TTL window
 * will be fast.
 */
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const route = "/api/org/insights/overview";

  try {
    const context = await getOrgPermissionContext(request);

    if (!context) {
      logOrgApiEvent("api_unauthorized", route, null, null, Date.now() - startedAt);
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { orgId, userId, role } = context;

    if (!orgId) {
      logOrgApiEvent("api_error", route, null, userId, Date.now() - startedAt, {
        message: "No org selected",
      });
      return NextResponse.json(
        { ok: false, error: "No org selected" },
        { status: 400 }
      );
    }

    // Check permissions
    const canView = hasOrgCapability(role, "org:insights:view");
    if (!canView) {
      logOrgApiEvent("api_unauthorized", route, orgId, userId, Date.now() - startedAt, {
        reason: "Insufficient permissions",
      });
      return NextResponse.json(
        { ok: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Reuse existing insights loader (already cached with TTL)
    const snapshot = await getOrgInsightsSnapshot(orgId, context, {
      period: "month",
      periods: 6,
    });

    const duration = Date.now() - startedAt;
    logOrgApiEvent("api_success", route, orgId, userId, duration);

    return NextResponse.json({
      ok: true,
      insights: snapshot,
    });
  } catch (error: any) {
    const duration = Date.now() - startedAt;
    
    // Handle permission errors gracefully
    if (error instanceof Error && error.message.includes("insights:view")) {
      logOrgApiEvent("api_unauthorized", route, null, null, duration, {
        message: error.message,
      });
      return NextResponse.json(
        { ok: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    logOrgApiEvent("api_error", route, null, null, duration, {
      message: error?.message ?? "Unknown error",
    });

    return NextResponse.json(
      { ok: false, error: "Failed to load insights" },
      { status: 500 }
    );
  }
}

