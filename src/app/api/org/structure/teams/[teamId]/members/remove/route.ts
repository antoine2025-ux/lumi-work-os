/**
 * POST /api/org/structure/teams/[teamId]/members/remove
 * Remove a member from a team.
 * 
 * Strict auth pattern: getUnifiedAuth → assertAccess → setWorkspaceContext → Prisma
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnifiedAuth } from "@/lib/unified-auth";
import { assertAccess } from "@/lib/auth/assertAccess";
import { setWorkspaceContext } from "@/lib/prisma/scopingMiddleware";
import { requireNonEmptyString } from "@/server/org/validate";
import { emitOrgContextObject } from "@/server/org/loopbrain";
import { removeTeamMember } from "@/server/org/structure/write";

export async function POST(request: NextRequest, ctx: { params: Promise<{ teamId: string }> }) {
  try {
    // Step 1: Get unified auth (includes workspaceId)
    const auth = await getUnifiedAuth(request);
    const userId = auth?.user?.userId;
    const workspaceId = auth?.workspaceId;

    if (!userId || !workspaceId) {
      console.error("[POST /api/org/structure/teams/[teamId]/members/remove] Missing userId or workspaceId", { userId, workspaceId });
      return NextResponse.json(
        { 
          error: "Unauthorized",
          hint: "Authentication failed. Please ensure you are logged in and have workspace access."
        },
        { status: 401 }
      );
    }

    // Step 2: Assert access (verifies workspace membership and role)
    await assertAccess({ userId, workspaceId, scope: "workspace", requireRole: ["MEMBER"] });

    // Step 3: Set workspace context (for backward compatibility, though middleware is disabled)
    setWorkspaceContext(workspaceId);

    // Step 4: Parse request
    const { teamId } = await ctx.params;
    const body = await request.json();
    const personId = requireNonEmptyString(body.personId, "personId");

    // Step 5: Remove team member (with workspaceId validation)
    await removeTeamMember({ teamId, personId, workspaceId });

    // Step 6: Emit Loopbrain context (persist + trigger indexing non-blocking)
    // Wrap in try-catch to handle cases where context_items table doesn't exist yet
    try {
      await emitOrgContextObject({
        workspaceId,
        actorUserId: userId,
        action: "org.team.member_removed",
        entity: { type: "team", id: teamId },
        payload: { personId },
      });
    } catch (contextError: any) {
      // Log but don't fail - context emission is non-blocking
      // Common case: context_items table may not exist yet if migrations haven't run
      console.warn("[POST /api/org/structure/teams/[teamId]/members/remove] Failed to emit context object (non-blocking):", contextError?.message);
      if (process.env.NODE_ENV !== "production") {
        console.warn("[POST /api/org/structure/teams/[teamId]/members/remove] Context error details:", {
          message: contextError?.message,
          code: contextError?.code,
          stack: contextError?.stack,
        });
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("[POST /api/org/structure/teams/[teamId]/members/remove] Error:", error);
    console.error("[POST /api/org/structure/teams/[teamId]/members/remove] Error stack:", error?.stack);
    console.error("[POST /api/org/structure/teams/[teamId]/members/remove] Error meta:", {
      code: error?.code,
      meta: error?.meta,
      cause: error?.cause,
    });

    // Handle specific error cases with structured responses
    if (error?.message?.includes("Team not found") || error?.message?.includes("does not belong to this workspace")) {
      return NextResponse.json(
        { 
          error: error.message,
          hint: "The team you're trying to remove a member from does not exist or you don't have access to it."
        },
        { status: 404 }
      );
    }

    if (error?.message?.includes("Invalid") || error?.message?.includes("required")) {
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
          hint: "You don't have permission to remove team members."
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
      console.error("[POST /api/org/structure/teams/[teamId]/members/remove] Database error:", error.message);
      return NextResponse.json(
        { 
          error: "Database error",
          hint: "An error occurred while removing the team member. Please try again."
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        hint: error?.message || "An unexpected error occurred while removing team member. Please try again."
      },
      { status: 500 }
    );
  }
}

