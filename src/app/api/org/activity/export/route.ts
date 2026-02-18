import { NextRequest, NextResponse } from "next/server";
import {
  prepareOrgActivityExport,
  OrgActivityExportFormat,
} from "@/server/data/orgActivityExport";
import {
  OrgActivityEventFilter,
  OrgActivityTimeframeFilter,
} from "@/server/data/orgActivity";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED", message: "Unauthorized" } }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const url = new URL(req.url);
    const formatParam = url.searchParams.get("format") as OrgActivityExportFormat | null;
    const eventFilterParam = url.searchParams.get("eventFilter") as OrgActivityEventFilter | null;
    const timeframeParam = url.searchParams.get("timeframe") as OrgActivityTimeframeFilter | null;

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
  } catch (err) {
    return handleApiError(err, req);
  }
}
