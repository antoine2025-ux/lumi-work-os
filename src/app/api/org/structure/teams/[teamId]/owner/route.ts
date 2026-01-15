/**
 * PUT /api/org/structure/teams/[teamId]/owner
 * Set team owner.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { optionalString } from "@/server/org/validate";
import { setTeamOwner } from "@/server/org/structure/write";

export async function PUT(request: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[PUT /api/org/structure/teams/[teamId]/owner] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access (verifies workspace membership and role)
    // Only workspace owner/admin can set team owners
    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["OWNER", "ADMIN"] });

    // Step 3: Set workspace context (for backward compatibility, though middleware is disabled)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse request
    const { teamId } = await ctx.params;
    const body = await request.json();
    const ownerPersonId = optionalString(body.ownerPersonId);

    // Step 5: Update team owner (with workspaceId validation)
    const updated = await setTeamOwner({ teamId, ownerPersonId, workspaceId });

    // Step 6: Emit Loopbrain context (persist + trigger indexing non-blocking)
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.team.owner_set",
        entity: { type: "team", id: updated.id },
        payload: { ownerPersonId },
      });
    } catch (contextError: any) {
      console.warn("[PUT /api/org/structure/teams/[teamId]/owner] Failed to emit context object (non-blocking):", contextError?.message);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[PUT /api/org/structure/teams/[teamId]/owner] Context error details:", {
          message: contextError?.message,
          code: contextError?.code,
          stack: contextError?.stack,
        });
      }
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("[PUT /api/org/structure/teams/[teamId]/owner] Error:", error);
    console.error("[PUT /api/org/structure/teams/[teamId]/owner] Error stack:", error?.stack);
    console.error("[PUT /api/org/structure/teams/[teamId]/owner] Error meta:", {
      code: error?.code,
      meta: error?.meta,
      cause: error?.cause,
    });

    // Handle specific error cases with structured responses
    if (error?.message?.includes("Team not found") || error?.message?.includes("does not belong to this workspace")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "The team you're trying to update does not exist or you don't have access to it."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Person not found") || error?.message?.includes("does not belong to this workspace")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "The person you're trying to assign as owner does not exist or doesn't belong to this workspace."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Forbidden") || error?.message?.includes("Unauthorized")) {
      return NextResponse.json(
        { 
          error: error.message || "Forbidden",
          hint: "You don't have permission to update team ownership."
        },
        { status: 403 }
      );
    }

    // Handle assertAccess errors
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json(
        { 
          error: error?.message || "Unauthorized",
          hint: "Please ensure you're logged in and have access to this workspace."
        },
        { status: error.status }
      );
    }

    // Handle Prisma errors
    if (error?.code?.startsWith('P') || error?.message?.includes('prisma') || error?.message?.includes('database')) {
      console.error("[PUT /api/org/structure/teams/[teamId]/owner] Database error:", error.message);
      return NextResponse.json(
        { 
          error: "Database error",
          hint: "An error occurred while updating the team owner. Please try again."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        hint: error?.message || "An unexpected error occurred while updating team owner. Please try again."
      },
      { status: 500 }
    );
  }
}

