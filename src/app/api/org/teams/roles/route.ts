// src/app/api/org/teams/roles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getRolesForTeam } from "@/lib/org/roleQueries";

export async function POST(req: NextRequest) {
  try {
    const auth = await getUnifiedAuth(req);
    if (!auth.isAuthenticated || !auth.workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({
      userId: auth.user.userId,
      workspaceId: auth.workspaceId,
      scope: "workspace",
      requireRole: ["VIEWER"],
    });
    setWorkspaceContext(auth.workspaceId);

    const { teamContextId } = await req.json().catch(() => ({}));

    if (!teamContextId || typeof teamContextId !== "string") {
      return NextResponse.json(
        { ok: false, error: "teamContextId is required" },
        { status: 400 }
      );
    }

    const workspaceId = auth.workspaceId;
    const roles = await getRolesForTeam(workspaceId, teamContextId);

    const simplified = roles.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary ?? "",
      tags: r.tags ?? [],
    }));

    return NextResponse.json({ ok: true, roles: simplified });
  } catch (error: unknown) {
    return handleApiError(error, req);
  }
}

