import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";

export async function POST(req: NextRequest) {
  const routeId = "/api/org/preferences/update";

  try {
    if (isOrgCenterForceDisabled()) {
      await recordOrgApiHit(routeId, 503, null, null);
      return NextResponse.json(
        { error: "Org Center is temporarily unavailable." },
        { status: 503 }
      );
    }

    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      await recordOrgApiHit(routeId, 401, null, null);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const body = await req.json();
    const preferences = body.preferences ?? {};

    await prisma.workspaceMember.updateMany({
      where: { workspaceId, userId: user.userId },
      data: { preferences },
    });

    await recordOrgApiHit(routeId, 200, workspaceId, user.userId);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}
