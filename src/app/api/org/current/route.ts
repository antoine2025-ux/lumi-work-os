import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getCurrentOrg } from "@/lib/org/current-org";

export async function GET(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const org = await getCurrentOrg();

    // Return format expected by useCurrentOrg hook
    return NextResponse.json({
      ok: true,
      data: {
        org: org ? { id: org.id, name: org.id } : null, // Temporary: use id as name
        currentMemberRole: null, // TODO: Implement role checking
      },
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}
