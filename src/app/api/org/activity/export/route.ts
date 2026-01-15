import { NextRequest, NextResponse } from "next/server";
import {
  prepareOrgActivityExport,
  OrgActivityExportFormat,
} from "@/server/data/orgActivityExport";
import {
  OrgActivityEventFilter,
  OrgActivityTimeframeFilter,
} from "@/server/data/orgActivity";
import { createErrorResponse } from "@/server/api/responses";
import {
  assertOrgCapability,
  getOrgPermissionContext,
  mapPermissionErrorToStatus,
} from "@/lib/org/permissions.server";

export async function GET(req: NextRequest) {
  try {
    const context = await getOrgPermissionContext(req);

    try {
      assertOrgCapability(context, "org:activity:export");
    } catch (permError) {
      const status = mapPermissionErrorToStatus(permError);
      return createErrorResponse(
        status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN",
        "You are not allowed to export activity for this org.",
        { status }
      );
    }

    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspaceId");
    const formatParam = url.searchParams.get("format") as OrgActivityExportFormat | null;
    const eventFilterParam = url.searchParams.get("eventFilter") as OrgActivityEventFilter | null;
    const timeframeParam = url.searchParams.get("timeframe") as OrgActivityTimeframeFilter | null;

    if (!workspaceId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Missing workspace id (workspaceId)."
      );
    }

    // Verify workspaceId matches context
    if (context!.orgId !== workspaceId) {
      return createErrorResponse(
        "VALIDATION_ERROR",
        "Organization ID mismatch."
      );
    }

    const format: OrgActivityExportFormat =
      formatParam === "json" ? "json" : "csv";

    const result = await prepareOrgActivityExport({
      workspaceId,
      format,
      eventFilter: eventFilterParam ?? "all",
      timeframe: timeframeParam ?? "all",
    });

    return new Response(result.body, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      },
    });
  } catch (err: any) {
    console.error("[ORG_ACTIVITY_EXPORT_ERROR]", err);

    const statusCode =
      typeof err?.statusCode === "number" ? err.statusCode : 500;

    if (statusCode === 500) {
      return createErrorResponse(
        "INTERNAL_SERVER_ERROR",
        "Failed to export workspace activity."
      );
    }

    // For non-500 errors, we still use the envelope but respect the status code.
    return NextResponse.json(
      {
        ok: false,
        error: {
          code:
            typeof err?.code === "string" ? err.code : "VALIDATION_ERROR",
          message:
            typeof err?.message === "string"
              ? err.message
              : "Failed to export workspace activity.",
        },
      },
      { status: statusCode }
    );
  }
}

