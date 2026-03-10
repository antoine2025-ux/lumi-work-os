// src/app/api/org/people/roles/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { handleApiError } from "@/lib/api-errors";
import { getRolesForPerson } from "@/lib/org/roleQueries";
import { GetPersonRolesSchema } from "@/lib/validations/org";

export async function POST(req: NextRequest) {
  try {
    const { user, workspaceId, isAuthenticated } = await getUnifiedAuth(req);
    if (!isAuthenticated || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertAccess({ userId: user.userId, workspaceId, scope: "workspace" });
    setWorkspaceContext(workspaceId);

    const body = GetPersonRolesSchema.parse(await req.json());
    const personContextId = body.personContextId;

    const roles = await getRolesForPerson(workspaceId, personContextId);

    const simplified = roles.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary ?? "",
      tags: r.tags ?? [],
      owner: r.owner ?? null,
    }));

    return NextResponse.json({ ok: true, roles: simplified });
  } catch (error) {
    return handleApiError(error, req);
  }
}
