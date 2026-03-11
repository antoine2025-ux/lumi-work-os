import { NextRequest, NextResponse } from "next/server";
import { buildOrgSummaryPreambleForCurrentWorkspace } from "@/lib/loopbrain/org-prompt-builder";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";

export async function GET(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    setWorkspaceContext(workspaceId);

    const preamble = await buildOrgSummaryPreambleForCurrentWorkspace(
      {
        maxPerType: 10,
      },
      request
    );

    return NextResponse.json({
      ok: true,
      orgPreamble: preamble,
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}

