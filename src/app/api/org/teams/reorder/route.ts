import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { isOrgCenterForceDisabled } from "@/lib/org/feature-flags";
import { recordOrgApiHit } from "@/lib/org/monitoring.server";

export async function POST(req: NextRequest) {
  const routeId = "/api/org/teams/reorder";

  try {
    if (isOrgCenterForceDisabled()) {
      await recordOrgApiHit(routeId, 503, null, null);
      return NextResponse.json(
        { error: "Org Center is temporarily unavailable." },
        { status: 503 }
      );
    }

    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      await recordOrgApiHit(routeId, 401, null, null);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const body = await req.json();
    const updates: { id: string; position: number }[] = body.updates ?? [];

    // Update teams in a transaction
    await Promise.all(
      updates.map((u) =>
        prisma.orgTeam.update({
          where: { id: u.id, workspaceId: auth.workspaceId },
          data: { order: u.position },
        })
      )
    );

    await recordOrgApiHit(routeId, 200, auth.workspaceId, auth.user.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    await recordOrgApiHit(routeId, 500, null, null);
    return handleApiError(error, req);
  }
}

