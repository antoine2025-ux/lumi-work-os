import { NextRequest } from "next/server";
import {
  getOrgActivityForWorkspace,
  OrgActivityEventFilter,
  OrgActivityTimeframeFilter,
} from "@/server/data/orgActivity";
import { createErrorResponse, createSuccessResponse } from "@/server/api/responses";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";
import { logOrgApiEvent } from "@/lib/org/observability.server";

export async function GET(req: NextRequest) {
  const startedAt = Date.now();
  const route = "/api/org/activity";

  try {
    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:activity:view");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      const duration = Date.now() - startedAt;
      logOrgApiEvent(
        status === 401 ? "api_unauthorized" : "api_unauthorized",
        route,
        context?.orgId ?? null,
        context?.userId ?? null,
        duration,
        { reason: "Insufficient permissions" }
      );
      return createErrorResponse(
        status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        "You are not allowed to view activity for this org.",
        { status }
      );
    }

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const cursor = url.searchParams.get("cursor") || null;
    const eventFilterParam = url.searchParams.get("eventFilter") as OrgActivityEventFilter | null;
    const timeframeParam = url.searchParams.get("timeframe") as OrgActivityTimeframeFilter | null;

    if (!workspaceId) {
      const duration = Date.now() - startedAt;
      logOrgApiEvent("api_error", route, null, context?.userId ?? null, duration, {
        message: "Missing workspace id",
      });
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing workspace id (workspaceId)."
      );
    }

    // Verify workspaceId matches context
    if (context!.orgId !== workspaceId) {
      const duration = Date.now() - startedAt;
      logOrgApiEvent("api_error", route, workspaceId, context?.userId ?? null, duration, {
        message: "Organization ID mismatch",
      });
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Organization ID mismatch."
      );
    }

    const activity = await getOrgActivityForWorkspace({
      workspaceId,
      limit: 20,
      cursor,
      eventFilter: eventFilterParam ?? "all",
      timeframe: timeframeParam ?? "all",
    });

    const duration = Date.now() - startedAt;
    logOrgApiEvent("api_success", route, workspaceId, context?.userId ?? null, duration);

    return createSuccessResponse({
      items: activity.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      nextCursor: activity.nextCursor,
    });
  } catch (err: any) {
    const duration = Date.now() - startedAt;
    logOrgApiEvent("api_error", route, null, null, duration, {
      message: err?.message ?? "Unknown error",
    });
    console.error("[ORG_ACTIVITY_GET_ERROR]", err);
    return createErrorResponse(
      "INTERNAL_SERVER_ERROR",
      "Failed to load workspace activity."
    );
  }
}

