/**
 * DELETE /api/org/people/[personId]/responsibility-overrides/[overrideId]
 *
 * Phase K: Remove a person responsibility override
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { removePersonResponsibilityOverride } from "@/lib/org/responsibility/read";

type RouteParams = { params: Promise<{ personId: string; overrideId: string }> };

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { personId: _personId, overrideId } = await params;

    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertAccess({
      userId,
      workspaceId,
      scope: "workspace",
      requireRole: ["ADMIN", "OWNER"],
    });

    setWorkspaceContext(workspaceId);

    await removePersonResponsibilityOverride(workspaceId, overrideId);

    return NextResponse.json({ ok: true, deleted: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Override not found" }, { status: 404 });
    }

    console.error("[DELETE /api/org/people/[personId]/responsibility-overrides/[overrideId]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
