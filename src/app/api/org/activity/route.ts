import { NextRequest, NextResponse } from "next/server";
import {
  getOrgActivityForWorkspace,
  OrgActivityEventFilter,
  OrgActivityTimeframeFilter,
} from "@/server/data/orgActivity";
import { createSuccessResponse } from "@/server/api/responses";
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
    const cursor = url.searchParams.get("cursor") || null;
    const eventFilterParam = url.searchParams.get("eventFilter") as OrgActivityEventFilter | null;
    const timeframeParam = url.searchParams.get("timeframe") as OrgActivityTimeframeFilter | null;

    const activity = await getOrgActivityForWorkspace({
      workspaceId,
      limit: 20,
      cursor,
      eventFilter: eventFilterParam ?? "all",
      timeframe: timeframeParam ?? "all",
    });

    return createSuccessResponse({
      items: activity.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      nextCursor: activity.nextCursor,
    });
  } catch (err) {
    return handleApiError(err, req);
  }
}
