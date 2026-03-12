import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getCurrentOrg } from "@/lib/org/current-org";
import type { OrgPermissionLevel } from "@/lib/orgPermissions";

export async function GET(request: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(request);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const org = await getCurrentOrg();

    const rawRole = user.roles[0];
    const VALID_ORG_ROLES: OrgPermissionLevel[] = ["OWNER", "ADMIN", "MEMBER"];
    const currentMemberRole: OrgPermissionLevel | null =
      VALID_ORG_ROLES.includes(rawRole as OrgPermissionLevel)
        ? (rawRole as OrgPermissionLevel)
        : null;

    // Return format expected by useCurrentOrg hook
    return NextResponse.json({
      ok: true,
      data: {
        org: org ? { id: org.id, name: org.id } : null, // Temporary: use id as name
        currentMemberRole,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, request);
  }
}
