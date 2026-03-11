import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { buildWeeklyDigest } from "@/server/orgDigest";

export async function GET(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["VIEWER"] });
    setWorkspaceContext(workspaceId);

    const digest = await buildWeeklyDigest(workspaceId);
    return NextResponse.json({ ok: true, digest });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
