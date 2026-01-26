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

    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });
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
    } catch (contextError: any) {
      // Log but don't fail - context emission is non-blocking
      console.warn("[POST /api/org/structure/teams/create] Failed to emit context object (non-blocking):", contextError?.message);
    }

    return NextResponse.json(team, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/org/structure/teams/create] Error:", error);
    console.error("[POST /api/org/structure/teams/create] Error stack:", error?.stack);

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

    if (error?.message?.includes("Invalid") || error?.message?.includes("Department is required")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "Please check the input fields and try again."
        },
        { status: 400 }
      );
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to create teams in this workspace."
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        error: "Failed to create team",
        hint: error?.message || "An unexpected error occurred. Please try again."
      },
      { status: 500 }
    );
  }
}

