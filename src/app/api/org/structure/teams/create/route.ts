/**
 * POST /api/org/structure/teams/create
 * Create a new team.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { requireNonEmptyString, optionalString } from "@/server/org/validate";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { createTeam } from "@/server/org/structure/write";
import { logOrgAudit } from "@/lib/audit/org-audit";
import { handleApiError } from "@/lib/api-errors"

export async function POST(request: NextRequest) {
  let userId: string | undefined;
  let workspaceId: string | undefined;
  
  try {
    const auth = await getUnifiedAuth(request);
    userId = auth?.user?.userId;
    workspaceId = auth?.workspaceId;
    if (!userId || !workspaceId) {
      console.error("[POST /api/org/structure/teams/create] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["ADMIN"] });
    await setWorkspaceContext(workspaceId);

    const body = await request.json();
    const name = requireNonEmptyString(body.name, "name");
    const departmentId = optionalString(body.departmentId);

    // Note: Schema requires departmentId, but we allow null in input for flexibility
    // The write service will handle validation
    const team = await createTeam({ name, departmentId, workspaceId });

    // Emit context object (non-blocking - don't fail the request if this errors)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.team.created",
        entity: { type: "team", id: team.id },
        payload: { name, departmentId },
      });
    } catch (contextError: unknown) {
      const err = contextError as { message?: string };
      console.warn("[POST /api/org/structure/teams/create] Failed to emit context object (non-blocking):", err?.message);
    }

    logOrgAudit({
      workspaceId,
      entityType: "TEAM",
      entityId: team.id,
      entityName: team.name,
      action: "CREATED",
      actorId: userId,
    }).catch((e) => console.error("[POST /api/org/structure/teams/create] Audit log error (non-fatal):", e));

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return handleApiError(error, request)
  }
}

