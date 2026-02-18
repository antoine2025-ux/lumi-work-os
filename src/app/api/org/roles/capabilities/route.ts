import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { ROLE_CAPABILITIES } from "@/lib/org/capabilities";

export async function GET(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    return NextResponse.json({
      roles: ROLE_CAPABILITIES,
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
