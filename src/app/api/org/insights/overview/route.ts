import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { getOrgInsightsSnapshot } from "@/lib/org/insights";
import { logOrgApiEvent } from "@/lib/org/observability.server";
import { handleApiError } from "@/lib/api-errors"

/**
 * API route for loading Org Insights data asynchronously.
 * 
 * This endpoint:
 * - Resolves auth and org context using canonical pattern
 * - Calls the existing getOrgInsightsSnapshot loader
 * - Returns data as JSON with a clear shape
 * 
 * PERFORMANCE: The insights loader is already wrapped with TTL caching (5 min)
 * from the previous optimization step, so repeated calls within the TTL window
 * will be fast.
 */
export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const route = "/api/org/insights/overview";

  try {
    const auth = await getUnifiedAuth(request);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      logOrgApiEvent("api_unauthorized", route, null, null, Date.now() - startedAt);
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const workspaceId = auth.workspaceId;
    // getOrgInsightsSnapshot requires org:insights:view (ADMIN+); map workspace role to OrgRole
    const wsRole = auth.user.roles?.[0] ?? "VIEWER";
    const orgRole: "OWNER" | "ADMIN" | "MEMBER" =
      wsRole === "OWNER" ? "OWNER" : wsRole === "ADMIN" ? "ADMIN" : "MEMBER";
    const context = { workspaceId, userId: auth.user.userId, role: orgRole };

    // Reuse existing insights loader (already cached with TTL)
    const snapshot = await getOrgInsightsSnapshot(workspaceId, context, {
      period: "month",
      periods: 6,
    });

    const duration = Date.now() - startedAt;
    logOrgApiEvent("api_success", route, workspaceId, auth.user.userId, duration);

    return NextResponse.json({
      ok: true,
      insights: snapshot,
    });
  } catch (error: unknown) {
    return handleApiError(error, request)
  }
}

